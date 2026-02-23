import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                marginLeft: 220,
                flex: 1,
                padding: '2rem',
                maxWidth: '100%',
                overflowX: 'hidden',
            }}>
                {children}
            </main>
        </div>
    )
}
