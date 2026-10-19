import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { extractDriveId } from '../lib/drive'
import { Player } from '../components'
import type { Category, Profile, Video } from '../lib/types'

type Tab = 'overview' | 'videos' | 'categories' | 'members' | 'settings'
const emptyForm = { id: '', title: '', description: '', category_id: '', thumbnail_url: '', release_year: '', duration_minutes: '', url: '', status: 'draft', featured: false, sort_order: '0' }

export default function Admin() {
  const [tab, setTab] = useState<Tab>('overview')
  const [videos, setVideos] = useState<Video[]>([]); const [cats, setCats] = useState<Category[]>([])
  const [members, setMembers] = useState<Profile[]>([]); const [logs, setLogs] = useState<any[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm }); const [preview, setPreview] = useState<string | null>(null)
  const [newCat, setNewCat] = useState(''); const [inviteEmail, setInviteEmail] = useState(''); const [platformName, setPlatformName] = useState('MAX')

  async function load() {
    const [v, c, m, l, s] = await Promise.all([
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('platform_settings').select('value').eq('key', 'platform_name').maybeSingle(),
    ])
    setVideos((v.data as Video[]) || []); setCats((c.data as Category[]) || []); setMembers((m.data as Profile[]) || []); setLogs(l.data || [])
    if (s.data && typeof s.data.value === 'string') setPlatformName(s.data.value)
  }
  useEffect(() => { load() }, [])
  const note = (e: { message: string } | null, ok: string) => setMsg(e ? `Failed: ${e.message}` : ok)
  const f = (k: keyof typeof emptyForm, val: any) => setForm((p) => ({ ...p, [k]: val }))

  async function saveVideo(status?: 'draft' | 'published') {
    const id = extractDriveId(form.url)
    if (!id) return setMsg('That isn’t a Google Drive file link. Use a link like https://drive.google.com/file/d/FILE_ID/view')
    if (!form.title.trim()) return setMsg('Add a title.')
    const row = {
      title: form.title.trim(), description: form.description || null, category_id: form.category_id || null,
      thumbnail_url: form.thumbnail_url || null, release_year: form.release_year ? +form.release_year : null,
      duration_minutes: form.duration_minutes ? +form.duration_minutes : null, drive_file_id: id,
      status: status || form.status, featured: form.featured, sort_order: +form.sort_order || 0,
    }
    const { error } = form.id ? await supabase.from('videos').update(row).eq('id', form.id) : await supabase.from('videos').insert(row)
    note(error, row.status === 'published' ? 'Saved and published.' : 'Saved as draft.')
    if (!error) { setForm({ ...emptyForm }); setPreview(null); load() }
  }
  const edit = (v: Video) => { setForm({ id: v.id, title: v.title, description: v.description || '', category_id: v.category_id || '', thumbnail_url: v.thumbnail_url || '', release_year: v.release_year?.toString() || '', duration_minutes: v.duration_minutes?.toString() || '', url: `https://drive.google.com/file/d/${v.drive_file_id}/view`, status: v.status, featured: v.featured, sort_order: String(v.sort_order) }); setTab('videos'); window.scrollTo(0, 0) }
  async function toggle(v: Video) { const { error } = await supabase.from('videos').update({ status: v.status === 'published' ? 'draft' : 'published' }).eq('id', v.id); note(error, 'Status updated.'); load() }
  async function del(v: Video) { if (!confirm(`Delete “${v.title}”? This cannot be undone.`)) return; const { error } = await supabase.from('videos').delete().eq('id', v.id); note(error, 'Deleted.'); load() }
  async function addCat() { if (!newCat.trim()) return; const { error } = await supabase.from('categories').insert({ name: newCat.trim(), sort_order: cats.length + 1 }); note(error, 'Category added.'); setNewCat(''); load() }
  async function renameCat(c: Category) { const n = prompt('New name', c.name); if (!n) return; const { error } = await supabase.from('categories').update({ name: n }).eq('id', c.id); note(error, 'Renamed.'); load() }
  async function orderCat(c: Category, n: number) { const { error } = await supabase.from('categories').update({ sort_order: n }).eq('id', c.id); note(error, 'Order saved.'); load() }
  async function delCat(c: Category) { if (!confirm(`Delete “${c.name}”? Its videos move to “More Videos”.`)) return; const { error } = await supabase.from('categories').delete().eq('id', c.id); note(error, 'Deleted.'); load() }
  async function setStatus(m: Profile, status: 'active' | 'disabled') { const { error } = await supabase.from('profiles').update({ status }).eq('id', m.id); note(error, status === 'disabled' ? 'Account disabled.' : 'Account reactivated.'); load() }
  async function removeMember(m: Profile) { if (!confirm(`Remove ${m.email}’s profile? Also delete the user in Supabase → Authentication to fully remove the login.`)) return; const { error } = await supabase.from('profiles').delete().eq('id', m.id); note(error, 'Profile removed.'); load() }
  async function invite() {
    const { data } = await supabase.auth.getSession()
    const r = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ email: inviteEmail }) })
    const j = await r.json().catch(() => ({})); setMsg(r.ok ? `Invitation sent to ${inviteEmail}.` : `Failed: ${j.error || r.status}`); if (r.ok) { setInviteEmail(''); load() }
  }
  async function saveName() { const { error } = await supabase.from('platform_settings').upsert({ key: 'platform_name', value: platformName }); note(error, 'Platform name saved.') }

  const published = videos.filter((v) => v.status === 'published').length
  const tabs: Tab[] = ['overview', 'videos', 'categories', 'members', 'settings']
  const Field = ({ label, children }: { label: string; children: any }) => <label className="block text-sm space-y-1"><span className="text-zinc-400">{label}</span>{children}</label>

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
      <div className="flex items-center gap-4"><h1 className="font-display text-4xl text-max">MAX Admin</h1><div className="flex-1" /><Link to="/" className="text-sm text-zinc-400 hover:text-white">Back to watching</Link></div>
      <nav className="flex gap-2 my-4 flex-wrap">{tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`btn capitalize ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>{t}</button>)}</nav>
      {msg && <p role="status" className="mb-4 rounded bg-panel border border-line p-3 text-sm">{msg}</p>}

      {tab === 'overview' && (<div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Members', members.length], ['Videos', videos.length], ['Published', published], ['Drafts', videos.length - published]].map(([k, n]) => <div key={k as string} className="bg-panel border border-line rounded p-4"><p className="text-3xl font-bold">{n}</p><p className="text-sm text-zinc-400">{k}</p></div>)}</div>
        <div><h2 className="font-bold mb-2">Recently added</h2>{videos.slice(0, 5).map((v) => <p key={v.id} className="text-sm text-zinc-300">{v.title} <span className="text-zinc-500">({v.status})</span></p>)}</div>
        <div><h2 className="font-bold mb-2">Recently active members</h2>{[...members].filter((m) => m.last_seen).sort((a, b) => +new Date(b.last_seen!) - +new Date(a.last_seen!)).slice(0, 5).map((m) => <p key={m.id} className="text-sm text-zinc-300">{m.email} <span className="text-zinc-500">{new Date(m.last_seen!).toLocaleString()}</span></p>)}</div>
        <div><h2 className="font-bold mb-2">Audit log</h2><div className="text-xs text-zinc-400 space-y-1">{logs.length ? logs.map((l) => <p key={l.id}>{new Date(l.created_at).toLocaleString()} — {l.action} {l.entity} {l.details?.title || l.details?.name || l.details?.email || ''}</p>) : <p>No admin actions logged yet.</p>}</div></div>
        <p className="text-xs text-zinc-500">Backups: none are configured by this app. See README → Backup and recovery.</p>
      </div>)}

      {tab === 'videos' && (<div className="space-y-8">
        <div className="bg-panel border border-line rounded p-4 space-y-3">
          <h2 className="font-bold">{form.id ? 'Edit video' : 'Add video'}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Title"><input className="input" value={form.title} onChange={(e) => f('title', e.target.value)} /></Field>
            <Field label="Google Drive link"><input className="input" placeholder="https://drive.google.com/file/d/…/view" value={form.url} onChange={(e) => { f('url', e.target.value); setPreview(null) }} /></Field>
            <Field label="Category"><select className="input" value={form.category_id} onChange={(e) => f('category_id', e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Thumbnail URL (optional)"><input className="input" value={form.thumbnail_url} onChange={(e) => f('thumbnail_url', e.target.value)} /></Field>
            <Field label="Release year"><input className="input" type="number" value={form.release_year} onChange={(e) => f('release_year', e.target.value)} /></Field>
            <Field label="Duration (minutes)"><input className="input" type="number" value={form.duration_minutes} onChange={(e) => f('duration_minutes', e.target.value)} /></Field>
            <Field label="Display order"><input className="input" type="number" value={form.sort_order} onChange={(e) => f('sort_order', e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm pt-6"><input type="checkbox" checked={form.featured} onChange={(e) => f('featured', e.target.checked)} /> Featured on the home page</label>
          </div>
          <Field label="Description"><textarea className="input" rows={3} value={form.description} onChange={(e) => f('description', e.target.value)} /></Field>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-ghost" onClick={() => { const id = extractDriveId(form.url); id ? setPreview(id) : setMsg('That isn’t a Google Drive file link.') }}>Preview playback</button>
            <button className="btn btn-ghost" onClick={() => saveVideo('draft')}>Save as draft</button>
            <button className="btn btn-primary" onClick={() => saveVideo('published')}>Publish</button>
            {form.id && <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyForm }); setPreview(null) }}>Cancel edit</button>}
          </div>
          {preview && <Player id={preview} />}
        </div>
        <div className="space-y-2">{videos.length === 0 && <p className="text-zinc-500">No videos yet. Add your first one above.</p>}
          {videos.map((v) => <div key={v.id} className="flex items-center gap-3 bg-panel border border-line rounded p-3">
            <div className="flex-1 min-w-0"><p className="truncate">{v.title}</p><p className="text-xs text-zinc-500">{v.status}{v.featured ? ' · featured' : ''}</p></div>
            <button className="btn btn-ghost" onClick={() => edit(v)}>Edit</button>
            <button className="btn btn-ghost" onClick={() => toggle(v)}>{v.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button className="btn btn-ghost text-red-400" onClick={() => del(v)}>Delete</button></div>)}</div>
      </div>)}

      {tab === 'categories' && (<div className="space-y-3">
        <div className="flex gap-2"><input className="input" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button className="btn btn-primary" onClick={addCat}>Add</button></div>
        {cats.map((c) => <div key={c.id} className="flex items-center gap-3 bg-panel border border-line rounded p-3"><span className="flex-1">{c.name}</span>
          <input type="number" aria-label="Order" className="input !w-20" defaultValue={c.sort_order} onBlur={(e) => +e.target.value !== c.sort_order && orderCat(c, +e.target.value)} />
          <button className="btn btn-ghost" onClick={() => renameCat(c)}>Rename</button><button className="btn btn-ghost text-red-400" onClick={() => delCat(c)}>Delete</button></div>)}
      </div>)}

      {tab === 'members' && (<div className="space-y-4">
        <div className="flex gap-2"><input className="input" type="email" placeholder="Family member’s email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /><button className="btn btn-primary" onClick={invite}>Send invite</button></div>
        {members.map((m) => <div key={m.id} className="flex items-center gap-3 bg-panel border border-line rounded p-3">
          <div className="flex-1 min-w-0"><p className="truncate">{m.display_name || m.email}</p><p className="text-xs text-zinc-500">{m.email} · {m.role} · {m.status}</p></div>
          {m.role !== 'admin' && (<>{m.status === 'active' ? <button className="btn btn-ghost" onClick={() => setStatus(m, 'disabled')}>Disable</button> : <button className="btn btn-ghost" onClick={() => setStatus(m, 'active')}>Reactivate</button>}
            <button className="btn btn-ghost text-red-400" onClick={() => removeMember(m)}>Remove</button></>)}</div>)}
      </div>)}

      {tab === 'settings' && (<div className="space-y-3 max-w-md">
        <Field label="Platform name"><input className="input" value={platformName} onChange={(e) => setPlatformName(e.target.value)} /></Field>
        <button className="btn btn-primary" onClick={saveName}>Save</button>
        <p className="text-xs text-zinc-500">Public sign-up is controlled in Supabase → Authentication → Providers → Email (turn “Allow new users to sign up” off so only invited people can join).</p>
      </div>)}
    </div>
  )
}
