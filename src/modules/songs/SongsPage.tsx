import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import type { Song } from '@/types'

const STATUSES = ['IDEE', 'SCHREIBEN', 'ARRANGEMENT', 'DEMO', 'FERTIG', 'VERÖFFENTLICHT'] as const

const STATUS_STYLE: Record<string, string> = {
  IDEE: 'bg-gray-800 text-gray-400',
  SCHREIBEN: 'bg-blue-950 text-blue-300',
  ARRANGEMENT: 'bg-purple-950 text-purple-300',
  DEMO: 'bg-yellow-950 text-yellow-300',
  FERTIG: 'bg-green-950 text-green-300',
  VERÖFFENTLICHT: 'bg-red-950 text-red-300',
}

export default function SongsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Song | null>(null)
  const [filter, setFilter] = useState<string>('alle')

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => {
      const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const deleteSong = useMutation({
    mutationFn: async (id: string) => { await supabase.from('songs').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['songs'] }),
  })

  const filtered = filter === 'alle' ? songs : songs.filter(s => s.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Songs & Discography</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neuer Song
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilter('alle')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${filter === 'alle' ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
        >
          Alle ({songs.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${filter === s ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
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
              <div key={song.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{song.title}</div>
                  {song.key && <div className="text-xs text-gray-500">{song.key}{song.bpm ? ` · ${song.bpm} BPM` : ''}</div>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_STYLE[song.status]}`}>
                    {song.status}
                  </span>
                  <div className="flex items-center gap-1.5 w-24">
                    <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full">
                      <div className="h-1 bg-red-600 rounded-full" style={{ width: `${song.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-7 text-right">{song.progress}%</span>
                  </div>
                  <RowActions actions={[
                    { label: 'Bearbeiten', onClick: () => { setEditing(song); setShowForm(true) } },
                    { label: 'Löschen', onClick: () => deleteSong.mutate(song.id), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <SongForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['songs'] }); qc.invalidateQueries({ queryKey: ['songs-in-progress'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) }}
        />
      )}
    </div>
  )
}

function SongForm({ initial, onClose, onSaved }: { initial: Song | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [status, setStatus] = useState<string>(initial?.status ?? 'IDEE')
  const [progress, setProgress] = useState(initial?.progress?.toString() ?? '0')
  const [bpm, setBpm] = useState(initial?.bpm?.toString() ?? '')
  const [key, setKey] = useState(initial?.key ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title, status,
      progress: parseInt(progress) || 0,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
      notes: notes || null,
    }
    if (initial) {
      await supabase.from('songs').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('songs').insert(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={initial ? 'Song bearbeiten' : 'Neuer Song'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel">
          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Songtitel..." autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Fortschritt (%)">
            <Input type="number" min="0" max="100" value={progress} onChange={e => setProgress(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tonart">
            <Input value={key} onChange={e => setKey(e.target.value)} placeholder="z.B. Am, C#" />
          </FormField>
          <FormField label="BPM">
            <Input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120" />
          </FormField>
        </div>
        <FormField label="Notizen">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Lyric-Ideen, Struktur..." />
        </FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
