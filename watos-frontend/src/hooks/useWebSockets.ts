import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTaskStore } from '../store/taskStore'
import { toast } from '../hooks/use-toast'

const alertSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')

export const useWebSockets = () => {
  const { token, user } = useAuthStore()
  const { fetchTasks } = useTaskStore()
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!token || !user) return

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    const httpHost = apiUrl.replace(/\/api\/v1$/, '').replace(/^https?:\/\//, '')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${httpHost}/api/v1/notifications/ws/${user.id}`
    
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('WebSocket Connected')
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket Message Received:', data)
      
      // Automatic store updates
      if (data.type === 'task_update' || data.type === 'new_task') {
        fetchTasks()
        
        // Show interactive toast
        const isHighRisk = data.metadata?.delay_prob > 0.8
        if (isHighRisk) {
          alertSound.play().catch(() => {})
        }

        toast({
          title: isHighRisk ? "High Risk Alert" : "Task Update",
          description: data.message || "A task has been updated externally.",
          variant: isHighRisk ? "destructive" : "default",
        })
      }
    }

    socket.onclose = () => {
      console.log('WebSocket Disconnected')
    }

    return () => {
      socket.close()
    }
  }, [token, user, fetchTasks])

  return socketRef.current
}
