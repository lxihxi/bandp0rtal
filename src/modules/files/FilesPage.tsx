import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'

const FOLDERS = ['EPK', 'Verträge', 'Rider', 'Sonstiges'] as const
type Folder = typeof FOLDERS[number]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function FilesPage() {
  const qc = useQueryClient()
  const [folder, setFolder] = useState<Folder>('EPK')
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', folder],
    queryFn: async () => {
      const { data } = await supabase.storage.from('files').list(folder, { sortBy: { column: 'created_at', order: 'desc' } })
      return (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')
    },
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = `${folder}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('files').upload(path, file)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', folder] }),
  })

  const remove = useMutation({
    mutationFn: async (name: string) => {
      await supabase.storage.from('files').remove([`${folder}/${name}`])
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', folder] }),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await upload.mutateAsync(file)
    setUploading(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleDownload(name: string) {
    const { data } = await supabase.storage.from('files').createSignedUrl(`${folder}/${name}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const displayName = (name: string) => name.replace(/^\d+_/, '')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dateien & EPK</h1>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
        >
          <Upload size={14} />
          {uploading ? 'Hochladen...' : 'Hochladen'}
        </button>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {FOLDERS.map(f => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors flex-shrink-0 ${folder === f ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <p className="text-gray-600 text-sm text-center py-10">Laden...</p>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm">Keine Dateien in {folder}</p>
            <button
              onClick={() => fileInput.current?.click()}
              className="mt-3 text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              + Datei hochladen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {files.map(file => (
              <div key={file.name} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 group">
                <FileText size={16} className="text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{displayName(file.name)}</p>
                  <p className="text-xs text-gray-600">
                    {file.metadata?.size ? formatSize(file.metadata.size) : ''}
                    {file.created_at ? ` · ${formatDate(file.created_at)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleDownload(file.name)}
                    className="p-1.5 text-gray-500 hover:text-white transition-colors"
                    title="Herunterladen"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => remove.mutate(file.name)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
