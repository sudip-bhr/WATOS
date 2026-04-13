import { create } from 'zustand'
import type { Task } from '../types'
import { getTasks, updateTask as updateTaskApi } from '../api/tasks'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>
  reassignTask: (taskId: string, assigneeId: string) => Promise<void>
  reorderTasks: (newTasks: Task[]) => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  fetchTasks: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getTasks()
      set({ tasks: data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },
  updateTaskStatus: async (taskId, status) => {
    const originalTasks = get().tasks
    set({
      tasks: originalTasks.map((t) =>
        t.id === taskId ? { ...t, status } : t
      ),
    })

    try {
      await updateTaskApi(taskId, { status })
    } catch (err) {
      set({ tasks: originalTasks })
      throw err
    }
  },
  reassignTask: async (taskId, assigneeId) => {
    const originalTasks = get().tasks
    set({
      tasks: originalTasks.map((t) =>
        t.id === taskId ? { ...t, assignee_id: assigneeId } : t
      ),
    })

    try {
      await updateTaskApi(taskId, { assignee_id: assigneeId })
    } catch (err) {
      set({ tasks: originalTasks })
      throw err
    }
  },
  reorderTasks: (newTasks) => {
    set({ tasks: newTasks })
  }
}))
