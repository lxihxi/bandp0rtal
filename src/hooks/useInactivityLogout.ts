import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TIMEOUT_MS = 15 * 60 * 1000   // 15 Minuten
const WARNING_MS = 60 * 1000         // Warnung 60s vorher

export function useInactivityLogout() {
  const [warningVisible, setWarningVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearAllTimers() {
    if (logoutTimer.current)   clearTimeout(logoutTimer.current)
    if (warningTimer.current)  clearTimeout(warningTimer.current)
    if (countdownTimer.current) clearInterval(countdownTimer.current)
  }

  function startTimers() {
    clearAllTimers()
    setWarningVisible(false)

    warningTimer.current = setTimeout(() => {
      setWarningVisible(true)
      setSecondsLeft(60)
      countdownTimer.current = setInterval(() => {
        setSecondsLeft(s => s - 1)
      }, 1000)
    }, TIMEOUT_MS - WARNING_MS)

    logoutTimer.current = setTimeout(() => {
      supabase.auth.signOut()
    }, TIMEOUT_MS)
  }

  function stayActive() {
    startTimers()
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    const handler = () => { if (!warningVisible) startTimers() }

    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    startTimers()

    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearAllTimers()
    }
  }, [warningVisible])

  return { warningVisible, secondsLeft, stayActive }
}
