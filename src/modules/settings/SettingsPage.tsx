import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-bold text-white">Einstellungen</h1>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-white">Account</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">E-Mail</p>
            <p className="text-sm text-gray-300">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
            <p className="text-xs text-gray-600 font-mono">{user?.id ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Letzter Login</p>
            <p className="text-sm text-gray-300">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString('de-DE')
                : '—'}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-white">Session</span>
        </CardHeader>
        <CardBody>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full text-left text-sm text-red-500 hover:text-red-400 transition-colors py-1"
          >
            Abmelden
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-white">Passwort ändern</span>
        </CardHeader>
        <CardBody>
          <PasswordForm />
        </CardBody>
      </Card>
    </div>
  )
}

function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setStatus('error'); setMsg('Passwörter stimmen nicht überein'); return }
    if (password.length < 8) { setStatus('error'); setMsg('Mindestens 8 Zeichen'); return }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setStatus('error'); setMsg(error.message) }
    else { setStatus('success'); setMsg('Passwort gespeichert'); setPassword(''); setConfirm('') }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Neues Passwort"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Wiederholen"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-gray-600"
      />
      {msg && <p className={`text-xs ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
      <button
        type="submit"
        className="px-4 py-2 text-sm bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded transition-colors"
      >
        Speichern
      </button>
    </form>
  )
}
