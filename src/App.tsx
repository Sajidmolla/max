import { Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import Home from './pages/Home'
import Watch from './pages/Watch'
import Admin from './pages/Admin'
import Account from './pages/Account'
import Series from './pages/Series'

const Splash = ({ text }: { text: string }) => <div className="min-h-screen grid place-items-center text-zinc-400">{text}</div>

function Private({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading, blocked, signOut } = useAuth()
  if (loading) return <Splash text="Loading…" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile || blocked) return (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div><p className="mb-4">This account is disabled or has no profile. Ask the family admin for access.</p>
      <button className="btn btn-ghost" onClick={signOut}>Sign out</button></div></div>
  )
  // UI guard only — the database enforces real admin access through RLS.
  if (admin && profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Home /></Private>} />
      <Route path="/watch/:id" element={<Private><Watch /></Private>} />
      <Route path="/series/:name" element={<Private><Series /></Private>} />
      <Route path="/account" element={<Private><Account /></Private>} />
      <Route path="/admin" element={<Private admin><Admin /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
