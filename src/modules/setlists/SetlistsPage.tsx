import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel } from '@/components/ui/DetailPanel'
import type { Setlist, Song, Event } from '@/types'
import { logActivity } from '@/hooks/useLogActivity'

type View = 'list' | 'detail'

export default function SetlistsPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Setlist | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [songSearch, setSongSearch] = useState('')

  const { data: setlists = [] } = useQuery<Setlist[]>({
    queryKey: ['setlists'],
    queryFn: async () => { const { data } = await supabase.from('setlists').select('*').order('name'); return data ?? [] },
  })

  const { data: allSongs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => { const { data } = await supabase.from('songs').select('*').order('title'); return data ?? [] },
  })

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('*').in('type', ['show', 'probe']).order('date', { ascending: false })
      return data ?? []
    },
  })

  const deleteSetlist = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => { await supabase.from('setlists').delete().eq('id', id) },
    onSuccess: (_, { name }) => { qc.invalidateQueries({ queryKey: ['setlists'] }); logActivity('gelöscht', 'setlist', name) },
  })

  const { data: setlistSongs = [] } = useQuery({
    queryKey: ['setlist-songs', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from('setlist_songs')
        .select('id, position, song_id, songs(id, title)')
        .eq('setlist_id', selected!.id)
        .order('position')
      return data ?? []
    },
  })

  const addSong = useMutation({
    mutationFn: async (songId: string) => {
      const maxPos = setlistSongs.length > 0 ? Math.max(...(setlistSongs as { position: number }[]).map(s => s.position)) + 1 : 1
      await supabase.from('setlist_songs').insert({ setlist_id: selected!.id, song_id: songId, position: maxPos })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['setlist-songs', selected?.id] }); setSongSearch('') },
  })

  const removeSong = useMutation({
    mutationFn: async (id: string) => { await supabase.from('setlist_songs').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlist-songs', selected?.id] }),
  })

  const applyToEvent = useMutation({
    mutationFn: async (eventId: string) => {
      await supabase.from('event_songs').delete().eq('event_id', eventId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (setlistSongs as any[]).map((s, i) => ({ event_id: eventId, song_id: s.song_id, position: i + 1 }))
      if (rows.length > 0) await supabase.from('event_songs').insert(rows)
    },
    onSuccess: (_, eventId) => { qc.invalidateQueries({ queryKey: ['setlist', eventId] }); setShowApply(false) },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inSetlist = new Set((setlistSongs as any[]).map(s => s.song_id))
  const addable = allSongs.filter(s => !inSetlist.has(s.id) && (!songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase())))

  if (view === 'detail' && selected) {
    const fresh = setlists.find(s => s.id === selected.id) ?? selected
    return (
      <DetailPanel title={fresh.name} onBack={() => setView('list')}>
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-white">Songs ({setlistSongs.length})</span>
            <button
              onClick={() => setShowApply(true)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Auf Event anwenden →
            </button>
          </CardHeader>
          <CardBody className="space-y-2">
            {setlistSongs.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-3">Noch keine Songs</p>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (setlistSongs as any[]).map((entry, idx) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                  <span className="text-sm text-gray-200 flex-1">
                    {Array.isArray(entry.songs) ? entry.songs[0]?.title : entry.songs?.title}
                  </span>
                  <button onClick={() => removeSong.mutate(entry.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><span className="text-sm font-medium text-white">Song hinzufügen</span></CardHeader>
          <CardBody className="space-y-2">
            <input
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder="Song suchen..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
            />
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {addable.slice(0, 10).map(s => (
                <button key={s.id} onClick={() => addSong.mutate(s.id)} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded transition-colors">
                  {s.title}
                </button>
              ))}
              {addable.length === 0 && <p className="text-xs text-gray-600 px-3 py-2">Alle Songs bereits in dieser Liste</p>}
            </div>
          </CardBody>
        </Card>

        {showApply && (
          <ApplyToEventModal
            events={events}
            onApply={eventId => applyToEvent.mutate(eventId)}
            onClose={() => setShowApply(false)}
          />
        )}
      </DetailPanel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Setlist-Vorlagen</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neue Setlist
        </button>
      </div>

      <Card>
        {setlists.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Setlist-Vorlagen</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {setlists.map(sl => (
              <div
                key={sl.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer"
                onClick={() => { setSelected(sl); setView('detail') }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{sl.name}</div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <RowActions actions={[
                    { label: 'Öffnen', onClick: () => { setSelected(sl); setView('detail') } },
                    { label: 'Löschen', onClick: () => deleteSetlist.mutate({ id: sl.id, name: sl.name }), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <SetlistForm
          onClose={() => setShowForm(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['setlists'] }); setShowForm(false) }}
        />
      )}
    </div>
  )
}

function ApplyToEventModal({ events, onApply, onClose }: { events: Event[]; onApply: (id: string) => void; onClose: () => void }) {
  const [eventId, setEventId] = useState('')
  return (
    <Modal title="Auf Event anwenden" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">Die bestehende Setlist des Events wird überschrieben.</p>
        <FormField label="Event">
          <Select value={eventId} onChange={e => setEventId(e.target.value)}>
            <option value="">— Event wählen —</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>
                {new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – {e.title}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Abbrechen</button>
          <button
            onClick={() => eventId && onApply(eventId)}
            disabled={!eventId}
            className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded disabled:opacity-40 transition-colors"
          >
            Anwenden
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SetlistForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('setlists').insert({ name })
    logActivity('erstellt', 'setlist', name)
    onSaved()
  }
  return (
    <Modal title="Neue Setlist" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Name"><Input value={name} onChange={e => setName(e.target.value)} required placeholder="z.B. Standardset, Kurzes Set..." autoFocus /></FormField>
        <SubmitRow onCancel={onClose} label="Erstellen" />
      </form>
    </Modal>
  )
}
