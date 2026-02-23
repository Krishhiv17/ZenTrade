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
                /* NO overflowX: hidden here — it creates a stacking context
                   that breaks position:fixed on modals */
            }}>
                {/* Inner wrapper handles overflow without breaking fixed positioning */}
                <div style={{ overflowX: 'auto', minHeight: '100%' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
