import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'

const ENTITY_STYLE: Record<string, string> = {
  song: 'text-purple-400', event: 'text-red-400', task: 'text-yellow-400',
  contact: 'text-blue-400', album: 'text-pink-400', default: 'text-gray-400',
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'gerade eben'
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`
  if (s < 604800) return `vor ${Math.floor(s / 86400)} Tag${Math.floor(s / 86400) > 1 ? 'en' : ''}`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function useActivityLog(limit = 50) {
  return useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_log')
        .select('*, profiles(display_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

export default function ActivityPage() {
  const { data: entries = [], isLoading } = useActivityLog(100)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Aktivität</h1>
      <Card>
        {isLoading ? (
          <p className="text-gray-600 text-sm text-center py-10">Laden...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">Noch keine Aktivitäten</p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(entries as any[]).map(entry => {
              const who = Array.isArray(entry.profiles) ? entry.profiles[0]?.display_name : entry.profiles?.display_name
              const color = ENTITY_STYLE[entry.entity_type] ?? ENTITY_STYLE.default
              return (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${color.replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-300">
                      <span className="text-white font-medium">{who ?? 'Jemand'}</span>
                      {' hat '}<span className="text-gray-200">„{entry.entity_name}"</span>
                      {' '}<span className={color}>{entry.action}</span>
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
