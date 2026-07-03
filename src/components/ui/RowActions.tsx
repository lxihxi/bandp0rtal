import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

interface Action {
  label: string
  onClick: () => void
  danger?: boolean
}

export function RowActions({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1.5 text-gray-600 hover:text-gray-300 rounded transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-[#1a1a1a] border border-[#2a2a2a] rounded shadow-xl min-w-[120px] py-1">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={e => { e.stopPropagation(); action.onClick(); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${action.danger ? 'text-red-400 hover:bg-red-950' : 'text-gray-300 hover:bg-white/5'}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
