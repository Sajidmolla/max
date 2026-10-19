import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Header, VideoRow, thumbOf } from '../components'
import type { Category, Video } from '../lib/types'

export default function Home() {
  const { session } = useAuth()
  const [videos, setVideos] = useState<Video[]>([]); const [cats, setCats] = useState<Category[]>([])
  const [favIds, setFavIds] = useState<string[]>([]); const [histIds, setHistIds] = useState<string[]>([])
  const [q, setQ] = useState(''); const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const uid = session!.user.id
    Promise.all([
      supabase.from('videos').select('*').eq('status', 'published').order('sort_order').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('user_favorites').select('video_id').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('watch_history').select('video_id').eq('user_id', uid).order('last_watched', { ascending: false }).limit(20),
    ]).then(([v, c, f, h]) => {
      if (v.error || c.error) setErr('Could not load the catalog. Check your connection and refresh.')
      setVideos((v.data as Video[]) || []); setCats((c.data as Category[]) || [])
      setFavIds((f.data || []).map((r: any) => r.video_id)); setHistIds((h.data || []).map((r: any) => r.video_id))
      setLoading(false)
    })
  }, [])

  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos])
  const pick = (ids: string[]) => ids.map((i) => byId.get(i)).filter(Boolean) as Video[]
  const term = q.trim().toLowerCase()
  const results = term ? videos.filter((v) => (v.title + ' ' + (v.description || '')).toLowerCase().includes(term)) : []
  const hero = videos.find((v) => v.featured) || videos[0]
  const recent = [...videos].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 15)

  return (
    <div className="pb-16">
      <Header />
      {loading ? <p className="p-10 text-zinc-500">Loading catalog…</p> : err ? <p className="p-10 text-amber-300">{err}</p> : (
        <>
          <div className="px-4 md:px-10 mb-4"><input className="input md:max-w-sm" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
          {term ? (
            results.length ? <VideoRow title={`Results for “${q}”`} videos={results} /> : <p className="px-10 text-zinc-500">No videos match “{q}”.</p>
          ) : !videos.length ? (
            <p className="px-4 md:px-10 py-20 text-zinc-400">No videos yet. The admin will add some soon.</p>
          ) : (
            <>
              {hero && (
                <Link to={`/watch/${hero.id}`} className="relative block mx-4 md:mx-10 h-64 md:h-[26rem] rounded overflow-hidden group">
                  <img src={thumbOf(hero)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                  <div className="absolute bottom-0 p-5 md:p-10 max-w-2xl">
                    <h1 className="font-display text-5xl md:text-7xl tracking-wide">{hero.title}</h1>
                    <p className="hidden md:block mt-2 text-zinc-300 line-clamp-2">{hero.description}</p>
                    <span className="btn btn-primary mt-4">Play</span>
                  </div>
                </Link>
              )}
              <VideoRow title="Continue Watching" videos={pick(histIds)} />
              <VideoRow title="My List" videos={pick(favIds)} />
              <VideoRow title="Recently Added" videos={recent} />
              {cats.map((c) => <VideoRow key={c.id} title={c.name} videos={videos.filter((v) => v.category_id === c.id)} />)}
              <VideoRow title="More Videos" videos={videos.filter((v) => !v.category_id)} />
            </>
          )}
        </>
      )}
    </div>
  )
}
