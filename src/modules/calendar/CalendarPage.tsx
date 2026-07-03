import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel, DetailRow } from '@/components/ui/DetailPanel'
import { MonthView } from './MonthView'
import type { Event, Song } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  show: 'bg-red-950 text-red-300',
  probe: 'bg-blue-950 text-blue-300',
  meeting: 'bg-yellow-950 text-yellow-300',
  deadline: 'bg-orange-950 text-orange-300',
  other: 'bg-gray-800 text-gray-400',
}
const TYPE_LABEL: Record<string, string> = { show: 'Show', probe: 'Probe', meeting: 'Meeting', deadline: 'Deadline', other: 'Sonstiges' }

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function toLocal(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function dayLabel(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

type View = 'list' | 'month' | 'detail' | 'edit'

export default function CalendarPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('month')
  const [selected, setSelected] = useState<Event | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [prefillDate, setPrefillDate] = useState('')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [dayPanel, setDayPanel] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowForm(true); setSearchParams({}, { replace: true }) }
  }, [])

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => { const { data } = await supabase.from('events').select('*').order('date'); return data ?? [] },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => { await supabase.from('events').delete().eq('id', id) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['next-events'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const dayEvents = dayPanel ? events.filter(e => e.date.startsWith(dayPanel)) : []

  function openDay(dateStr: string) {
    setDayPanel(dateStr)
  }

  const now = new Date().toISOString()
  const upcoming = events.filter(e => e.date >= now)
  const past = events.filter(e => e.date < now)

  // Event detail
  if (view === 'detail' && selected) {
    const fresh = events.find(e => e.id === selected.id) ?? selected
    return (
      <>
        <DetailPanel title={fresh.title} onBack={() => { setView('month'); setSelected(null) }} onEdit={() => setView('edit')}>
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-xs px-2 py-1 rounded font-medium ${TYPE_STYLE[fresh.type]}`}>{TYPE_LABEL[fresh.type]}</span>
                <span className="text-sm text-gray-300">{fmtDate(fresh.date)}</span>
                <span className="text-sm text-gray-500">{fmtTime(fresh.date)} Uhr</span>
              </div>
              {fresh.venue && <DetailRow label="Venue">{fresh.venue}</DetailRow>}
              {fresh.fee != null && <DetailRow label="Gage">{fresh.fee} €</DetailRow>}
              {fresh.notes && <DetailRow label="Notizen"><span className="whitespace-pre-wrap">{fresh.notes}</span></DetailRow>}
            </CardBody>
          </Card>
          <SetlistSection eventId={fresh.id} />
        </DetailPanel>
        {showForm && (
          <EventForm
            initial={fresh}
            prefillDate=""
            onClose={() => setShowForm(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['events'] }); setShowForm(false) }}
          />
        )}
      </>
    )
  }

  // Event edit (inline)
  if (view === 'edit' && selected) {
    return (
      <EventForm
        initial={selected}
        prefillDate=""
        onClose={() => setView('detail')}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['events'] }); setView('detail') }}
        inline
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kalender</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded overflow-hidden">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'month' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>Monat</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs transition-colors ${view === 'list' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>Liste</button>
          </div>
          <button
            onClick={() => { setPrefillDate(''); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            <Plus size={14} /> Neues Event
          </button>
        </div>
      </div>

      {view === 'month' && (
        <>
          <MonthView
            year={calYear}
            month={calMonth}
            events={events}
            onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
            onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
            onDayClick={openDay}
            onEventClick={e => { setSelected(e); setView('detail') }}
          />

          {/* Day panel - shown below calendar when a day is clicked */}
          {dayPanel && (
            <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                <span className="text-sm font-medium text-white">{dayLabel(dayPanel)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPrefillDate(dayPanel + 'T20:00'); setShowForm(true) }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Plus size={12} /> Event
                  </button>
                  <button onClick={() => setDayPanel(null)} className="text-gray-600 hover:text-gray-300 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              {dayEvents.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-gray-600 text-sm mb-3">Kein Event an diesem Tag</p>
                  <button
                    onClick={() => { setPrefillDate(dayPanel + 'T20:00'); setShowForm(true) }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <Plus size={13} /> Event hinzufügen
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer"
                      onClick={() => { setSelected(event); setView('detail'); setDayPanel(null) }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200">{event.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_STYLE[event.type]}`}>{TYPE_LABEL[event.type]}</span>
                          <span className="text-xs text-gray-600">{fmtTime(event.date)} Uhr</span>
                          {event.venue && <span className="text-xs text-gray-600 truncate">{event.venue}</span>}
                        </div>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <RowActions actions={[
                          { label: 'Details', onClick: () => { setSelected(event); setView('detail'); setDayPanel(null) } },
                          { label: 'Löschen', onClick: () => { deleteEvent.mutate(event.id) }, danger: true },
                        ]} />
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2.5">
                    <button
                      onClick={() => { setPrefillDate(dayPanel + 'T20:00'); setShowForm(true) }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Plus size={11} /> weiteres Event an diesem Tag
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs text-gray-500 uppercase tracking-wider">Kommend</h2>
              <Card>
                <div className="divide-y divide-[#1a1a1a]">
                  {upcoming.map(event => (
                    <div key={event.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer" onClick={() => { setSelected(event); setView('detail') }}>
                      <div className="flex-shrink-0 text-center w-12">
                        <div className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                        <div className="text-sm font-medium text-white">{new Date(event.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200">{event.title}</div>
                        {event.venue && <div className="text-xs text-gray-500 truncate">{event.venue}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_STYLE[event.type]}`}>{TYPE_LABEL[event.type]}</span>
                        <RowActions actions={[
                          { label: 'Details', onClick: () => { setSelected(event); setView('detail') } },
                          { label: 'Löschen', onClick: () => deleteEvent.mutate(event.id), danger: true },
                        ]} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs text-gray-500 uppercase tracking-wider">Vergangen</h2>
              <Card>
                <div className="divide-y divide-[#1a1a1a]">
                  {[...past].reverse().map(event => (
                    <div key={event.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer opacity-60" onClick={() => { setSelected(event); setView('detail') }}>
                      <div className="flex-shrink-0 text-center w-12">
                        <div className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                        <div className="text-sm font-medium text-white">{fmtShort(event.date)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200">{event.title}</div>
                        {event.venue && <div className="text-xs text-gray-500 truncate">{event.venue}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_STYLE[event.type]}`}>{TYPE_LABEL[event.type]}</span>
                        <RowActions actions={[
                          { label: 'Löschen', onClick: () => deleteEvent.mutate(event.id), danger: true },
                        ]} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          {events.length === 0 && <p className="text-gray-600 text-sm text-center py-10">Keine Events</p>}
        </div>
      )}

      {showForm && (
        <EventForm
          initial={null}
          prefillDate={prefillDate}
          onClose={() => { setShowForm(false); setPrefillDate('') }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['events'] })
            qc.invalidateQueries({ queryKey: ['next-events'] })
            qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
            setShowForm(false)
            setPrefillDate('')
          }}
        />
      )}
    </div>
  )
}

function SetlistSection({ eventId }: { eventId: string }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [songSearch, setSongSearch] = useState('')

  const { data: setlist = [] } = useQuery({
    queryKey: ['setlist', eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_songs')
        .select('id, position, song_id, songs(id, title, status)')
        .eq('event_id', eventId)
        .order('position')
      return data ?? []
    },
  })

  const { data: allSongs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => { const { data } = await supabase.from('songs').select('*').order('title'); return data ?? [] },
  })

  const addSong = useMutation({
    mutationFn: async (songId: string) => {
      const maxPos = setlist.length > 0 ? Math.max(...(setlist as { position: number }[]).map(s => s.position)) + 1 : 1
      await supabase.from('event_songs').insert({ event_id: eventId, song_id: songId, position: maxPos })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['setlist', eventId] }); setSongSearch(''); setAdding(false) },
  })

  const removeSong = useMutation({
    mutationFn: async (id: string) => { await supabase.from('event_songs').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setlist', eventId] }),
  })

  const addedIds = new Set((setlist as { song_id: string }[]).map(s => s.song_id))
  const filtered = allSongs.filter(s => !addedIds.has(s.id) && (!songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase())))

  return (
    <Card>
      <CardHeader>
        <span className="text-sm font-medium text-white">Setlist</span>
        <button onClick={() => setAdding(a => !a)} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
          <Plus size={12} /> Song hinzufügen
        </button>
      </CardHeader>
      <CardBody className="space-y-2">
        {adding && (
          <div className="space-y-2 pb-2 border-b border-[#2a2a2a]">
            <input
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder="Song suchen..."
              autoFocus
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filtered.slice(0, 10).map(song => (
                <button key={song.id} onClick={() => addSong.mutate(song.id)} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded transition-colors">
                  {song.title}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs text-gray-600 px-3 py-2">Keine Songs gefunden</p>}
            </div>
          </div>
        )}
        {setlist.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Noch keine Songs</p>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (setlist as any[]).map((entry, idx: number) => (
            <div key={entry.id} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">{idx + 1}.</span>
              <span className="text-sm text-gray-200 flex-1">
                {(Array.isArray(entry.songs) ? entry.songs[0]?.title : entry.songs?.title) ?? '—'}
              </span>
              <button onClick={() => removeSong.mutate(entry.id)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  )
}

function EventForm({ initial, prefillDate, onClose, onSaved, inline }: {
  initial: Event | null; prefillDate: string; onClose: () => void; onSaved: () => void; inline?: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<string>(initial?.type ?? 'show')
  const [date, setDate] = useState(initial?.date ? toLocal(initial.date) : prefillDate)
  const [venue, setVenue] = useState(initial?.venue ?? '')
  const [fee, setFee] = useState(initial?.fee?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, type, date: new Date(date).toISOString(), venue: venue || null, fee: fee ? parseFloat(fee) : null, notes: notes || null }
    if (initial) { await supabase.from('events').update(payload).eq('id', initial.id) }
    else { await supabase.from('events').insert(payload) }
    onSaved()
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Eventname..." autoFocus /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Typ">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="show">Show</option><option value="probe">Probe</option><option value="meeting">Meeting</option><option value="deadline">Deadline</option><option value="other">Sonstiges</option>
          </Select>
        </FormField>
        <FormField label="Datum & Uhrzeit"><Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Venue / Ort"><Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue..." /></FormField>
        <FormField label="Gage (€)"><Input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0" /></FormField>
      </div>
      <FormField label="Notizen"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="..." /></FormField>
      <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
    </form>
  )

  if (inline) {
    return (
      <div className="max-w-lg space-y-4">
        <h2 className="text-lg font-bold text-white">{initial ? 'Event bearbeiten' : 'Neues Event'}</h2>
        {form}
      </div>
    )
  }
  return <Modal title={initial ? 'Event bearbeiten' : 'Neues Event'} onClose={onClose}>{form}</Modal>
}
