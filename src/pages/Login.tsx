import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { session } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session && !recovery) nav('/') }, [session, recovery])

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null)
    if (recovery) {
      const { error } = await supabase.auth.updateUser({ password })
      setMsg(error ? error.message : 'Password updated.'); if (!error) setRecovery(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg('Email or password is incorrect.')
    }
    setBusy(false)
  }
  async function forgot() {
    if (!email) return setMsg('Enter your email first, then choose “Forgot password”.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/login` })
    setMsg(error ? error.message : 'Check your email for a reset link.')
  }
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-[radial-gradient(ellipse_at_top,#3a0508,#07070a_60%)]">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-7xl text-max text-center tracking-wider">MAX</h1>
        <p className="text-center text-zinc-400 text-sm">{recovery ? 'Choose a new password' : 'Sign in to watch with the family'}</p>
        {!recovery && <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
        <input className="input" type="password" required minLength={8} placeholder={recovery ? 'New password (8+ characters)' : 'Password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={recovery ? 'new-password' : 'current-password'} />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : recovery ? 'Save password' : 'Sign in'}</button>
        {!recovery && <button type="button" onClick={forgot} className="block mx-auto text-sm text-zinc-400 hover:text-white">Forgot password</button>}
        {msg && <p role="alert" className="text-sm text-center text-amber-300">{msg}</p>}
      </form>
    </div>
  )
}
