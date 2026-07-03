import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RowActions } from '@/components/ui/RowActions'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import type { Project, Goal } from '@/types'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showProjectForm, setShowProjectForm] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowProjectForm(true); setSearchParams({}, { replace: true }) }
  }, [])
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await supabase.from('goals').select('*').eq('year', new Date().getFullYear()).order('created_at')
      return data ?? []
    },
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => { await supabase.from('projects').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => { await supabase.from('goals').delete().eq('id', id) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }) },
  })

  const STATUS_STYLE: Record<string, string> = {
    offen: 'bg-gray-800 text-gray-400',
    aktiv: 'bg-blue-950 text-blue-300',
    abgeschlossen: 'bg-green-950 text-green-300',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Projekte & Ziele</h1>

      {/* Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Projekte</h2>
          <button
            onClick={() => { setEditingProject(null); setShowProjectForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 text-xs rounded transition-colors"
          >
            <Plus size={12} /> Neues Projekt
          </button>
        </div>
        <Card>
          {projects.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Keine Projekte</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200">{p.title}</div>
                    {p.due_date && <div className="text-xs text-gray-500">Fällig: {formatDate(p.due_date)}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_STYLE[p.status]}`}>
                      {p.status.toUpperCase()}
                    </span>
                    <RowActions actions={[
                      { label: 'Bearbeiten', onClick: () => { setEditingProject(p); setShowProjectForm(true) } },
                      { label: 'Löschen', onClick: () => deleteProject.mutate(p.id), danger: true },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Strategische Ziele {new Date().getFullYear()}</h2>
          <button
            onClick={() => { setEditingGoal(null); setShowGoalForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 text-xs rounded transition-colors"
          >
            <Plus size={12} /> Neues Ziel
          </button>
        </div>
        <Card>
          {goals.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Keine Ziele</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {goals.map(g => {
                const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                return (
                  <div key={g.id} className="px-4 py-3 hover:bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-200">{g.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{g.current_value} / {g.target_value}{g.unit ? ` ${g.unit}` : ''}</span>
                        <span className="text-xs text-gray-500">{pct}%</span>
                        <RowActions actions={[
                          { label: 'Bearbeiten', onClick: () => { setEditingGoal(g); setShowGoalForm(true) } },
                          { label: 'Löschen', onClick: () => deleteGoal.mutate(g.id), danger: true },
                        ]} />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full">
                      <div className="h-1.5 bg-red-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {showProjectForm && (
        <ProjectForm
          initial={editingProject}
          onClose={() => { setShowProjectForm(false); setEditingProject(null) }}
          onSaved={() => qc.invalidateQueries({ queryKey: ['projects'] })}
        />
      )}
      {showGoalForm && (
        <GoalForm
          initial={editingGoal}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['goals'] }) }}
        />
      )}
    </div>
  )
}

function ProjectForm({ initial, onClose, onSaved }: { initial: Project | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [status, setStatus] = useState<string>(initial?.status ?? 'offen')
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, status, due_date: dueDate || null, notes: notes || null }
    if (initial) {
      await supabase.from('projects').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('projects').insert(payload)
    }
    onSaved(); onClose()
  }

  return (
    <Modal title={initial ? 'Projekt bearbeiten' : 'Neues Projekt'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Projektname..." autoFocus /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="offen">Offen</option>
              <option value="aktiv">Aktiv</option>
              <option value="abgeschlossen">Abgeschlossen</option>
            </Select>
          </FormField>
          <FormField label="Fälligkeit"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></FormField>
        </div>
        <FormField label="Notizen"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="..." /></FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}

function GoalForm({ initial, onClose, onSaved }: { initial: Goal | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [targetValue, setTargetValue] = useState(initial?.target_value?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(initial?.current_value?.toString() ?? '0')
  const [unit, setUnit] = useState(initial?.unit ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, target_value: parseFloat(targetValue), current_value: parseFloat(currentValue) || 0, unit: unit || null, year: new Date().getFullYear() }
    if (initial) {
      await supabase.from('goals').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('goals').insert(payload)
    }
    onSaved(); onClose()
  }

  return (
    <Modal title={initial ? 'Ziel bearbeiten' : 'Neues Ziel'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="z.B. Monatliche Streams" autoFocus /></FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Zielwert"><Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} required placeholder="10000" /></FormField>
          <FormField label="Aktuell"><Input type="number" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0" /></FormField>
          <FormField label="Einheit"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="€, Streams..." /></FormField>
        </div>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
