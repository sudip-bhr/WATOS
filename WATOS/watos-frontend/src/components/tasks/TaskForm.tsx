import { useState } from 'react'
import type { Task } from '@/types'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useTaskStore } from '@/store/taskStore'
import { Brain, Shield } from 'lucide-react'
import { Badge } from '../ui/badge'

import { createTask, updateTask } from '@/api/tasks'

interface TaskFormProps {
  task?: Task
  onSuccess: () => void
}

const TaskForm = ({ task, onSuccess }: TaskFormProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    complexity: task?.complexity || 1,
    effort_hours: task?.effort_hours || 8,
    deadline: task?.deadline?.split('T')[0] || new Date().toISOString().split('T')[0],
    sla_hours: task?.sla_hours || null as number | null,
  })

  const { fetchTasks } = useTaskStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (task) {
        await updateTask(task.id, { ...formData, sla_hours: formData.sla_hours || undefined })
      } else {
        await createTask({ ...formData, status: 'todo', sla_hours: formData.sla_hours || undefined })
      }
      fetchTasks()
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save task')
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complexity">Complexity (1-5)</Label>
            <Input 
              id="complexity" 
              type="number" 
              min="1" max="5" step="0.5"
              value={formData.complexity} 
              onChange={e => setFormData({...formData, complexity: parseFloat(e.target.value)})} 
            />
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
