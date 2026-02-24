import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            <Sidebar />
            <main className="app-main">
                {children}
            </main>
        </div>
    )
}
