import { useState, useEffect } from 'react'
import type { Task, User as UserType } from '@/types'
import { AxiosError } from 'axios'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useTaskStore } from '@/store/taskStore'
import { Brain, Shield, FolderKanban, User } from 'lucide-react'
import { Badge } from '../ui/badge'
import { createTask, updateTask } from '@/api/tasks'
import { getProjects, type Project } from '@/api/projects'
import client from '@/api/client'

interface TaskFormProps {
  task?: Task
  defaultProjectId?: string
  onSuccess: () => void
}

const TaskForm = ({ task, defaultProjectId, onSuccess }: TaskFormProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<UserType[]>([])

  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    complexity: task?.complexity || 1,
    effort_hours: task?.effort_hours || 8,
    deadline: task?.deadline?.split('T')[0] || new Date().toISOString().split('T')[0],
    sla_hours: task?.sla_hours || null as number | null,
    project_id: task?.project_id || defaultProjectId || '',
    assignee_id: task?.assignee_id || '',
  })

  const { fetchTasks } = useTaskStore()

  useEffect(() => {
    getProjects().then(setProjects).catch(console.error)
    client.get('/users/').then(r => {
      const users: UserType[] = r.data
      setMembers(users.filter(u => u.role === 'member' && u.is_active))
    }).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...formData,
        sla_hours: formData.sla_hours || undefined,
        project_id: formData.project_id || undefined,
        assignee_id: formData.assignee_id || undefined,
      }
      if (task) {
        await updateTask(task.id, payload)
      } else {
        await createTask({ ...payload, status: 'todo' })
      }
      fetchTasks()
      onSuccess()
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      setError(axiosError.response?.data?.detail || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title</Label>
          <Input 
            id="title" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
            placeholder="Implement authentication flow..." 
            required 
          />
        </div>

        {/* Project + Assignee Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project" className="flex items-center gap-1.5">
              <FolderKanban size={12} className="text-zinc-400" />
              Project
            </Label>
            <select
              id="project"
              value={formData.project_id}
              onChange={e => setFormData({...formData, project_id: e.target.value})}
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignee" className="flex items-center gap-1.5">
              <User size={12} className="text-zinc-400" />
              Assign To
            </Label>
            <select
              id="assignee"
              value={formData.assignee_id}
              onChange={e => setFormData({...formData, assignee_id: e.target.value})}
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complexity">Complexity</Label>
            <select
              id="complexity"
              value={formData.complexity <= 2.5 ? 'Low' : formData.complexity <= 3.5 ? 'Medium' : 'High'}
              onChange={e => {
                const label = e.target.value
                const val = label === 'Low' ? 1.5 : label === 'Medium' ? 3.0 : 4.5
                setFormData({...formData, complexity: val})
              }}
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="effort">Base Effort (hrs)</Label>
            <Input 
              id="effort" 
              type="number" 
              value={formData.effort_hours} 
              onChange={e => setFormData({...formData, effort_hours: parseFloat(e.target.value)})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input 
            id="deadline" 
            type="date"
            value={formData.deadline} 
            onChange={e => setFormData({...formData, deadline: e.target.value})} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sla" className="flex items-center gap-1.5">
            <Shield size={12} className="text-zinc-400" />
            SLA Window (hours)
          </Label>
          <Input 
            id="sla" 
            type="number" 
            min="1"
            placeholder="Optional — e.g. 24"
            value={formData.sla_hours ?? ''} 
            onChange={e => setFormData({...formData, sla_hours: e.target.value ? parseInt(e.target.value) : null})} 
          />
          <p className="text-[10px] text-zinc-400 font-medium">Auto-escalates if task exceeds this window</p>
        </div>

        {/* ML Prediction Preview (Simulation) */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
            <Brain size={14} />
            AI Prediction Engine
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Predicted Duration</span>
              <div className="text-lg font-bold text-zinc-900">~{(formData.effort_hours * 1.2).toFixed(1)}h</div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Delay Risk</span>
              <div className="flex">
                <Badge variant={formData.complexity > 3 ? 'warning' : 'success'} className="h-5 px-3">
                  {formData.complexity > 3 ? 'Medium' : 'Low'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
        <Button type="submit" disabled={loading} className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl py-6 font-bold shadow-lg shadow-zinc-900/10">
          {loading ? 'Processing...' : (task ? 'Update Workload Item' : 'Generate Task')}
        </Button>
      </div>
    </form>
  )
}

export default TaskForm
