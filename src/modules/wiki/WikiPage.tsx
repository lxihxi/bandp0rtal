import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { FormField, Input, Textarea, SubmitRow } from '@/components/ui/FormField'
import type { WikiPage as WikiPageType } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function WikiPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'edit' | 'read'>('list')
  const [selected, setSelected] = useState<WikiPageType | null>(null)

  const { data: pages = [] } = useQuery<WikiPageType[]>({
    queryKey: ['wiki'],
    queryFn: async () => {
      const { data } = await supabase.from('wiki_pages').select('*').order('updated_at', { ascending: false })
      return data ?? []
    },
  })

  const deletePage = useMutation({
    mutationFn: async (id: string) => { await supabase.from('wiki_pages').delete().eq('id', id) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wiki'] }),
  })

  const filtered = pages.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())
  )

  if (view === 'edit') {
    return (
      <WikiEditor
        initial={selected}
        onClose={() => { setView('list'); setSelected(null) }}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['wiki'] }); setView('list'); setSelected(null) }}
      />
    )
  }

  if (view === 'read' && selected) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setSelected(null) }} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white flex-1">{selected.title}</h1>
          <button
            onClick={() => setView('edit')}
            className="text-xs text-gray-500 hover:text-white px-3 py-1.5 bg-[#1a1a1a] rounded transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={() => { deletePage.mutate(selected.id); setView('list'); setSelected(null) }}
            className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 bg-[#1a1a1a] rounded transition-colors"
          >
            Löschen
          </button>
        </div>
        <div className="flex gap-2">
          {selected.tags?.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-[#2a2a2a] text-gray-400 rounded">{tag}</span>
          ))}
        </div>
        <Card className="p-5">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{selected.content}</pre>
        </Card>
        <p className="text-xs text-gray-600">Zuletzt bearbeitet: {formatDate(selected.updated_at)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Notizen / Wiki</h1>
        <button
          onClick={() => { setSelected(null); setView('edit') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neue Seite
        </button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Suchen..."
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
      />

      <Card>
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Notizen</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(page => (
              <button
                key={page.id}
                onClick={() => { setSelected(page); setView('read') }}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{page.title}</p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{page.content.slice(0, 80)}{page.content.length > 80 ? '...' : ''}</p>
                  {page.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {page.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#2a2a2a] text-gray-500 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0 mt-0.5">{formatDate(page.updated_at)}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function WikiEditor({ initial, onClose, onSaved }: { initial: WikiPageType | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [tags, setTags] = useState(initial?.tags?.join(', ') ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title,
      content,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      updated_at: new Date().toISOString(),
    }
    if (initial) {
      await supabase.from('wiki_pages').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('wiki_pages').insert(payload)
    }
    onSaved()
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">{initial ? 'Bearbeiten' : 'Neue Seite'}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Titel">
          <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Seitentitel..." autoFocus />
        </FormField>
        <FormField label="Inhalt">
          <Textarea value={content} onChange={e => setContent(e.target.value)} rows={16} placeholder="Text hier eingeben..." />
        </FormField>
        <FormField label="Tags (kommagetrennt)">
          <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="z.B. Setlist, Live, 2026" />
        </FormField>
        <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
      </form>
    </div>
  )
}
