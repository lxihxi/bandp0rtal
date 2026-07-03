import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Result {
  id: string
  title: string
  type: 'song' | 'contact' | 'task' | 'event' | 'wiki'
  subtitle?: string
  path: string
}

const TYPE_LABEL: Record<string, string> = { song: 'Song', contact: 'Kontakt', task: 'Aufgabe', event: 'Event', wiki: 'Wiki' }
const TYPE_COLOR: Record<string, string> = { song: 'text-purple-400', contact: 'text-blue-400', task: 'text-yellow-400', event: 'text-red-400', wiki: 'text-green-400' }

async function search(q: string): Promise<Result[]> {
  if (!q.trim()) return []
  const like = `%${q}%`
  const [songs, contacts, tasks, events, wiki] = await Promise.all([
    supabase.from('songs').select('id, title, status').ilike('title', like).limit(5),
    supabase.from('contacts').select('id, name, role').ilike('name', like).limit(5),
    supabase.from('tasks').select('id, title, done').ilike('title', like).limit(5),
    supabase.from('events').select('id, title, date, type').ilike('title', like).limit(5),
    supabase.from('wiki_pages').select('id, title, tags').ilike('title', like).limit(5),
  ])
  return [
    ...(songs.data ?? []).map(s => ({ id: s.id, title: s.title, type: 'song' as const, subtitle: s.status, path: '/songs' })),
    ...(contacts.data ?? []).map(c => ({ id: c.id, title: c.name, type: 'contact' as const, subtitle: c.role, path: '/contacts' })),
    ...(tasks.data ?? []).map(t => ({ id: t.id, title: t.title, type: 'task' as const, subtitle: t.done ? 'Erledigt' : 'Offen', path: '/tasks' })),
    ...(events.data ?? []).map(e => ({ id: e.id, title: e.title, type: 'event' as const, subtitle: new Date(e.date).toLocaleDateString('de-DE'), path: '/calendar' })),
    ...(wiki.data ?? []).map(w => ({ id: w.id, title: w.title, type: 'wiki' as const, subtitle: (w.tags ?? []).join(', '), path: '/wiki' })),
  ]
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setCursor(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await search(query)
      setResults(r)
      setCursor(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) { navigate(results[cursor].path); setOpen(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
            <Search size={16} className="text-gray-500 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Suchen..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600"
            />
            <kbd className="text-[10px] text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          {results.length > 0 && (
            <div className="py-1 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => { navigate(r.path); setOpen(false) }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${i === cursor ? 'bg-white/5' : ''}`}
                >
                  <span className={`text-[10px] font-medium w-12 flex-shrink-0 ${TYPE_COLOR[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                  <span className="text-sm text-gray-200 flex-1 truncate">{r.title}</span>
                  {r.subtitle && <span className="text-xs text-gray-600 flex-shrink-0 truncate max-w-[120px]">{r.subtitle}</span>}
                </button>
              ))}
            </div>
          )}

          {query && !loading && results.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-6">Keine Ergebnisse</p>
          )}

          {!query && (
            <p className="text-xs text-gray-600 text-center py-4">Songs, Kontakte, Aufgaben, Events, Wiki...</p>
          )}
        </div>
      </div>
    </div>
  )
}
