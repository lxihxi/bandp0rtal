import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import type { Task } from '@/types'

const PRIORITY_STYLE: Record<string, string> = {
  hoch: 'text-red-400 bg-red-950',
  mittel: 'text-yellow-400 bg-yellow-950',
  niedrig: 'text-gray-400 bg-gray-800',
}

type Filter = 'alle' | 'offen' | 'ueberfaellig' | 'erledigt'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isOverdue(task: Task) {
  return !task.done && task.due_date && task.due_date < new Date().toISOString().split('T')[0]
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('offen')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
      return data ?? []
    },
  })

  const toggleDone = useMutation({
    mutationFn: async (task: Task) => {
      await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('tasks').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Aufgaben</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neue Aufgabe
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {([['alle', 'Alle'], ['offen', 'Offen'], ['ueberfaellig', 'Überfällig'], ['erledigt', 'Erledigt']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${filter === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-red-700' : 'bg-[#2a2a2a]'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Aufgaben</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 group">
                <button
                  onClick={() => toggleDone.mutate(task)}
                  className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.done ? 'bg-green-700 border-green-700' : 'border-[#3a3a3a] hover:border-red-500'}`}
                >
                  {task.done && <Check size={11} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${task.done ? 'line-through text-gray-600' : isOverdue(task) ? 'text-red-400' : 'text-gray-200'}`}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.priority && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${PRIORITY_STYLE[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={`text-xs ${isOverdue(task) ? 'text-red-400' : 'text-gray-500'}`}>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  <button
                    onClick={() => { setEditing(task); setShowForm(true) }}
                    className="text-gray-600 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTask.mutate(task.id)}
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
        <TaskForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); qc.invalidateQueries({ queryKey: ['overdue-tasks'] }) }}
        />
      )}
    </div>
  )
}

function TaskForm({ initial, onClose, onSaved }: { initial: Task | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [priority, setPriority] = useState<string>(initial?.priority ?? 'mittel')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, due_date: dueDate || null, priority }
    if (initial) {
      await supabase.from('tasks').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('tasks').insert(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel">
          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Aufgabentitel..." autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fälligkeit">
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </FormField>
          <FormField label="Priorität">
            <Select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </Select>
          </FormField>
        </div>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
