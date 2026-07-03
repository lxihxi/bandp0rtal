import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString()

      const [singles, openTasks, overdueTasks, shows] = await Promise.all([
        supabase.from('songs').select('id', { count: 'exact' }).eq('status', 'VERÖFFENTLICHT'),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('done', false),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('done', false).lt('due_date', today.split('T')[0]),
        supabase.from('events').select('id', { count: 'exact' }).eq('type', 'show'),
      ])

      return {
        singles: singles.count ?? 0,
        openTasks: openTasks.count ?? 0,
        overdueTasks: overdueTasks.count ?? 0,
        shows: shows.count ?? 0,
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
