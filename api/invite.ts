// Vercel serverless function. Holds the service-role key server-side only.
// Verifies the caller's JWT and that they are an active admin before inviting anyone.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'Not signed in' })

  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { data: u, error: ue } = await admin.auth.getUser(token)
  if (ue || !u.user) return res.status(401).json({ error: 'Invalid session' })
  const { data: p } = await admin.from('profiles').select('role,status').eq('id', u.user.id).single()
  if (!p || p.role !== 'admin' || p.status !== 'active') return res.status(403).json({ error: 'Admin only' })

  const email = String((req.body || {}).email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' })
  const redirectTo = `${req.headers.origin || ''}/login`
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (error) return res.status(400).json({ error: error.message })
  await admin.from('admin_audit_logs').insert({ admin_id: u.user.id, action: 'INVITE', entity: 'profiles', details: { email } })
  return res.status(200).json({ ok: true })
}
