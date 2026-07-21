import Link from 'next/link'

export default function AppFooter() {
    return (
        <footer style={{
            marginTop: '2.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px 18px',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
        }}>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
            <span aria-hidden>·</span>
            <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</Link>
            <span aria-hidden>·</span>
            <span>© {new Date().getFullYear()} ZenTrade — not financial advice.</span>
        </footer>
    )
}
