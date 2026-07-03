import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import LoginPage from '@/modules/auth/LoginPage'
import DashboardPage from '@/modules/dashboard/DashboardPage'
import ContactsPage from '@/modules/contacts/ContactsPage'
import SongsPage from '@/modules/songs/SongsPage'
import ProjectsPage from '@/modules/projects/ProjectsPage'
import CalendarPage from '@/modules/calendar/CalendarPage'
import TasksPage from '@/modules/tasks/TasksPage'
import MerchPage from '@/modules/merch/MerchPage'
import FilesPage from '@/modules/files/FilesPage'
import WikiPage from '@/modules/wiki/WikiPage'
import SettingsPage from '@/modules/settings/SettingsPage'
import FinancesPage from '@/modules/finances/FinancesPage'
import AlbumsPage from '@/modules/albums/AlbumsPage'
import SetlistsPage from '@/modules/setlists/SetlistsPage'
import ActivityPage from '@/modules/activity/ActivityPage'

const queryClient = new QueryClient()

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route
            element={
              <ProtectedRoute session={session}>
                <GlobalSearch />
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/merch" element={<MerchPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/wiki" element={<WikiPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/finances" element={<FinancesPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/setlists" element={<SetlistsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
