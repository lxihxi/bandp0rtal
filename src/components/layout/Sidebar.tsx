import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Music, FolderKanban, Calendar,
  CheckSquare, ShoppingBag, FolderOpen, BookOpen, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const navMain = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'CRM & Kontakte' },
  { to: '/songs', icon: Music, label: 'Songs & Discography' },
  { to: '/projects', icon: FolderKanban, label: 'Projekte & Ziele' },
  { to: '/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/tasks', icon: CheckSquare, label: 'Aufgaben' },
  { to: '/merch', icon: ShoppingBag, label: 'Merch & Inventar' },
]

const navWissen = [
  { to: '/files', icon: FolderOpen, label: 'Dateien & EPK' },
  { to: '/wiki', icon: BookOpen, label: 'Notizen / Wiki' },
  { to: '/settings', icon: Settings, label: 'Einstellungen' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors',
          isActive
            ? 'bg-red-600/20 text-red-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )
      }
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#0f0f0f] border-r border-[#1f1f1f] flex flex-col">
      <div className="px-4 py-5 border-b border-[#1f1f1f]">
        <span className="text-lg font-bold text-white">
          band<span className="text-red-500">p</span>O<span className="text-red-500">rtal</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-600 font-medium">
          Hauptbereich
        </p>
        {navMain.map(item => <NavItem key={item.to} {...item} />)}

        <p className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-widest text-gray-600 font-medium">
          Wissen
        </p>
        {navWissen.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="p-3 border-t border-[#1f1f1f]">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-red-400 rounded hover:bg-white/5 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </aside>
  )
}
