import client from './client'

export interface Comment {
  id: string
  task_id: string
  user_id?: string
  content: string
  created_at: string
  author_name?: string
  author_email?: string
}

export interface Attachment {
  id: string
  task_id: string
  file_url: string
  file_name?: string
  file_size?: string
  uploaded_by?: string
  created_at: string
}

export interface Watcher {
  id: string
  task_id: string
  user_id: string
  created_at: string
}

export const getComments = async (taskId: string): Promise<Comment[]> => {
  const { data } = await client.get(`/tasks/${taskId}/comments`)
  return data
}

export const createComment = async (taskId: string, content: string): Promise<Comment> => {
  const { data } = await client.post(`/tasks/${taskId}/comments`, { content })
  return data
}

export const getAttachments = async (taskId: string): Promise<Attachment[]> => {
  const { data } = await client.get(`/tasks/${taskId}/attachments`)
  return data
}

export const uploadAttachment = async (taskId: string, file: File): Promise<Attachment> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await client.post(`/tasks/${taskId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

export const watchTask = async (taskId: string): Promise<Watcher> => {
  const { data } = await client.post(`/tasks/${taskId}/watch`)
  return data
}

export const unwatchTask = async (taskId: string): Promise<void> => {
  await client.delete(`/tasks/${taskId}/watch`)
}
