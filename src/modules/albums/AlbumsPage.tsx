import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '@/components/ui/FormField'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { RowActions } from '@/components/ui/RowActions'
import { DetailPanel, DetailRow } from '@/components/ui/DetailPanel'
import type { Album, Song } from '@/types'
import { logActivity } from '@/hooks/useLogActivity'

const TYPE_STYLE: Record<string, string> = {
  album: 'bg-purple-950 text-purple-300',
  ep: 'bg-blue-950 text-blue-300',
  single: 'bg-yellow-950 text-yellow-300',
}
const TYPE_LABEL: Record<string, string> = { album: 'Album', ep: 'EP', single: 'Single' }

const STATUS_STYLE: Record<string, string> = {
  IDEE: 'bg-gray-800 text-gray-400', SCHREIBEN: 'bg-blue-950 text-blue-300',
  RECORDING: 'bg-purple-950 text-purple-300', DEMO: 'bg-yellow-950 text-yellow-300',
  FERTIG: 'bg-green-950 text-green-300', VERÖFFENTLICHT: 'bg-red-950 text-red-300',
}

type View = 'list' | 'detail' | 'edit'

export default function AlbumsPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Album | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [songSearch, setSongSearch] = useState('')

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ['albums'],
    queryFn: async () => { const { data } = await supabase.from('albums').select('*').order('release_date', { ascending: false, nullsFirst: true }); return data ?? [] },
  })

  const { data: allSongs = [] } = useQuery<Song[]>({
    queryKey: ['songs'],
    queryFn: async () => { const { data } = await supabase.from('songs').select('*').order('title'); return data ?? [] },
  })

  const deleteAlbum = useMutation({
    mutationFn: async ({ id }: { id: string; title: string }) => { await supabase.from('albums').delete().eq('id', id) },
    onSuccess: (_, { title }) => { qc.invalidateQueries({ queryKey: ['albums'] }); logActivity('gelöscht', 'album', title) },
  })

  const assignSong = useMutation({
    mutationFn: async ({ songId, albumId }: { songId: string; albumId: string | null }) => {
      await supabase.from('songs').update({ album_id: albumId }).eq('id', songId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['songs'] }),
  })

  const albumSongs = (albumId: string) => allSongs.filter(s => s.album_id === albumId)
  const unassigned = allSongs.filter(s => !s.album_id)
  const filteredUnassigned = unassigned.filter(s => !songSearch || s.title.toLowerCase().includes(songSearch.toLowerCase()))

  if (view === 'detail' && selected) {
    const fresh = albums.find(a => a.id === selected.id) ?? selected
    const songs = albumSongs(fresh.id)
    return (
      <DetailPanel title={fresh.title} onBack={() => setView('list')} onEdit={() => setView('edit')}>
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-xs px-2 py-1 rounded font-medium ${TYPE_STYLE[fresh.type]}`}>{TYPE_LABEL[fresh.type]}</span>
              {fresh.release_date && <DetailRow label="Release">{new Date(fresh.release_date).toLocaleDateString('de-DE')}</DetailRow>}
            </div>
          </CardBody>
        </Card>

        {/* Songs in diesem Album */}
        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-white">Songs ({songs.length})</span>
          </CardHeader>
          <CardBody className="space-y-1">
            {songs.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-3">Noch keine Songs zugewiesen</p>
            ) : (
              songs.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-200 flex-1">{s.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  <button onClick={() => assignSong.mutate({ songId: s.id, albumId: null })} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Songs zuweisen */}
        <Card>
          <CardHeader><span className="text-sm font-medium text-white">Song zuweisen</span></CardHeader>
          <CardBody className="space-y-2">
            <input
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder="Unveröffentlichte Songs suchen..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
            />
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filteredUnassigned.slice(0, 10).map(s => (
                <button
                  key={s.id}
                  onClick={() => assignSong.mutate({ songId: s.id, albumId: fresh.id })}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded transition-colors"
                >
                  <span className="text-sm text-gray-300 flex-1">{s.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                </button>
              ))}
              {filteredUnassigned.length === 0 && <p className="text-xs text-gray-600 px-3 py-2">Alle Songs bereits zugewiesen</p>}
            </div>
          </CardBody>
        </Card>
      </DetailPanel>
    )
  }

  if (view === 'edit' && selected) {
    return (
      <AlbumForm
        initial={selected}
        onClose={() => setView('detail')}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['albums'] }); setView('detail') }}
        inline
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Alben & Releases</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          <Plus size={14} /> Neues Release
        </button>
      </div>

      <Card>
        {albums.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Keine Releases</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {albums.map(album => {
              const count = albumSongs(album.id).length
              return (
                <div
                  key={album.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer"
                  onClick={() => { setSelected(album); setView('detail') }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200">{album.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_STYLE[album.type]}`}>{TYPE_LABEL[album.type]}</span>
                      {album.release_date && <span className="text-xs text-gray-500">{new Date(album.release_date).getFullYear()}</span>}
                      <span className="text-xs text-gray-600">{count} Song{count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <RowActions actions={[
                      { label: 'Bearbeiten', onClick: () => { setSelected(album); setView('edit') } },
                      { label: 'Löschen', onClick: () => deleteAlbum.mutate({ id: album.id, title: album.title }), danger: true },
                    ]} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {unassigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600 uppercase tracking-wider px-1">Keinem Release zugewiesen ({unassigned.length})</p>
          <Card>
            <div className="divide-y divide-[#1a1a1a]">
              {unassigned.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm text-gray-400 flex-1">{s.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {showForm && (
        <AlbumForm
          initial={null}
          onClose={() => setShowForm(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['albums'] }); setShowForm(false) }}
        />
      )}
    </div>
  )
}

function AlbumForm({ initial, onClose, onSaved, inline }: { initial: Album | null; onClose: () => void; onSaved: () => void; inline?: boolean }) {
  const [title, setTitle]   = useState(initial?.title ?? '')
  const [type, setType]     = useState<string>(initial?.type ?? 'album')
  const [release, setRelease] = useState(initial?.release_date ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { title, type, release_date: release || null }
    if (initial) { await supabase.from('albums').update(payload).eq('id', initial.id) }
    else { await supabase.from('albums').insert(payload); logActivity('erstellt', 'album', title) }
    onSaved()
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Titel"><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Albumtitel..." autoFocus /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Typ">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="album">Album</option>
            <option value="ep">EP</option>
            <option value="single">Single</option>
          </Select>
        </FormField>
        <FormField label="Release-Datum"><Input type="date" value={release} onChange={e => setRelease(e.target.value)} /></FormField>
      </div>
      <SubmitRow onCancel={onClose} label={initial ? 'Speichern' : 'Erstellen'} />
    </form>
  )

  if (inline) return <div className="max-w-lg space-y-4"><h2 className="text-lg font-bold text-white">{initial ? 'Release bearbeiten' : 'Neues Release'}</h2>{form}</div>
  return <Modal title={initial ? 'Release bearbeiten' : 'Neues Release'} onClose={onClose}>{form}</Modal>
}
