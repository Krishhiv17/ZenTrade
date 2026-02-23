export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 60% 0%, #1d2a4a 0%, var(--bg-base) 60%)',
            padding: '1rem',
        }}>
            {children}
        </div>
    )
}
