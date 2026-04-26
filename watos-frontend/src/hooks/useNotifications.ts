import { useState, useEffect, useCallback, useRef } from 'react'
import type { Notification } from '../types'
import { getNotifications, markNotificationRead } from '../api/notifications'
import { useAuthStore } from '../store/authStore'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const token = useAuthStore(s => s.token)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await getNotifications()
      setNotifications(data)
    } catch (e) {
      console.error('Failed to fetch notifications', e)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Connect to WebSocket for live updates
  useEffect(() => {
    if (!token) return

    const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')

    const ws = new WebSocket(`${wsBase}/notifications/ws?token=${token}`)
    wsRef.current = ws

    let isMounted = true

    ws.onopen = () => {
      if (!isMounted) ws.close()
    }

    ws.onmessage = (event) => {
      try {
        const incoming: Notification = JSON.parse(event.data)
        setNotifications(prev => [incoming, ...prev])
      } catch {
        // keep-alive / non-JSON message
      }
    }

    ws.onerror = () => ws.close()

    return () => {
      isMounted = false
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [token])

  // Initial fetch
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) {
        await fetchNotifications();
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (e) {
      console.error('Failed to mark notification read', e)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      const { markAllNotificationsRead } = await import('../api/notifications')
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error('Failed to mark all read', e)
    }
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, loading, unreadCount, markRead, markAllRead }
}
