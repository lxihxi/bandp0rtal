import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import type { Transaction } from '@/types'
import { logActivity } from '@/hooks/useLogActivity'

const EINNAHMEN_CATS = ['Gage', 'Streaming', 'Merch-Verkauf', 'Förderung', 'Sonstiges']
const AUSGABEN_CATS  = ['Equipment', 'Studio', 'Transport', 'Probe-Raum', 'Werbung', 'Sonstiges']

function fmt(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function FinancesPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [year, setYear]     = useState(new Date().getFullYear())
  const [filter, setFilter] = useState<'alle' | 'einnahme' | 'ausgabe'>('alle')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Transaction | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowForm(true); setSearchParams({}, { replace: true }) }
  }, [])

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', year],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date', { ascending: false })
      return data ?? []
    },
  })

  const deleteTx = useMutation({
    mutationFn: async ({ id }: { id: string; label: string }) => { await supabase.from('transactions').delete().eq('id', id) },
    onSuccess: (_, { label }) => { qc.invalidateQueries({ queryKey: ['transactions', year] }); logActivity('gelöscht', 'transaction', label) },
  })

  const einnahmen = transactions.filter(t => t.type === 'einnahme').reduce((s, t) => s + Number(t.amount), 0)
  const ausgaben  = transactions.filter(t => t.type === 'ausgabe').reduce((s, t) => s + Number(t.amount), 0)
  const saldo     = einnahmen - ausgaben

  const filtered = filter === 'alle' ? transactions : transactions.filter(t => t.type === filter)

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Finanzen</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Buchung
        </button>
      </div>

      {/* Year selector */}
      <div className="flex gap-1">
        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${y === year ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xl font-bold text-green-400">{fmt(einnahmen)} €</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Einnahmen</div>
        </Card>
        <Card className="p-4">
          <div className="text-xl font-bold text-red-400">{fmt(ausgaben)} €</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Ausgaben</div>
        </Card>
        <Card className="p-4">
          <div className={`text-xl font-bold ${saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(saldo)} €</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Saldo</div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {([['alle', 'Alle'], ['einnahme', 'Einnahmen'], ['ausgabe', 'Ausgaben']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${filter === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Buchungen</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                <div className="flex-shrink-0 text-xs text-gray-500 w-14">{fmtDate(tx.date)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{tx.description || tx.category}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tx.type === 'einnahme' ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
                      {tx.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm font-medium tabular-nums ${tx.type === 'einnahme' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'einnahme' ? '+' : '-'}{fmt(Number(tx.amount))} €
                  </span>
                  <RowActions actions={[
                    { label: 'Bearbeiten', onClick: () => { setEditing(tx); setShowForm(true) } },
                    { label: 'Löschen', onClick: () => deleteTx.mutate({ id: tx.id, label: tx.category }), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <TransactionForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['transactions', year] }); setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function TransactionForm({ initial, onClose, onSaved }: { initial: Transaction | null; onClose: () => void; onSaved: () => void }) {
  const [type, setType]        = useState<string>(initial?.type ?? 'einnahme')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [amount, setAmount]     = useState(initial?.amount?.toString() ?? '')
  const [date, setDate]         = useState(initial?.date ?? new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState(initial?.description ?? '')

  const cats = type === 'einnahme' ? EINNAHMEN_CATS : AUSGABEN_CATS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { type, category, amount: parseFloat(amount), date, description: description || null }
    if (initial) { await supabase.from('transactions').update(payload).eq('id', initial.id) }
    else { await supabase.from('transactions').insert(payload); logActivity('erstellt', 'transaction', category) }
    onSaved()
  }

  return (
    <Modal title={initial ? 'Buchung bearbeiten' : 'Neue Buchung'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Typ">
            <Select value={type} onChange={e => { setType(e.target.value); setCategory('') }}>
              <option value="einnahme">Einnahme</option>
              <option value="ausgabe">Ausgabe</option>
            </Select>
          </FormField>
          <FormField label="Datum">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kategorie">
            <Select value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">— wählen —</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Betrag (€)">
            <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" autoFocus />
          </FormField>
        </div>
        <FormField label="Beschreibung">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Details..." />
        </FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Buchen'} />
      </form>
    </Modal>
  )
}
