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
    const wsBase = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    const wsUrl = `${wsBase}/notifications/ws?token=${token}`
    
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    let isMounted = true
    socket.onopen = () => {
      console.log('WebSocket Connected')
      if (!isMounted) socket.close()
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
      isMounted = false
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [token, user, fetchTasks])

  return socketRef
}
