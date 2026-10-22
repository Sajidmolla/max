import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Header } from '../components'

export default function Account() {
  const { profile, session, signOut } = useAuth()
  const [name, setName] = useState(profile?.display_name || ''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState<string | null>(null)
  async function saveName() {
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', session!.user.id)
    setMsg(error ? error.message : 'Name saved.')
  }
  async function savePw() {
    const { error } = await supabase.auth.updateUser({ password: pw })
    setMsg(error ? error.message : 'Password changed.'); if (!error) setPw('')
  }
  return (
    <div><Header />
      <div className="max-w-md mx-auto p-6 space-y-6">
        <h1 className="font-display text-4xl">Account</h1>
        <p className="text-zinc-400 text-sm">{profile?.email}</p>
        <div className="space-y-2"><label className="text-sm">Display name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-ghost" onClick={saveName}>Save name</button></div>
        <div className="space-y-2"><label className="text-sm">New password</label><input className="input" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /><button className="btn btn-ghost" disabled={pw.length < 8} onClick={savePw}>Change password</button></div>
        {msg && <p role="status" className="text-sm text-amber-300">{msg}</p>}
        <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}
