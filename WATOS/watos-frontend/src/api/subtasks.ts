import client from './client'

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export const getSubtasks = async (taskId: string): Promise<Subtask[]> => {
  const { data } = await client.get(`/tasks/${taskId}/subtasks`)
  return data
}

export const createSubtask = async (taskId: string, title: string): Promise<Subtask> => {
  const { data } = await client.post(`/tasks/${taskId}/subtasks`, { title })
  return data
}

export const updateSubtask = async (
  taskId: string,
  subtaskId: string,
  payload: { title?: string; is_completed?: boolean }
): Promise<Subtask> => {
  const { data } = await client.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, payload)
  return data
}

export const deleteSubtask = async (taskId: string, subtaskId: string): Promise<void> => {
  await client.delete(`/tasks/${taskId}/subtasks/${subtaskId}`)
}
