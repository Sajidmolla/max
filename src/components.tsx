import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { driveThumb, FALLBACK_THUMB } from './lib/drive'
import type { Video } from './lib/types'

export function usePlatformName() {
  const [name, setName] = useState('MAX')
  useEffect(() => { supabase.from('platform_settings').select('value').eq('key', 'platform_name').maybeSingle().then(({ data }) => { if (data && typeof data.value === 'string') setName(data.value) }) }, [])
  return name
}

export function Header() {
  const { profile, signOut } = useAuth()
  const name = usePlatformName()
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-4 md:px-10 py-3 bg-gradient-to-b from-black to-ink/80 backdrop-blur">
      <Link to="/" className="font-display text-4xl tracking-wider text-max leading-none">{name}</Link>
      <div className="flex-1" />
      {profile?.role === 'admin' && <Link to="/admin" className="text-sm text-zinc-400 hover:text-white">Admin</Link>}
      <Link to="/account" className="text-sm text-zinc-400 hover:text-white">Account</Link>
      <button onClick={signOut} className="text-sm text-zinc-400 hover:text-white">Sign out</button>
    </header>
  )
}

export const thumbOf = (v: Video) => v.thumbnail_url || driveThumb(v.drive_file_id)

export function Card({ v }: { v: Video }) {
  return (
    <Link to={`/watch/${v.id}`} className="shrink-0 w-44 md:w-64 group">
      <div className="aspect-video rounded overflow-hidden bg-panel ring-1 ring-line group-hover:ring-white transition">
        <img src={thumbOf(v)} alt="" loading="lazy" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_THUMB }} />
      </div>
      <p className="mt-2 text-sm truncate">{v.title}</p>
      {v.release_year && <p className="text-xs text-zinc-500">{v.release_year}</p>}
    </Link>
  )
}

export function VideoRow({ title, videos }: { title: string; videos: Video[] }) {
  if (!videos.length) return null
  return (
    <section className="mt-8">
      <h2 className="px-4 md:px-10 mb-3 text-lg font-bold">{title}</h2>
      <div className="row-scroll flex gap-3 overflow-x-auto px-4 md:px-10 pb-2">{videos.map((v) => <Card key={v.id} v={v} />)}</div>
    </section>
  )
}

export function Player({ id }: { id: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div>
      <div className="relative aspect-video w-full bg-black rounded overflow-hidden ring-1 ring-line">
        {!loaded && <div className="absolute inset-0 grid place-items-center text-zinc-500 text-sm">Loading player…</div>}
        <iframe title="Video player" src={`https://drive.google.com/file/d/${id}/preview`} allow="autoplay; fullscreen" allowFullScreen
          onLoad={() => setLoaded(true)} className="absolute inset-0 w-full h-full border-0" />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Not playing? The Drive file may not be shared with your Google account, may be over Google’s view quota, or may still be processing.
        Ask the admin to check the file’s sharing settings.
      </p>
    </div>
  )
}
