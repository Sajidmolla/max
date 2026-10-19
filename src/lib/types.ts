export type Profile = { id: string; email: string; display_name: string | null; role: 'admin' | 'member'; status: 'active' | 'disabled'; created_at: string; last_seen: string | null }
export type Category = { id: string; name: string; sort_order: number }
export type Video = {
  id: string; title: string; description: string | null; category_id: string | null; thumbnail_url: string | null
  release_year: number | null; duration_minutes: number | null; drive_file_id: string; status: 'draft' | 'published'
  featured: boolean; sort_order: number; created_at: string
}
