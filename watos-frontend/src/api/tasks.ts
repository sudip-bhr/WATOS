import client from './client'
import type { Task } from '../types'

export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const { data } = await client.post('/tasks', task)
  return data
}

export const updateTask = async (taskId: string, task: Partial<Task>): Promise<Task> => {
  const { data } = await client.patch(`/tasks/${taskId}`, task)
  return data
}

export const deleteTask = async (taskId: string): Promise<void> => {
  await client.delete(`/tasks/${taskId}`)
}

export const getTasks = async (projectId?: string): Promise<Task[]> => {
  const { data } = await client.get('/tasks', { params: { project_id: projectId } })
  return data
}

export const getTaskDetails = async (taskId: string): Promise<Task> => {
  const { data } = await client.get(`/tasks/${taskId}`)
  return data
}
