import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import { useInactivityLogout } from '@/hooks/useInactivityLogout'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { warningVisible, secondsLeft, stayActive } = useInactivityLogout()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#0f0f0f]">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white flex-1">
            band<span className="text-red-500">p</span>O<span className="text-red-500">rtal</span>
          </span>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Search size={18} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {warningVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-6 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="text-4xl font-bold text-red-500">{secondsLeft}</div>
            <p className="text-white font-medium">Automatische Abmeldung</p>
            <p className="text-sm text-gray-400">
              Du wirst in {secondsLeft} Sekunde{secondsLeft !== 1 ? 'n' : ''} wegen Inaktivität abgemeldet.
            </p>
            <button
              onClick={stayActive}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
            >
              Aktiv bleiben
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
