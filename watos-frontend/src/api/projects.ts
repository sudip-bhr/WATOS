import client from './client'
import type { Task } from '@/types'

export interface Project {
  id: string
  name: string
  description?: string
  admin_id?: string
  created_at: string
}

export interface ProjectSummary {
  tasks: Task[]
  summary: {
    total: number
    done: number
    completion_pct: number
    avg_delay_prob: number
  }
}

export const getProjects = async (): Promise<Project[]> => {
  const { data } = await client.get('/projects')
  return data
}

export const getProject = async (id: string): Promise<Project> => {
  const { data } = await client.get(`/projects/${id}`)
  return data
}

export const createProject = async (payload: { name: string; description?: string }): Promise<Project> => {
  const { data } = await client.post('/projects', payload)
  return data
}

export const updateProject = async (id: string, payload: { name?: string; description?: string }): Promise<Project> => {
  const { data } = await client.patch(`/projects/${id}`, payload)
  return data
}

export const deleteProject = async (id: string): Promise<void> => {
  await client.delete(`/projects/${id}`)
}

export const getProjectTasks = async (id: string): Promise<ProjectSummary> => {
  const { data } = await client.get(`/projects/${id}/tasks`)
  return data
}
