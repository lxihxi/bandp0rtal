import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'

interface Action {
  label: string
  onClick: () => void
  danger?: boolean
}

export function RowActions({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirming(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleAction(action: Action) {
    if (action.danger) {
      setConfirming(action.label)
    } else {
      action.onClick()
      setOpen(false)
    }
  }

  function handleConfirm(action: Action) {
    action.onClick()
    setOpen(false)
    setConfirming(null)
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); setConfirming(null) }}
        className="p-1.5 text-gray-600 hover:text-gray-300 rounded transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-[#1a1a1a] border border-[#2a2a2a] rounded shadow-xl min-w-[140px] py-1">
          {confirming ? (
            <div className="px-3 py-2 space-y-2">
              <p className="text-xs text-gray-400">Wirklich löschen?</p>
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); const a = actions.find(a => a.label === confirming); if (a) handleConfirm(a) }}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Ja, löschen
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirming(null) }}
                  className="flex-1 px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            actions.map(action => (
              <button
                key={action.label}
                onClick={e => { e.stopPropagation(); handleAction(action) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${action.danger ? 'text-red-400 hover:bg-red-950' : 'text-gray-300 hover:bg-white/5'}`}
              >
                {action.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
