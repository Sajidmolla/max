import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Header, Player } from '../components'
import type { Video } from '../lib/types'

export default function Watch() {
  const { id } = useParams(); const { session } = useAuth()
  const [v, setV] = useState<Video | null>(null); const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [parts, setParts] = useState<Video[]>([]); const [fav, setFav] = useState(false); const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const uid = session!.user.id
    setParts([])
    supabase.from('videos').select('*').eq('id', id!).maybeSingle().then(({ data }) => {
      if (!data) return setState('missing')
      setV(data as Video); setState('ok')
      const st = (data as Video).series_title
      if (st) supabase.from('videos').select('*').eq('series_title', st).order('part_number').order('episode_number').then(({ data: p }) => setParts((p as Video[]) || []))
      // Drive's embed does not expose playback position, so we record "last opened" (powers Continue Watching).
      supabase.from('watch_history').upsert({ user_id: uid, video_id: id!, last_watched: new Date().toISOString() }, { onConflict: 'user_id,video_id' })
    })
    supabase.from('user_favorites').select('video_id').eq('user_id', uid).eq('video_id', id!).maybeSingle().then(({ data }) => setFav(!!data))
  }, [id])

  async function toggleFav() {
    const uid = session!.user.id
    const { error } = fav
      ? await supabase.from('user_favorites').delete().eq('user_id', uid).eq('video_id', id!)
      : await supabase.from('user_favorites').insert({ user_id: uid, video_id: id! })
    if (error) setMsg('Could not update My List. Try again.'); else { setFav(!fav); setMsg(null) }
  }

  return (
    <div className="pb-16"><Header />
      <div className="px-4 md:px-10 max-w-5xl mx-auto">
        <Link to="/" className="text-sm text-zinc-400 hover:text-white">Back to browse</Link>
        {v?.series_title && <Link to={`/series/${encodeURIComponent(v.series_title)}`} className="ml-4 text-sm text-zinc-400 hover:text-white">All episodes</Link>}
        {state === 'loading' && <p className="mt-6 text-zinc-500">Loading…</p>}
        {state === 'missing' && <p className="mt-6 text-zinc-300">This video isn’t available. It may have been unpublished or removed.</p>}
        {state === 'ok' && v && (
          <div className="mt-4 space-y-4">
            <Player id={v.drive_file_id} />
            <div className="flex items-start gap-4">
              <div className="flex-1"><h1 className="font-display text-4xl tracking-wide">{v.title}</h1>
                <p className="text-sm text-zinc-500">{[v.release_year, v.duration_minutes && `${v.duration_minutes} min`].filter(Boolean).join(' · ')}</p></div>
              <button onClick={toggleFav} className="btn btn-ghost">{fav ? 'Remove from My List' : 'Add to My List'}</button>
            </div>
            {msg && <p role="alert" className="text-amber-300 text-sm">{msg}</p>}
            <p className="text-zinc-300 max-w-3xl whitespace-pre-line">{v.description}</p>
            {parts.length > 1 && (() => {
              const partNums = Array.from(new Set(parts.map((p) => p.part_number)))
              const eps = parts.filter((p) => p.part_number === v.part_number)
              const i = parts.findIndex((p) => p.id === v.id); const n = parts[i + 1]
              return (
                <div className="pt-4 space-y-3">
                  <h2 className="font-bold">{v.series_title}</h2>
                  <div className="flex flex-wrap gap-2">{partNums.map((pn) => { const first = parts.find((p) => p.part_number === pn)!; return <Link key={pn} to={`/watch/${first.id}`} className={`btn ${pn === v.part_number ? 'btn-primary' : 'btn-ghost'}`}>Part {pn}</Link> })}</div>
                  {eps.length > 1 && <div className="flex flex-wrap gap-2">{eps.map((p) => <Link key={p.id} to={`/watch/${p.id}`} className={`btn ${p.id === v.id ? 'btn-primary' : 'btn-ghost'}`}>Episode {p.episode_number ?? '–'}</Link>)}</div>}
                  {n && <Link to={`/watch/${n.id}`} className="btn btn-primary">Next: Part {n.part_number}{n.episode_number ? ` Episode ${n.episode_number}` : ''}</Link>}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
