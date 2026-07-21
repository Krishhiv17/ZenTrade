'use client'

import { Suspense, useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (typeof window !== 'undefined' && PH_KEY) {
    posthog.init(PH_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,   // sent manually below for the App Router
        capture_pageleave: true,
        session_recording: {
            // Never record typed values (trade prices, journal notes, passwords)…
            maskAllInputs: true,
            // …and mask displayed money/number figures (they use .tabnums everywhere).
            maskTextSelector: '.tabnums',
        },
    })
}

function PostHogPageview() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const ph = usePostHog()
    useEffect(() => {
        if (!pathname || !ph) return
        let url = window.location.origin + pathname
        const qs = searchParams?.toString()
        if (qs) url += `?${qs}`
        ph.capture('$pageview', { $current_url: url })
    }, [pathname, searchParams, ph])
    return null
}

function PostHogIdentify() {
    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) posthog.identify(data.user.id, { email: data.user.email })
        })
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                posthog.identify(session.user.id, { email: session.user.email })
            } else if (event === 'SIGNED_OUT') {
                posthog.reset()
            }
        })
        return () => sub.subscription.unsubscribe()
    }, [])
    return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    // No key configured → render children untouched (safe no-op).
    if (!PH_KEY) return <>{children}</>
    return (
        <PHProvider client={posthog}>
            <Suspense fallback={null}>
                <PostHogPageview />
            </Suspense>
            <PostHogIdentify />
            {children}
        </PHProvider>
    )
}
