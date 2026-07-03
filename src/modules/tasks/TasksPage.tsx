import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { logActivity } from '@/hooks/useLogActivity'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel, DetailRow } from '@/components/ui/DetailPanel'
import { useProfiles } from '@/hooks/useProfiles'
import type { Task } from '@/types'

const PRIORITY_STYLE: Record<string, string> = {
  hoch: 'text-red-400 bg-red-950',
  mittel: 'text-yellow-400 bg-yellow-950',
  niedrig: 'text-gray-400 bg-gray-800',
}

type Filter = 'alle' | 'offen' | 'ueberfaellig' | 'erledigt'
type View = 'list' | 'detail'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isOverdue(task: Task) {
  return !task.done && task.due_date != null && task.due_date < new Date().toISOString().split('T')[0]
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('offen')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Task | null>(null)
  const { data: profiles = [] } = useProfiles()

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowForm(true); setSearchParams({}, { replace: true }) }
  }, [])

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
      return data ?? []
    },
  })

  const toggleDone = useMutation({
    mutationFn: async (task: Task) => { await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id) },
    onSuccess: (_, task) => {
      qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); qc.invalidateQueries({ queryKey: ['overdue-tasks'] })
      logActivity(task.done ? 'wieder geöffnet' : 'erledigt', 'task', task.title)
    },
  })

  const deleteTask = useMutation({
    mutationFn: async ({ id }: { id: string; title: string }) => { await supabase.from('tasks').delete().eq('id', id) },
    onSuccess: (_, { title }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      logActivity('gelöscht', 'task', title)
    },
  })

  const filtered = tasks.filter(t => {
    if (filter === 'offen') return !t.done
    if (filter === 'erledigt') return t.done
    if (filter === 'ueberfaellig') return isOverdue(t)
    return true
  })

  const counts = {
    alle: tasks.length,
    offen: tasks.filter(t => !t.done).length,
    ueberfaellig: tasks.filter(t => isOverdue(t)).length,
    erledigt: tasks.filter(t => t.done).length,
  }

  const profileName = (id?: string) => profiles.find(p => p.id === id)?.display_name ?? null

  if (view === 'detail' && selected) {
    const fresh = tasks.find(t => t.id === selected.id) ?? selected
    return (
      <DetailPanel title={fresh.title} onBack={() => setView('list')} onEdit={() => { setEditing(fresh); setShowForm(true) }}>
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleDone.mutate(fresh)}
                className={`w-6 h-6 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${fresh.done ? 'bg-green-700 border-green-700' : 'border-[#3a3a3a] hover:border-red-500'}`}
              >
                {fresh.done && <Check size={13} className="text-white" />}
              </button>
              <span className={`text-sm ${fresh.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                {fresh.done ? 'Erledigt' : 'Offen'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Priorität">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_STYLE[fresh.priority]}`}>
                  {fresh.priority.toUpperCase()}
                </span>
              </DetailRow>
              {fresh.due_date && (
                <DetailRow label="Fälligkeit">
                  <span className={isOverdue(fresh) ? 'text-red-400' : ''}>{formatDate(fresh.due_date)}</span>
                </DetailRow>
              )}
              {fresh.assigned_to && profileName(fresh.assigned_to) && (
                <DetailRow label="Zugewiesen an">{profileName(fresh.assigned_to)}</DetailRow>
              )}
            </div>
            {fresh.description && (
              <DetailRow label="Beschreibung">
                <span className="whitespace-pre-wrap">{fresh.description}</span>
              </DetailRow>
            )}
          </CardBody>
        </Card>
      </DetailPanel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Aufgaben</h1>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
          <Plus size={14} /> Neue Aufgabe
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {([['alle', 'Alle'], ['offen', 'Offen'], ['ueberfaellig', 'Überfällig'], ['erledigt', 'Erledigt']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5 ${filter === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-red-700' : 'bg-[#2a2a2a]'}`}>{counts[key]}</span>
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Aufgaben</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer" onClick={() => { setSelected(task); setView('detail') }}>
                <button onClick={e => { e.stopPropagation(); toggleDone.mutate(task) }} className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.done ? 'bg-green-700 border-green-700' : 'border-[#3a3a3a] hover:border-red-500'}`}>
                  {task.done && <Check size={11} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${task.done ? 'line-through text-gray-600' : isOverdue(task) ? 'text-red-400' : 'text-gray-200'}`}>{task.title}</span>
                  {task.assigned_to && profileName(task.assigned_to) && (
                    <div className="text-xs text-gray-600">{profileName(task.assigned_to)}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {task.priority && <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${PRIORITY_STYLE[task.priority]}`}>{task.priority.toUpperCase()}</span>}
                  {task.due_date && <span className={`text-xs ${isOverdue(task) ? 'text-red-400' : 'text-gray-500'}`}>{formatDate(task.due_date)}</span>}
                  <RowActions actions={[
                    { label: 'Bearbeiten', onClick: () => { setEditing(task); setShowForm(true) } },
                    { label: 'Löschen', onClick: () => deleteTask.mutate({ id: task.id, title: task.title }), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <TaskForm
          initial={editing}
          profiles={profiles}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); qc.invalidateQueries({ queryKey: ['overdue-tasks'] }); setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function TaskForm({ initial, profiles, onClose, onSaved }: { initial: Task | null; profiles: { id: string; display_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [priority, setPriority] = useState<string>(initial?.priority ?? 'mittel')
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, description: description || null, due_date: dueDate || null, priority, assigned_to: assignedTo || null }
    if (initial) { await supabase.from('tasks').update(payload).eq('id', initial.id) }
    else { await supabase.from('tasks').insert(payload); logActivity('erstellt', 'task', title) }
    onSaved()
  }

  return (
    <Modal title={initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Aufgabentitel..." autoFocus /></FormField>
        <FormField label="Beschreibung"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Details, Links, Infos..." /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fälligkeit"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></FormField>
          <FormField label="Priorität">
            <Select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="hoch">Hoch</option><option value="mittel">Mittel</option><option value="niedrig">Niedrig</option>
            </Select>
          </FormField>
        </div>
        {profiles.length > 0 && (
          <FormField label="Zuweisen an">
            <Select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">— Niemand —</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </Select>
          </FormField>
        )}
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
