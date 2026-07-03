import { Link } from 'react-router-dom'
import { Calendar, Music, AlertCircle, Target, ShoppingBag, Activity } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import {
  useDashboardStats,
  useNextEvents,
  useSongsInProgress,
  useOverdueTasks,
  useGoals,
  useLowStockMerch,
} from '@/hooks/useDashboard'
import { useActivityLog, timeAgo } from '@/modules/activity/ActivityPage'

const STATUS_COLORS: Record<string, string> = {
  IDEE: 'bg-gray-700 text-gray-300',
  SCHREIBEN: 'bg-blue-900 text-blue-300',
  ARRANGEMENT: 'bg-purple-900 text-purple-300',
  DEMO: 'bg-yellow-900 text-yellow-300',
  FERTIG: 'bg-green-900 text-green-300',
  VERÖFFENTLICHT: 'bg-red-900 text-red-300',
}

function KpiCard({ value, label, color = 'text-yellow-400', sub }: { value: string | number; label: string; color?: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-bold leading-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </Card>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function DashboardPage() {
  const { data: stats } = useDashboardStats()
  const { data: nextEvents } = useNextEvents()
  const { data: songsInProgress } = useSongsInProgress()
  const { data: overdueTasks } = useOverdueTasks()
  const { data: goals } = useGoals()
  const { data: lowStock } = useLowStockMerch()
  const { data: activityEntries = [] } = useActivityLog(8)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Quick add */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { to: '/contacts?new=1', label: '+ Kontakt' },
          { to: '/songs?new=1', label: '+ Song' },
          { to: '/projects?new=1', label: '+ Projekt' },
          { to: '/tasks?new=1', label: '+ Aufgabe' },
          { to: '/calendar?new=1', label: '+ Event' },
          { to: '/merch?new=1', label: '+ Merch' },
        ].map(btn => (
          <Link
            key={btn.to}
            to={btn.to}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-600 text-gray-400 hover:text-white text-xs rounded transition-colors"
          >
            {btn.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          value={stats?.nextShow ? `${stats.nextShow.daysUntil}T` : '-'}
          label="Nächste Show"
          color="text-white"
          sub={stats?.nextShow ? new Date(stats.nextShow.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'Keine geplant'}
        />
        <KpiCard
          value={stats?.nextProbe ? `${stats.nextProbe.daysUntil}T` : '-'}
          label="Nächste Probe"
          color="text-white"
          sub={stats?.nextProbe ? new Date(stats.nextProbe.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'Keine geplant'}
        />
        <KpiCard value={stats?.songsInWork ?? 0} label="Songs in Arbeit" color="text-white" />
        <KpiCard value={stats?.openTasks ?? 0} label="Offene Aufgaben" color="text-white" />
        <KpiCard
          value={stats?.overdueTasks ?? 0}
          label="Überfällig"
          color={stats?.overdueTasks ? 'text-red-500' : 'text-gray-600'}
        />
        <KpiCard
          value={stats?.lowMerchCount ?? 0}
          label="Merch Niedrig"
          color={stats?.lowMerchCount ? 'text-orange-400' : 'text-gray-600'}
        />
        <KpiCard
          value={stats?.goalsAvg != null ? `${stats.goalsAvg}%` : '-'}
          label="Ziele Ø"
          color="text-white"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Nächste Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Calendar size={14} className="text-red-500" />
              Nächste Events
            </div>
            <Link to="/calendar" className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Kalender →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {!nextEvents || nextEvents.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Keine Events</p>
            ) : (
              nextEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">{event.title}</span>
                  <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                </div>
              ))
            )}
            <Link
              to="/calendar?new=1"
              className="block text-xs text-gray-600 hover:text-red-400 pt-1 transition-colors"
            >
              + Event hinzufügen
            </Link>
          </CardBody>
        </Card>

        {/* Songs in Entwicklung */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Music size={14} className="text-red-500" />
              Songs in Entwicklung
            </div>
            <Link to="/songs" className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Alle →
            </Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {!songsInProgress || songsInProgress.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Keine Songs</p>
            ) : (
              songsInProgress.map(song => (
                <div key={song.id} className="flex items-center gap-3 py-1">
                  <span className="text-sm text-gray-300 flex-1 truncate">{song.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${STATUS_COLORS[song.status] ?? 'bg-gray-800 text-gray-400'}`}>
                    {song.status}
                  </span>
                  <span className="text-xs text-gray-500 w-8 text-right">{song.progress}%</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Überfällige Aufgaben */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <AlertCircle size={14} className="text-red-500" />
              Überfällig
              {overdueTasks && overdueTasks.length > 0 && (
                <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                  {overdueTasks.length}
                </span>
              )}
            </div>
            <Link to="/tasks" className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Alle →
            </Link>
          </CardHeader>
          <CardBody className="space-y-1 max-h-64 overflow-y-auto">
            {!overdueTasks || overdueTasks.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Keine überfälligen Aufgaben</p>
            ) : (
              overdueTasks.map(task => (
                <div key={task.id} className="flex items-start justify-between py-1 gap-2">
                  <span className="text-sm text-gray-300">{task.title}</span>
                  <span className="text-xs text-red-400 whitespace-nowrap">{task.due_date ? formatDate(task.due_date) : ''}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Strategische Ziele */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Target size={14} className="text-red-500" />
              Strategische Ziele {new Date().getFullYear()}
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {!goals || goals.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Keine Ziele definiert</p>
            ) : (
              goals.map(goal => {
                const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-300">{goal.title}</span>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#2a2a2a] rounded-full">
                      <div
                        className="h-1 bg-red-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>
      </div>

      {/* Aktivitäts-Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Activity size={14} className="text-red-500" />
            Letzte Aktivitäten
          </div>
          <Link to="/activity" className="text-xs text-gray-500 hover:text-red-400 transition-colors">Alle →</Link>
        </CardHeader>
        <CardBody className="space-y-0 -mx-4">
          {activityEntries.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">Noch keine Aktivitäten</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (activityEntries as any[]).map(entry => {
              const who = Array.isArray(entry.profiles) ? entry.profiles[0]?.display_name : entry.profiles?.display_name
              return (
                <div key={entry.id} className="flex items-center gap-2 px-4 py-2 hover:bg-white/5">
                  <span className="text-xs text-gray-300 flex-1 truncate">
                    <span className="text-white">{who ?? '—'}</span>
                    {' '}{entry.action}{' '}„{entry.entity_name}"
                  </span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>

      {/* Merch Nachbestellen */}
      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ShoppingBag size={14} className="text-red-500" />
              Merch: Nachbestellen!
            </div>
            <Link to="/merch" className="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Zum Merch →
            </Link>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5">
                  <span className="text-sm text-gray-300">{item.name}{[item.size, item.gender, item.color].filter(Boolean).length ? ` (${[item.size, item.gender, item.color].filter(Boolean).join(' · ')})` : ''}</span>
                  <span className="text-[10px] bg-red-900 text-red-300 px-1.5 py-0.5 rounded">
                    {item.stock <= 0 ? 'LEER' : 'NIEDRIG'}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
