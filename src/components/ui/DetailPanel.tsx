import { ArrowLeft } from 'lucide-react'

interface DetailPanelProps {
  title: string
  onBack: () => void
  onEdit?: () => void
  children: React.ReactNode
}

export function DetailPanel({ title, onBack, onEdit, children }: DetailPanelProps) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{title}</h1>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded transition-colors"
          >
            Bearbeiten
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

interface DetailRowProps {
  label: string
  children: React.ReactNode
}

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-gray-200">{children}</div>
    </div>
  )
}
