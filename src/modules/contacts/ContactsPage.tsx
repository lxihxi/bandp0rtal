import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import type { Contact } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  label: 'bg-purple-950 text-purple-300',
  booker: 'bg-blue-950 text-blue-300',
  press: 'bg-yellow-950 text-yellow-300',
  producer: 'bg-green-950 text-green-300',
  other: 'bg-gray-800 text-gray-400',
}

const TYPE_LABEL: Record<string, string> = {
  label: 'Label', booker: 'Booker', press: 'Presse', producer: 'Produzent', other: 'Sonstiges',
}

export default function ContactsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [filter, setFilter] = useState('alle')
  const [search, setSearch] = useState('')

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data } = await supabase.from('contacts').select('*').order('name')
      return data ?? []
    },
  })

  const deleteContact = useMutation({
    mutationFn: async (id: string) => { await supabase.from('contacts').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const filtered = contacts
    .filter(c => filter === 'alle' || c.type === filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">CRM & Kontakte</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neuer Kontakt
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {([['alle', 'Alle'], ['label', 'Label'], ['booker', 'Booker'], ['press', 'Presse'], ['producer', 'Produzent'], ['other', 'Sonstige']] as const).map(([key, label]) => (
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
          <p className="text-gray-600 text-sm text-center py-10">Keine Kontakte</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(contact => (
              <div key={contact.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 group">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{contact.name}</div>
                  <div className="flex gap-3 mt-0.5">
                    {contact.email && <span className="text-xs text-gray-500">{contact.email}</span>}
                    {contact.phone && <span className="text-xs text-gray-500">{contact.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_STYLE[contact.type]}`}>
                    {TYPE_LABEL[contact.type]}
                  </span>
                  <button
                    onClick={() => { setEditing(contact); setShowForm(true) }}
                    className="text-gray-600 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteContact.mutate(contact.id)}
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
        <ContactForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => qc.invalidateQueries({ queryKey: ['contacts'] })}
        />
      )}
    </div>
  )
}

function ContactForm({ initial, onClose, onSaved }: { initial: Contact | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<string>(initial?.type ?? 'other')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name, type, email: email || null, phone: phone || null, website: website || null, notes: notes || null }
    if (initial) {
      await supabase.from('contacts').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('contacts').insert(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Modal title={initial ? 'Kontakt bearbeiten' : 'Neuer Kontakt'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name">
            <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Name..." autoFocus />
          </FormField>
          <FormField label="Typ">
            <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="label">Label</option>
              <option value="booker">Booker</option>
              <option value="press">Presse</option>
              <option value="producer">Produzent</option>
              <option value="other">Sonstiges</option>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="E-Mail">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." />
          </FormField>
          <FormField label="Telefon">
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49..." />
          </FormField>
        </div>
        <FormField label="Website">
          <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
        </FormField>
        <FormField label="Notizen">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="..." />
        </FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </Modal>
  )
}
