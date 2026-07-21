import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl

    // Allow the auth callback to execute unharmed
    if (pathname.startsWith('/auth/callback')) {
        return supabaseResponse
    }

    // ── Pre-launch lock ──
    // While PRELAUNCH is on, hide /login and /signup from the public so no one
    // can sign in or create an account before launch. A ?preview=<PREVIEW_KEY>
    // link (or the cookie it sets) lets us through to test.
    if (process.env.PRELAUNCH === 'true') {
        const previewKey = process.env.PREVIEW_KEY
        const urlKey = request.nextUrl.searchParams.get('preview')
        const cookieKey = request.cookies.get('zt_preview')?.value
        const hasBypass = !!previewKey && (urlKey === previewKey || cookieKey === previewKey)
        const isAuthPage =
            pathname === '/login' || pathname.startsWith('/login/') ||
            pathname === '/signup' || pathname.startsWith('/signup/')

        if (isAuthPage && !hasBypass) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        // Remember a valid preview key so later visits don't need the param.
        if (previewKey && urlKey === previewKey) {
            supabaseResponse.cookies.set('zt_preview', previewKey, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
            })
        }
    }

    // Public routes reachable while logged out (landing, auth, legal, contact).
    const PUBLIC_PREFIXES = ['/login', '/signup', '/contact', '/terms', '/privacy', '/legal']
    const isPublic =
        pathname === '/' ||
        PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))

    // Redirect unauthenticated users to login (except public routes)
    if (!user && !isPublic) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/today'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
