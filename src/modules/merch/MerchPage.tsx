import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import type { MerchItem } from '@/types'

export default function MerchPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MerchItem | null>(null)

  const { data: items = [] } = useQuery<MerchItem[]>({
    queryKey: ['merch'],
    queryFn: async () => {
      const { data } = await supabase.from('merch_items').select('*').order('name')
      return data ?? []
    },
  })

  const adjustStock = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const item = items.find(i => i.id === id)
      if (!item) return
      await supabase.from('merch_items').update({ stock: Math.max(0, item.stock + delta) }).eq('id', id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['merch'] }); qc.invalidateQueries({ queryKey: ['low-stock-merch'] }) },
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from('merch_items').delete().eq('id', id) },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['merch'] }); qc.invalidateQueries({ queryKey: ['low-stock-merch'] }) },
  })

  const lowStock = items.filter(i => i.stock <= i.reorder_threshold)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Merch & Inventar</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neuer Artikel
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3">
          <p className="text-xs text-red-400 font-medium mb-1">Nachbestellen erforderlich</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs text-red-300">{i.name}{i.variant ? ` (${i.variant})` : ''} - {i.stock} Stk</span>
            ))}
          </div>
        </div>
      )}

      <Card>
        {items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Artikel</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {items.map(item => {
              const isLow = item.stock <= item.reorder_threshold
              return (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200">{item.name}</div>
                    {item.variant && <div className="text-xs text-gray-500">{item.variant}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.price != null && (
                      <span className="text-xs text-gray-500">{item.price}€</span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustStock.mutate({ id: item.id, delta: -1 })}
                        className="w-6 h-6 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded text-sm flex items-center justify-center transition-colors"
                      >-</button>
                      <span className={`text-sm font-medium w-8 text-center ${isLow ? 'text-red-400' : 'text-white'}`}>
                        {item.stock}
                      </span>
                      <button
                        onClick={() => adjustStock.mutate({ id: item.id, delta: 1 })}
                        className="w-6 h-6 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded text-sm flex items-center justify-center transition-colors"
                      >+</button>
                    </div>
                    {isLow && (
                      <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded">{item.stock <= 0 ? 'LEER' : 'NIEDRIG'}</span>
                    )}
                    <button onClick={() => { setEditing(item); setShowForm(true) }} className="text-gray-600 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1">Edit</button>
                    <button onClick={() => deleteItem.mutate(item.id)} className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {showForm && (
        <MerchForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['merch'] }); qc.invalidateQueries({ queryKey: ['low-stock-merch'] }) }}
        />
      )}
    </div>
  )
}

function MerchForm({ initial, onClose, onSaved }: { initial: MerchItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [variant, setVariant] = useState(initial?.variant ?? '')
  const [stock, setStock] = useState(initial?.stock?.toString() ?? '0')
  const [threshold, setThreshold] = useState(initial?.reorder_threshold?.toString() ?? '5')
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name, variant: variant || null, stock: parseInt(stock) || 0, reorder_threshold: parseInt(threshold) || 5, price: price ? parseFloat(price) : null }
    if (initial) {
      await supabase.from('merch_items').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('merch_items').insert(payload)
    }
    onSaved(); onClose()
  }

  return (
    <Modal title={initial ? 'Artikel bearbeiten' : 'Neuer Artikel'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name"><Input value={name} onChange={e => setName(e.target.value)} required placeholder="z.B. Hoodie" autoFocus /></FormField>
          <FormField label="Variante"><Input value={variant} onChange={e => setVariant(e.target.value)} placeholder="z.B. XL, Schwarz" /></FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Bestand"><Input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></FormField>
          <FormField label="Nachbestellgrenze"><Input type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} /></FormField>
          <FormField label="Preis (€)"><Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></FormField>
        </div>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
