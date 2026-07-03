import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/modules/auth/LoginPage'
import DashboardPage from '@/modules/dashboard/DashboardPage'

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
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/contacts" element={<div className="text-gray-400">CRM & Kontakte - kommt bald</div>} />
            <Route path="/songs" element={<div className="text-gray-400">Songs & Discography - kommt bald</div>} />
            <Route path="/projects" element={<div className="text-gray-400">Projekte & Ziele - kommt bald</div>} />
            <Route path="/calendar" element={<div className="text-gray-400">Kalender - kommt bald</div>} />
            <Route path="/tasks" element={<div className="text-gray-400">Aufgaben - kommt bald</div>} />
            <Route path="/merch" element={<div className="text-gray-400">Merch & Inventar - kommt bald</div>} />
            <Route path="/files" element={<div className="text-gray-400">Dateien & EPK - kommt bald</div>} />
            <Route path="/wiki" element={<div className="text-gray-400">Notizen / Wiki - kommt bald</div>} />
            <Route path="/settings" element={<div className="text-gray-400">Einstellungen - kommt bald</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
