import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel, DetailRow } from '@/components/ui/DetailPanel'
import { ProbeMode } from '@/modules/calendar/ProbeMode'
import type { Song } from '@/types'
import { logActivity } from '@/hooks/useLogActivity'

const STATUSES = ['IDEE', 'SCHREIBEN', 'RECORDING', 'DEMO', 'FERTIG', 'VERÖFFENTLICHT'] as const

const STATUS_STYLE: Record<string, string> = {
  IDEE: 'bg-gray-800 text-gray-400',
  SCHREIBEN: 'bg-blue-950 text-blue-300',
  RECORDING: 'bg-purple-950 text-purple-300',
  DEMO: 'bg-yellow-950 text-yellow-300',
  FERTIG: 'bg-green-950 text-green-300',
  VERÖFFENTLICHT: 'bg-red-950 text-red-300',
}

type View = 'list' | 'detail' | 'edit'

export default function SongsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Song | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('alle')
  const [probeOpen, setProbeOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const deleteSong = useMutation({
    mutationFn: async ({ id }: { id: string; title: string }) => { await supabase.from('songs').delete().eq('id', id) },
    onSuccess: (_, { title }) => {
      qc.invalidateQueries({ queryKey: ['songs'] }); qc.invalidateQueries({ queryKey: ['songs-in-progress'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      logActivity('gelöscht', 'song', title)
    },
  })

  const filtered = filter === 'alle' ? songs : songs.filter(s => s.status === filter)

  if (view === 'detail' && selected) {
    const fresh = songs.find(s => s.id === selected.id) ?? selected
    return (
      <>
        <DetailPanel
          title={fresh.title}
          onBack={() => setView('list')}
          onEdit={() => setView('edit')}
        >
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_STYLE[fresh.status]}`}>{fresh.status}</span>
                <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full">
                  <div className="h-1.5 bg-red-600 rounded-full" style={{ width: `${fresh.progress}%` }} />
                </div>
                <span className="text-sm text-gray-400">{fresh.progress}%</span>
              </div>
              {(fresh.key || fresh.bpm) && (
                <div className="flex gap-6">
                  {fresh.key && <DetailRow label="Tonart">{fresh.key}</DetailRow>}
                  {fresh.bpm && <DetailRow label="BPM">{fresh.bpm}</DetailRow>}
                </div>
              )}
              {fresh.notes && <DetailRow label="Notizen"><span className="whitespace-pre-wrap">{fresh.notes}</span></DetailRow>}
            </CardBody>
          </Card>
        </DetailPanel>
        {view === 'detail' && showForm && (
          <SongForm
            initial={fresh}
            onClose={() => setShowForm(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['songs'] }); setShowForm(false) }}
          />
        )}
      </>
    )
  }

  if (view === 'edit' && selected) {
    return (
      <SongForm
        initial={selected}
        onClose={() => setView('detail')}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['songs'] }); setView('detail') }}
        inline
      />
    )
  }

  if (probeOpen) return <ProbeMode onClose={() => setProbeOpen(false)} />

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Songs</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setProbeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded transition-colors"
          >
            ▶ <span className="hidden sm:inline">Probe starten</span><span className="sm:hidden">Probe</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Neuer Song</span><span className="sm:hidden">Song</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => setFilter('alle')} className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors flex-shrink-0 ${filter === 'alle' ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
          Alle ({songs.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors flex-shrink-0 ${filter === s ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {s} ({songs.filter(x => x.status === s).length})
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Songs</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(song => (
              <div
                key={song.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer"
                onClick={() => { setSelected(song); setView('detail') }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{song.title}</div>
                  {song.key && <div className="text-xs text-gray-500">{song.key}{song.bpm ? ` · ${song.bpm} BPM` : ''}</div>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_STYLE[song.status]}`}>{song.status}</span>
                  <div className="flex items-center gap-1.5 w-20">
                    <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full">
                      <div className="h-1 bg-red-600 rounded-full" style={{ width: `${song.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-7 text-right">{song.progress}%</span>
                  </div>
                  <RowActions actions={[
                    { label: 'Bearbeiten', onClick: () => { setSelected(song); setView('edit') } },
                    { label: 'Löschen', onClick: () => deleteSong.mutate({ id: song.id, title: song.title }), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <SongForm
          initial={null}
          onClose={() => setShowForm(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['songs'] }); qc.invalidateQueries({ queryKey: ['songs-in-progress'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); setShowForm(false) }}
        />
      )}
    </div>
  )
}

function SongForm({ initial, onClose, onSaved, inline }: { initial: Song | null; onClose: () => void; onSaved: () => void; inline?: boolean }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [status, setStatus] = useState<string>(initial?.status ?? 'IDEE')
  const [progress, setProgress] = useState(initial?.progress?.toString() ?? '0')
  const [bpm, setBpm] = useState(initial?.bpm?.toString() ?? '')
  const [key, setKey] = useState(initial?.key ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, status, progress: parseInt(progress) || 0, bpm: bpm ? parseInt(bpm) : null, key: key || null, notes: notes || null }
    if (initial) { await supabase.from('songs').update(payload).eq('id', initial.id) }
    else { await supabase.from('songs').insert(payload); logActivity('erstellt', 'song', title) }
    onSaved()
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Songtitel..." autoFocus /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Fortschritt (%)"><Input type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tonart"><Input value={key} onChange={e => setKey(e.target.value)} placeholder="z.B. Am, C#" /></FormField>
        <FormField label="BPM"><Input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120" /></FormField>
      </div>
      <FormField label="Notizen"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Lyric-Ideen, Struktur..." /></FormField>
      <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
    </form>
  )

  if (inline) return <div className="max-w-lg space-y-4"><h2 className="text-lg font-bold text-white">{initial ? 'Song bearbeiten' : 'Neuer Song'}</h2>{form}</div>
  return <Modal title={initial ? 'Song bearbeiten' : 'Neuer Song'} onClose={onClose}>{form}</Modal>
}
