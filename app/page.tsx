import { redirect } from 'next/navigation'

// Root route — always redirect to dashboard.
// Middleware will send unauthenticated users to /login from there.
export default function RootPage() {
  redirect('/dashboard')
}
