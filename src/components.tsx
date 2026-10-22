import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { driveThumb, FALLBACK_THUMB } from './lib/drive'
import type { Video } from './lib/types'

export function usePlatformName() {
  const [name, setName] = useState('MAX')
  useEffect(() => { supabase.from('platform_settings').select('value').eq('key', 'platform_name').maybeSingle().then(({ data }) => { if (data && typeof data.value === 'string') setName(data.value) }) }, [])
  return name
}

export function Header({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const { profile, signOut } = useAuth()
  const name = usePlatformName()
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 20)
    f(); window.addEventListener('scroll', f)
    return () => window.removeEventListener('scroll', f)
  }, [])
  const initial = (profile?.display_name || profile?.email || '?').charAt(0).toUpperCase()
  return (
    <header className={`sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:gap-5 md:px-10 transition-colors duration-300 ${solid ? 'bg-ink shadow-lg shadow-black/50' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <Link to="/" className="font-display text-3xl leading-none tracking-wider text-max md:text-4xl">{name}</Link>
      <div className="flex-1" />
      {onSearch && <input className="input min-w-0 !w-24 !py-1.5 sm:!w-40 md:!w-60" placeholder="Search titles" value={search ?? ''} onChange={(e) => onSearch(e.target.value)} aria-label="Search" />}
      {profile?.role === 'admin' && <Link to="/admin" className="text-sm text-zinc-300 hover:text-white">Admin</Link>}
      <button onClick={signOut} className="hidden text-sm text-zinc-300 hover:text-white sm:block">Sign out</button>
      <Link to="/account" aria-label="Account" className="grid h-8 w-8 place-items-center rounded bg-max text-sm font-bold">{initial}</Link>
    </header>
  )
}

export const thumbOf = (v: Video) => v.thumbnail_url || driveThumb(v.drive_file_id)
const isNew = (v: Video) => Date.now() - +new Date(v.created_at) < 7 * 864e5

export function Card({ v, direct }: { v: Video; direct?: boolean }) {
  const series = !direct && !!v.series_title
  const title = series ? v.series_title! : v.title
  const to = series ? `/series/${encodeURIComponent(v.series_title!)}` : `/watch/${v.id}`
  const meta = series ? 'Series' : [v.release_year, v.duration_minutes && `${v.duration_minutes} min`].filter(Boolean).join(' · ')
  return (
    <Link to={to} className="group/card relative shrink-0 w-44 md:w-64 transition-transform duration-200 hover:scale-110 hover:z-10 focus-visible:scale-110 focus-visible:z-10">
      <div className="relative aspect-video overflow-hidden rounded bg-panel ring-1 ring-line group-hover/card:ring-zinc-400 group-hover/card:shadow-2xl group-hover/card:shadow-black">
        <img src={thumbOf(v)} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_THUMB }} />
        <div className="absolute left-2 top-2 flex gap-1">
          {series && <span className="rounded bg-black/70 px-2 py-0.5 text-xs">Series</span>}
          {isNew(v) && <span className="rounded bg-max px-2 py-0.5 text-xs font-bold">New</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-visible/card:opacity-100 md:block">
          <p className="truncate text-sm font-bold">{title}</p>
          {meta && <p className="text-xs text-zinc-400">{meta}</p>}
          {v.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{v.description}</p>}
        </div>
      </div>
      <p className="mt-2 truncate text-sm md:group-hover/card:opacity-0">{title}</p>
    </Link>
  )
}

export function VideoRow({ title, videos, direct }: { title: string; videos: Video[]; direct?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!videos.length) return null
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  const arrow = 'absolute top-6 bottom-12 z-20 hidden w-10 items-center justify-center bg-black/60 text-3xl text-white opacity-0 transition hover:bg-black/80 group-hover/row:opacity-100 focus-visible:opacity-100 md:flex'
  return (
    <section className="group/row mt-6">
      <h2 className="mb-1 px-4 text-lg font-bold md:px-10">{title}</h2>
      <div className="relative">
        <button aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} left-0`}>‹</button>
        <div ref={ref} className="row-scroll flex gap-3 overflow-x-auto px-4 py-6 md:px-10">{videos.map((v) => <Card key={v.id} v={v} direct={direct} />)}</div>
        <button aria-label="Scroll right" onClick={() => scroll(1)} className={`${arrow} right-0`}>›</button>
      </div>
    </section>
  )
}

export function Skeleton() {
  return (
    <div className="animate-pulse space-y-8 px-4 md:px-10">
      <div className="h-72 rounded bg-panel md:h-[28rem]" />
      {[0, 1].map((i) => <div key={i} className="flex gap-3">{[0, 1, 2, 3, 4].map((j) => <div key={j} className="aspect-video w-44 shrink-0 rounded bg-panel md:w-64" />)}</div>)}
    </div>
  )
}

export function Player({ id }: { id: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div>
      <div className="relative -mx-4 aspect-video min-h-[15rem] overflow-hidden bg-black ring-1 ring-line md:mx-0 md:min-h-0 md:rounded">
        {!loaded && <div className="absolute inset-0 grid place-items-center text-sm text-zinc-500">Loading player…</div>}
        <iframe title="Video player" src={`https://drive.google.com/file/d/${id}/preview`} allow="autoplay; fullscreen" allowFullScreen
          onLoad={() => setLoaded(true)} className="absolute inset-0 h-full w-full border-0" />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Not playing? The Drive file may not be shared with your Google account, may be over Google’s view quota, or may still be processing.
        Ask the admin to check the file’s sharing settings.
      </p>
      <a href={`https://drive.google.com/file/d/${id}/view`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-zinc-300 underline">Open in Google Drive</a>
    </div>
  )
}
