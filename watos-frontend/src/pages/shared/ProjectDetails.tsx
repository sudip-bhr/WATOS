import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getProjectTasks, type Project, type ProjectSummary } from '@/api/projects'
import TaskDetails from '@/components/tasks/TaskDetails'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Briefcase, Calendar, CheckCircle2, CircleDashed, ListTodo, AlertTriangle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-50 text-blue-700',
  review: 'bg-amber-50 text-amber-700',
  approved: 'bg-violet-50 text-violet-700',
  done: 'bg-emerald-50 text-emerald-700',
  blocked: 'bg-rose-50 text-rose-700',
  rejected: 'bg-rose-100 text-rose-800',
}

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [projRes, tasksRes] = await Promise.all([
          getProject(id),
          getProjectTasks(id)
        ])
        setProject(projRes)
        setSummary(tasksRes)
      } catch (error) {
        console.error('Failed to fetch project details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-zinc-500 font-medium">Project not found.</p>
      </div>
    )
  }

  const tasks: Task[] = summary?.tasks ?? []
  const completionPct = Math.round(summary?.summary.completion_pct || 0)
  const avgRisk = Math.round((summary?.summary.avg_delay_prob || 0) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-xl border-zinc-200 shrink-0" onClick={() => navigate('/projects')}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-2 md:gap-3">
              <Briefcase className="text-emerald-500 shrink-0" size={24} />
              <span className="truncate max-w-[200px] sm:max-w-md">{project.name}</span>
            </h1>
            <p className="text-zinc-500 font-medium flex items-center gap-2 mt-1 text-[10px] md:text-sm">
              <Calendar size={14} />
              Created {format(new Date(project.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {project.description && (
        <p className="text-sm md:text-base text-zinc-600 max-w-3xl leading-relaxed">{project.description}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-zinc-900 text-white border-none shadow-xl shadow-zinc-900/10">
          <CardHeader className="p-4 md:pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
              <ListTodo size={14} /> Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:pt-0">
            <div className="text-3xl md:text-4xl font-black">{summary?.summary.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardHeader className="p-4 md:pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
              <CheckCircle2 size={14} /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:pt-0">
            <div className="text-3xl md:text-4xl font-black text-emerald-950">{summary?.summary.done || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="p-4 md:pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
              <CircleDashed size={14} /> Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:pt-0">
            <div className="text-3xl md:text-4xl font-black text-blue-950">{completionPct}%</div>
            <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border', avgRisk > 60 ? 'border-rose-100 bg-rose-50/30' : avgRisk > 35 ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30')}>
          <CardHeader className="p-4 md:pb-2">
            <CardTitle className={cn('text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2', avgRisk > 60 ? 'text-rose-600' : avgRisk > 35 ? 'text-amber-600' : 'text-emerald-600')}>
              <AlertTriangle size={14} /> Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:pt-0">
            <div className={cn('text-3xl md:text-4xl font-black', avgRisk > 60 ? 'text-rose-950' : avgRisk > 35 ? 'text-amber-950' : 'text-emerald-950')}>
              {avgRisk}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-4 pt-6 border-t border-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Project Tasks</h2>
          <p className="text-[10px] md:text-xs text-zinc-400 font-medium">Click a task to view full details</p>
        </div>

        {tasks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h3 className="font-bold text-zinc-900 text-sm md:text-base line-clamp-2 leading-snug pr-2">{task.title}</h3>
                  <span className={cn('shrink-0 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg', STATUS_STYLES[task.status] || 'bg-zinc-100 text-zinc-500')}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] md:text-xs text-zinc-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {task.effort_hours}h effort
                  </span>
                  {task.delay_prob > 0.5 && (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-black text-[8px] md:text-[9px] uppercase px-1.5 py-0">
                      High Risk
                    </Badge>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-50 text-[9px] md:text-[10px] text-zinc-300 font-medium group-hover:text-zinc-500 transition-colors">
                  Due {format(new Date(task.deadline), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl">
            <p className="text-zinc-500 font-medium text-sm">No tasks found for this project.</p>
          </div>
        )}
      </div>

      {/* TaskDetails slideout — no navigation away */}
      <TaskDetails
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </motion.div>
  )
}

export default ProjectDetails
