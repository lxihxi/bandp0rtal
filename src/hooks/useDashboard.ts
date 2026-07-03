import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const today = now.split('T')[0]

      const [openTasks, overdueTasks, songsInWork, nextShow, nextProbe, lowMerch, goals] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact' }).eq('done', false),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('done', false).lt('due_date', today),
        supabase.from('songs').select('id', { count: 'exact' }).neq('status', 'VERÖFFENTLICHT'),
        supabase.from('events').select('date').eq('type', 'show').gte('date', now).order('date').limit(1),
        supabase.from('events').select('date').eq('type', 'probe').gte('date', now).order('date').limit(1),
        supabase.from('merch_items').select('id, stock, reorder_threshold'),
        supabase.from('goals').select('current_value, target_value').eq('year', new Date().getFullYear()),
      ])

      const lowMerchCount = (lowMerch.data ?? []).filter(i => i.stock <= i.reorder_threshold).length

      const goalsData = goals.data ?? []
      const goalsAvg = goalsData.length > 0
        ? Math.round(goalsData.reduce((sum, g) => sum + Math.min(100, (g.current_value / g.target_value) * 100), 0) / goalsData.length)
        : null

      const nextShowDate = nextShow.data?.[0]?.date ?? null
      const nextProbeDate = nextProbe.data?.[0]?.date ?? null

      function daysUntil(iso: string) {
        const diff = new Date(iso).getTime() - Date.now()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
      }

      return {
        openTasks: openTasks.count ?? 0,
        overdueTasks: overdueTasks.count ?? 0,
        songsInWork: songsInWork.count ?? 0,
        nextShow: nextShowDate ? { date: nextShowDate, daysUntil: daysUntil(nextShowDate) } : null,
        nextProbe: nextProbeDate ? { date: nextProbeDate, daysUntil: daysUntil(nextProbeDate) } : null,
        lowMerchCount,
        goalsAvg,
      }
    },
  })
}

export function useNextEvents() {
  return useQuery({
    queryKey: ['next-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5)
      return data ?? []
    },
  })
}

export function useSongsInProgress() {
  return useQuery({
    queryKey: ['songs-in-progress'],
    queryFn: async () => {
      const { data } = await supabase
        .from('songs')
        .select('*')
        .neq('status', 'VERÖFFENTLICHT')
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: ['overdue-tasks'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('done', false)
        .lt('due_date', today)
        .order('due_date', { ascending: true })
      return data ?? []
    },
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('year', new Date().getFullYear())
        .order('created_at', { ascending: true })
      return data ?? []
    },
  })
}

export function useLowStockMerch() {
  return useQuery({
    queryKey: ['low-stock-merch'],
    queryFn: async () => {
      const { data } = await supabase
        .from('merch_items')
        .select('*')
        .order('stock', { ascending: true })
      return (data ?? []).filter(item => item.stock <= item.reorder_threshold)
    },
  })
}
