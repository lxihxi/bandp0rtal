import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Pause, Play, SkipBack, SkipForward, Check, RotateCcw, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Event, Song } from '@/types'

type SongStatus = 'pending' | 'playing' | 'done' | 'repeat' | 'skipped'

interface SongState {
  songId: string
  title: string
  bpm?: number
  key?: string
  notes?: string
  status: SongStatus
  timeSeconds: number
  probeNote: string
}

const STATUS_ICON: Record<SongStatus, string> = {
  pending: '○', playing: '▶', done: '✓', repeat: '↩', skipped: '→',
}
const STATUS_COLOR: Record<SongStatus, string> = {
  pending: 'text-gray-600', playing: 'text-blue-400', done: 'text-green-400', repeat: 'text-yellow-400', skipped: 'text-gray-500',
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

interface ProbeModeProps {
  event: Event
  onClose: () => void
}

export function ProbeMode({ event, onClose }: ProbeModeProps) {
  const [songs, setSongs] = useState<SongState[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<'loading' | 'running' | 'ended'>('loading')
  const [showAdd, setShowAdd] = useState(false)
  const [songSearch, setSongSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentIdxRef = useRef(0)
  currentIdxRef.current = currentIdx

  const { data: setlistData, isLoading } = useQuery({
    queryKey: ['setlist', event.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_songs')
        .select('id, position, song_id, songs(id, title, bpm, key, notes)')
        .eq('event_id', event.id)
        .order('position')
      return data ?? []
    },
  })

  const { data: allSongs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => { const { data } = await supabase.from('songs').select('*').order('title'); return data ?? [] },
  })

  useEffect(() => {
    if (isLoading) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = setlistData ?? []
    const list: SongState[] = entries.map(e => {
      const s = Array.isArray(e.songs) ? e.songs[0] : e.songs
      return { songId: e.song_id, title: s?.title ?? '?', bpm: s?.bpm, key: s?.key, notes: s?.notes, status: 'pending', timeSeconds: 0, probeNote: '' }
    })
    if (list.length > 0) list[0].status = 'playing'
    setSongs(list)
    setPhase('running')
  }, [isLoading, setlistData])

  useEffect(() => {
    if (phase !== 'running' || paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setSessionSeconds(s => s + 1)
      setSongs(prev => prev.map((s, i) => i === currentIdxRef.current && s.status === 'playing' ? { ...s, timeSeconds: s.timeSeconds + 1 } : s))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, paused])

  function goTo(idx: number) {
    setSongs(prev => {
      const next = [...prev]
      if (next[currentIdxRef.current]?.status === 'playing') next[currentIdxRef.current] = { ...next[currentIdxRef.current], status: 'pending' }
      next[idx] = { ...next[idx], status: 'playing' }
      return next
    })
    setCurrentIdx(idx)
  }

  function mark(status: 'done' | 'repeat' | 'skipped') {
    setSongs(prev => {
      const next = prev.map((s, i) => i === currentIdxRef.current ? { ...s, status } : s)
      const nextPending = next.findIndex((s, i) => i > currentIdxRef.current && s.status === 'pending')
      if (nextPending !== -1) {
        next[nextPending] = { ...next[nextPending], status: 'playing' }
        setCurrentIdx(nextPending)
      }
      return next
    })
  }

  function addSong(song: Song) {
    setSongs(prev => [...prev, { songId: song.id, title: song.title, bpm: song.bpm, key: song.key, notes: song.notes, status: 'pending', timeSeconds: 0, probeNote: '' }])
    setSongSearch('')
    setShowAdd(false)
  }

  function updateNote(idx: number, note: string) {
    setSongs(prev => prev.map((s, i) => i === idx ? { ...s, probeNote: note } : s))
  }

  const current = songs[currentIdx]
  const inSession = new Set(songs.map(s => s.songId))
  const addable = allSongs.filter(s => !inSession.has(s.id) && (!songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase())))
  const counts = { done: songs.filter(s => s.status === 'done').length, repeat: songs.filter(s => s.status === 'repeat').length, skipped: songs.filter(s => s.status === 'skipped').length }

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (phase === 'ended') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#080808] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Probe abgeschlossen</div>
            <div className="text-base font-bold text-white">{event.title}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Dauer', value: fmt(sessionSeconds), color: 'text-white' },
              { label: 'Gespielt', value: counts.done, color: 'text-green-400' },
              { label: 'Nochmal', value: counts.repeat, color: 'text-yellow-400' },
              { label: 'Übersprungen', value: counts.skipped, color: 'text-gray-500' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[11px] text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] text-gray-600 uppercase tracking-wider px-1 mb-2">Songs</div>
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl divide-y divide-[#1a1a1a]">
              {songs.map((s, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className={`text-sm mt-0.5 flex-shrink-0 ${STATUS_COLOR[s.status]}`}>{STATUS_ICON[s.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${s.status === 'skipped' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{s.title}</div>
                    {s.bpm && <div className="text-[11px] text-gray-600">{s.bpm} BPM{s.key ? ` · ${s.key}` : ''}</div>}
                    {s.probeNote && <div className="text-xs text-blue-400/70 mt-0.5 italic">"{s.probeNote}"</div>}
                  </div>
                  {s.timeSeconds > 0 && <span className="text-xs font-mono text-gray-600 flex-shrink-0">{fmt(s.timeSeconds)}</span>}
                </div>
              ))}
              {songs.length === 0 && <div className="px-4 py-6 text-center text-xs text-gray-600">Keine Songs gespielt</div>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[#1a1a1a]">
          <button onClick={onClose} className="w-full py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white text-sm font-medium rounded-xl transition-colors">
            Schließen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#080808] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-blue-400 uppercase tracking-wider">Live-Probe</div>
          <div className="text-sm font-semibold text-white truncate">{event.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center min-w-[56px]">
            <div className="text-lg font-mono font-bold text-white tabular-nums">{fmt(sessionSeconds)}</div>
          </div>
          <button
            onClick={() => setPaused(p => !p)}
            title={paused ? 'Fortsetzen' : 'Pause'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${paused ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1f1f1f] hover:bg-[#2a2a2a]'}`}
          >
            {paused ? <Play size={15} className="text-white ml-0.5" /> : <Pause size={15} className="text-gray-300" />}
          </button>
          <button
            onClick={() => setPhase('ended')}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-[#1a1a1a] hover:bg-[#1f1f1f] rounded-lg transition-colors"
          >
            Beenden
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {songs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <p className="text-gray-500 text-sm text-center">Keine Songs in der Setlist - füge Songs hinzu um die Probe zu starten</p>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              <Plus size={14} /> Song hinzufügen
            </button>
            {showAdd && (
              <div className="w-full max-w-sm space-y-2">
                <input value={songSearch} onChange={e => setSongSearch(e.target.value)} placeholder="Song suchen..." autoFocus className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600" />
                <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg divide-y divide-[#1a1a1a] max-h-40 overflow-y-auto">
                  {addable.slice(0, 8).map(s => <button key={s.id} onClick={() => addSong(s)} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">{s.title}</button>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Current song - big area */}
            {current && (
              <div className={`px-4 py-4 border-b border-[#1a1a1a] bg-[#0f0f0f] flex-shrink-0 transition-opacity ${paused ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                      ▶ Aktuell
                      {paused && <span className="text-yellow-500">· PAUSE</span>}
                    </div>
                    <h2 className="text-xl font-bold text-white leading-snug">{current.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      {current.bpm && <span className="text-xs text-gray-500 font-mono">{current.bpm} BPM</span>}
                      {current.key && <span className="text-xs text-gray-500">♪ {current.key}</span>}
                      <span className="text-sm font-mono text-gray-400 tabular-nums">{fmt(current.timeSeconds)}</span>
                    </div>
                  </div>
                </div>

                {current.notes && (
                  <div className="mb-3 px-3 py-2 bg-[#151515] border-l-2 border-[#2a2a2a] rounded-r text-xs text-gray-500 italic">
                    {current.notes}
                  </div>
                )}

                <div className="flex gap-2 mb-3">
                  <button onClick={() => mark('done')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-950/60 hover:bg-green-950 border border-green-900 text-green-300 text-sm rounded-xl transition-colors">
                    <Check size={14} /> Gespielt
                  </button>
                  <button onClick={() => mark('repeat')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-950/40 hover:bg-yellow-950/80 border border-yellow-900/50 text-yellow-300 text-sm rounded-xl transition-colors">
                    <RotateCcw size={13} /> Nochmal
                  </button>
                  <button onClick={() => mark('skipped')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-gray-400 text-sm rounded-xl transition-colors">
                    <ChevronRight size={14} /> Skip
                  </button>
                </div>

                <input
                  value={current.probeNote}
                  onChange={e => updateNote(currentIdx, e.target.value)}
                  placeholder="Notiz zu diesem Song..."
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-[#3a3a3a]"
                />
              </div>
            )}

            {/* Song queue */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 sticky top-0 bg-[#0a0a0a] border-b border-[#111111] z-10">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                  {counts.done + counts.repeat + counts.skipped} / {songs.length} · {counts.done} ok · {counts.repeat} nochmal
                </span>
                <button onClick={() => setShowAdd(a => !a)} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                  <Plus size={11} /> Song
                </button>
              </div>

              {showAdd && (
                <div className="px-4 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a] space-y-2">
                  <input value={songSearch} onChange={e => setSongSearch(e.target.value)} placeholder="Song suchen..." autoFocus className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600" />
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {addable.slice(0, 6).map(s => <button key={s.id} onClick={() => addSong(s)} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded transition-colors">{s.title}</button>)}
                    {addable.length === 0 && <p className="text-xs text-gray-700 px-3 py-2">Keine weiteren Songs</p>}
                  </div>
                </div>
              )}

              <div className="divide-y divide-[#111111]">
                {songs.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === currentIdx ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                  >
                    <span className={`text-xs flex-shrink-0 w-3 ${STATUS_COLOR[s.status]}`}>{STATUS_ICON[s.status]}</span>
                    <span className={`flex-1 text-sm truncate ${i === currentIdx ? 'text-white font-medium' : s.status === 'pending' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {s.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.bpm && <span className="text-[10px] text-gray-700 font-mono">{s.bpm}</span>}
                      {s.probeNote && <span className="text-[10px] text-blue-600">✎</span>}
                      {s.timeSeconds > 0 && <span className="text-[10px] font-mono text-gray-700">{fmt(s.timeSeconds)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom nav */}
            <div className="flex items-center px-4 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d] flex-shrink-0">
              <button
                onClick={() => currentIdx > 0 && goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack size={14} /> Zurück
              </button>
              <span className="flex-1 text-center text-xs text-gray-700">{currentIdx + 1} / {songs.length}</span>
              <button
                onClick={() => currentIdx < songs.length - 1 && goTo(currentIdx + 1)}
                disabled={currentIdx >= songs.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                Weiter <SkipForward size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
