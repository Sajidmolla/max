import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header, thumbOf } from '../components'
import { FALLBACK_THUMB } from '../lib/drive'
import type { Video } from '../lib/types'

export default function Series() {
  const { name } = useParams()
  const [vids, setVids] = useState<Video[]>([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase.from('videos').select('*').eq('series_title', name!).eq('status', 'published')
      .order('part_number').order('episode_number').then(({ data, error }) => {
        if (error) setErr(true); setVids((data as Video[]) || []); setLoading(false)
      })
  }, [name])

  const parts = Array.from(new Set(vids.map((v) => v.part_number ?? 0)))
  return (
    <div className="pb-16"><Header />
      <div className="px-4 md:px-10 max-w-6xl mx-auto">
        <Link to="/" className="text-sm text-zinc-400 hover:text-white">Back to browse</Link>
        <h1 className="font-display text-5xl tracking-wide mt-3">{name}</h1>
        {loading && <p className="mt-6 text-zinc-500">Loading…</p>}
        {err && <p className="mt-6 text-amber-300">Could not load. Refresh and try again.</p>}
        {!loading && !err && vids.length === 0 && <p className="mt-6 text-zinc-400">No published videos in this series.</p>}
        {parts.map((pn) => (
          <section key={pn} className="mt-8">
            <h2 className="text-xl font-bold mb-3">{pn ? `Part ${pn}` : 'Videos'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vids.filter((v) => (v.part_number ?? 0) === pn).map((v) => (
                <Link key={v.id} to={`/watch/${v.id}`} className="group">
                  <div className="aspect-video rounded overflow-hidden bg-panel ring-1 ring-line group-hover:ring-white transition">
                    <img src={thumbOf(v)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_THUMB }} />
                  </div>
                  <p className="mt-2 text-sm">{v.episode_number ? `Episode ${v.episode_number}` : v.title}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
