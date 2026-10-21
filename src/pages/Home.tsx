import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Header, Skeleton, VideoRow, thumbOf } from '../components'
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

  // Series: ekta card e shudhu Part 1 Episode 1 (shobcheye choto) dekhay; baki part gulo Watch page e thake.
  const collapse = (list: Video[]) => {
    const first = new Map<string, Video>()
    list.forEach((v) => { if (v.series_title) { const c = first.get(v.series_title); if (!c || (v.part_number || 0) * 10000 + (v.episode_number || 0) < (c.part_number || 0) * 10000 + (c.episode_number || 0)) first.set(v.series_title, v) } })
    return list.filter((v) => !v.series_title || first.get(v.series_title) === v)
  }
  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos])
  const pick = (ids: string[]) => ids.map((i) => byId.get(i)).filter(Boolean) as Video[]
  const term = q.trim().toLowerCase()
  const results = term ? collapse(videos.filter((v) => (v.title + ' ' + (v.description || '')).toLowerCase().includes(term))) : []
  const hero = videos.find((v) => v.featured) || videos[0]
  const recent = collapse([...videos]).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 15)

  return (
    <div className="pb-16">
      <Header />
      {loading ? <Skeleton /> : err ? <p className="p-10 text-amber-300">{err}</p> : (
        <>
          <div className="px-4 md:px-10 mb-4"><input className="input md:max-w-sm" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
          {term ? (
            results.length ? <VideoRow title={`Results for “${q}”`} videos={results} /> : <p className="px-10 text-zinc-500">No videos match “{q}”.</p>
          ) : !videos.length ? (
            <p className="px-4 md:px-10 py-20 text-zinc-400">No videos yet. The admin will add some soon.</p>
          ) : (
            <>
              {hero && (
                <div className="relative mx-4 h-72 overflow-hidden rounded md:mx-10 md:h-[28rem]">
                  <img src={thumbOf(hero)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/50 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
                  <div className="absolute bottom-0 max-w-2xl p-5 md:p-12">
                    {hero.series_title && <p className="mb-1 text-xs tracking-widest text-zinc-300">SERIES</p>}
                    <h1 className="font-display text-5xl leading-none tracking-wide md:text-7xl">{hero.series_title || hero.title}</h1>
                    {hero.release_year && <p className="mt-2 text-sm text-zinc-300">{hero.release_year}</p>}
                    <p className="mt-3 hidden line-clamp-3 text-zinc-200 md:block">{hero.description}</p>
                    <div className="mt-5 flex gap-3">
                      <Link to={`/watch/${hero.id}`} className="btn bg-white px-7 text-black hover:bg-zinc-300">Play</Link>
                      {hero.series_title && <Link to={`/series/${encodeURIComponent(hero.series_title)}`} className="btn btn-ghost px-6">All episodes</Link>}
                    </div>
                  </div>
                </div>
              )}
              <VideoRow title="Continue Watching" videos={pick(histIds)} direct />
              <VideoRow title="My List" videos={pick(favIds)} direct />
              <VideoRow title="Recently Added" videos={recent} />
              {cats.map((c) => <VideoRow key={c.id} title={c.name} videos={collapse(videos.filter((v) => v.category_id === c.id))} />)}
              <VideoRow title="More Videos" videos={collapse(videos.filter((v) => !v.category_id))} />
            </>
          )}
        </>
      )}
    </div>
  )
}
