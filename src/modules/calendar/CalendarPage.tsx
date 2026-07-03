import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import type { Event } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  show: 'bg-red-950 text-red-300',
  probe: 'bg-blue-950 text-blue-300',
  meeting: 'bg-yellow-950 text-yellow-300',
  deadline: 'bg-orange-950 text-orange-300',
  other: 'bg-gray-800 text-gray-400',
}

const TYPE_LABEL: Record<string, string> = {
  show: 'Show', probe: 'Probe', meeting: 'Meeting', deadline: 'Deadline', other: 'Sonstiges',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTime(d: string) {
  const t = new Date(d)
  return t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function toLocalDatetimeValue(isoStr: string) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function CalendarPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'alle'>('upcoming')

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('*').order('date', { ascending: true })
      return data ?? []
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => { await supabase.from('events').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })

  const now = new Date().toISOString()
  const filtered = events.filter(e => {
    if (filter === 'upcoming') return e.date >= now
    if (filter === 'past') return e.date < now
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Kalender & Events</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neues Event
        </button>
      </div>

      <div className="flex gap-1">
        {([['upcoming', 'Kommend'], ['past', 'Vergangen'], ['alle', 'Alle']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${filter === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Events</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(event => (
              <div key={event.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 group">
                <div className="flex-shrink-0 text-center w-14">
                  <div className="text-xs text-gray-500">{formatDate(event.date).split(', ')[0]}</div>
                  <div className="text-sm font-medium text-white">{formatDate(event.date).split(', ')[1]?.split('.').slice(0,2).join('.')}</div>
                  <div className="text-xs text-gray-500">{formatTime(event.date)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{event.title}</div>
                  {event.venue && <div className="text-xs text-gray-500 truncate">{event.venue}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_STYLE[event.type]}`}>
                    {TYPE_LABEL[event.type]}
                  </span>
                  {event.fee != null && (
                    <span className="text-xs text-gray-500">{event.fee}€</span>
                  )}
                  <button
                    onClick={() => { setEditing(event); setShowForm(true) }}
                    className="text-gray-600 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEvent.mutate(event.id)}
                    className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <EventForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['events'] }); qc.invalidateQueries({ queryKey: ['next-events'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) }}
        />
      )}
    </div>
  )
}

function EventForm({ initial, onClose, onSaved }: { initial: Event | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<string>(initial?.type ?? 'show')
  const [date, setDate] = useState(initial?.date ? toLocalDatetimeValue(initial.date) : '')
  const [venue, setVenue] = useState(initial?.venue ?? '')
  const [fee, setFee] = useState(initial?.fee?.toString() ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title, type,
      date: new Date(date).toISOString(),
      venue: venue || null,
      fee: fee ? parseFloat(fee) : null,
      notes: notes || null,
    }
    if (initial) {
      await supabase.from('events').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('events').insert(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={initial ? 'Event bearbeiten' : 'Neues Event'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel">
          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Eventname..." autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Typ">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="show">Show</option>
              <option value="probe">Probe</option>
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
              <option value="other">Sonstiges</option>
            </Select>
          </FormField>
          <FormField label="Datum & Uhrzeit">
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Venue / Ort">
            <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue..." />
          </FormField>
          <FormField label="Gage (€)">
            <Input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0" />
          </FormField>
        </div>
        <FormField label="Notizen">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="..." />
        </FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
