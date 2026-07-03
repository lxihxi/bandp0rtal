import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus, Mail, Phone, Globe } from 'lucide-react'
import { logActivity } from '@/hooks/useLogActivity'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel, DetailRow } from '@/components/ui/DetailPanel'
import type { Contact } from '@/types'

const TYPE_STYLE: Record<string, string> = {
  label: 'bg-purple-950 text-purple-300',
  booker: 'bg-blue-950 text-blue-300',
  press: 'bg-yellow-950 text-yellow-300',
  producer: 'bg-green-950 text-green-300',
  other: 'bg-gray-800 text-gray-400',
}
const TYPE_LABEL: Record<string, string> = { label: 'Label', booker: 'Booker', press: 'Presse', producer: 'Produzent', other: 'Sonstiges' }

type View = 'list' | 'detail' | 'edit'

export default function ContactsPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('alle')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowForm(true); setSearchParams({}, { replace: true }) }
  }, [])

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => { const { data } = await supabase.from('contacts').select('*').order('name'); return data ?? [] },
  })

  const deleteContact = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => { await supabase.from('contacts').delete().eq('id', id) },
    onSuccess: (_, { name }) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      logActivity('gelöscht', 'contact', name)
    },
  })

  const filtered = contacts.filter(c => filter === 'alle' || c.type === filter).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  if (view === 'detail' && selected) {
    const fresh = contacts.find(c => c.id === selected.id) ?? selected
    return (
      <DetailPanel title={fresh.name} onBack={() => setView('list')} onEdit={() => setView('edit')}>
        <Card>
          <CardBody className="space-y-4">
            <span className={`inline-block text-xs px-2 py-1 rounded font-medium ${TYPE_STYLE[fresh.type]}`}>{TYPE_LABEL[fresh.type]}</span>
            {fresh.email && (
              <DetailRow label="E-Mail">
                <a href={`mailto:${fresh.email}`} className="text-red-400 hover:text-red-300 flex items-center gap-1.5">
                  <Mail size={13} />{fresh.email}
                </a>
              </DetailRow>
            )}
            {fresh.phone && (
              <DetailRow label="Telefon">
                <a href={`tel:${fresh.phone}`} className="text-red-400 hover:text-red-300 flex items-center gap-1.5">
                  <Phone size={13} />{fresh.phone}
                </a>
              </DetailRow>
            )}
            {fresh.website && (
              <DetailRow label="Website">
                <a href={fresh.website} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 flex items-center gap-1.5">
                  <Globe size={13} />{fresh.website}
                </a>
              </DetailRow>
            )}
            {fresh.notes && <DetailRow label="Notizen"><span className="whitespace-pre-wrap">{fresh.notes}</span></DetailRow>}
          </CardBody>
        </Card>
      </DetailPanel>
    )
  }

  if (view === 'edit' && selected) {
    return (
      <ContactForm
        initial={selected}
        onClose={() => setView('detail')}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['contacts'] }); setView('detail') }}
        inline
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">CRM & Kontakte</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
          <Plus size={14} /> Neuer Kontakt
        </button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600" />
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {([['alle', 'Alle'], ['label', 'Label'], ['booker', 'Booker'], ['press', 'Presse'], ['producer', 'Produzent'], ['other', 'Sonstige']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors flex-shrink-0 ${filter === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}>{label}</button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Kontakte</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(contact => (
              <div key={contact.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer" onClick={() => { setSelected(contact); setView('detail') }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{contact.name}</div>
                  <div className="flex gap-3 mt-0.5">
                    {contact.email && <span className="text-xs text-gray-500 truncate">{contact.email}</span>}
                    {contact.phone && <span className="text-xs text-gray-500">{contact.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TYPE_STYLE[contact.type]}`}>{TYPE_LABEL[contact.type]}</span>
                  <RowActions actions={[
                    { label: 'Bearbeiten', onClick: () => { setSelected(contact); setView('edit') } },
                    { label: 'Löschen', onClick: () => deleteContact.mutate({ id: contact.id, name: contact.name }), danger: true },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {showForm && (
        <ContactForm initial={null} onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['contacts'] }); setShowForm(false) }} />
      )}
    </div>
  )
}

function ContactForm({ initial, onClose, onSaved, inline }: { initial: Contact | null; onClose: () => void; onSaved: () => void; inline?: boolean }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<string>(initial?.type ?? 'other')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name, type, email: email || null, phone: phone || null, website: website || null, notes: notes || null }
    if (initial) { await supabase.from('contacts').update(payload).eq('id', initial.id) }
    else { await supabase.from('contacts').insert(payload); logActivity('erstellt', 'contact', name) }
    onSaved()
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Name"><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Name..." autoFocus /></FormField>
        <FormField label="Typ">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="label">Label</option><option value="booker">Booker</option><option value="press">Presse</option><option value="producer">Produzent</option><option value="other">Sonstiges</option>
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="E-Mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." /></FormField>
        <FormField label="Telefon"><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49..." /></FormField>
      </div>
      <FormField label="Website"><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></FormField>
      <FormField label="Notizen"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="..." /></FormField>
      <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
    </form>
  )

  if (inline) return <div className="max-w-lg space-y-4"><h2 className="text-lg font-bold text-white">{initial ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h2>{form}</div>
  return <Modal title={initial ? 'Kontakt bearbeiten' : 'Neuer Kontakt'} onClose={onClose}>{form}</Modal>
}
