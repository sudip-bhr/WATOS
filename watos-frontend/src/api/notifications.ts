import client from './client'
import type { Notification } from '../types'

export const getNotifications = async (): Promise<Notification[]> => {
  const { data } = await client.get('/notifications')
  return data
}

export const markNotificationRead = async (notifId: string): Promise<Notification> => {
  const { data } = await client.patch(`/notifications/${notifId}/read`)
  return data
}

export const markAllNotificationsRead = async (): Promise<void> => {
  await client.post('/notifications/read-all')
}
