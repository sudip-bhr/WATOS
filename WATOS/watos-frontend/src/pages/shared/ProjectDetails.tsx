import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, getProjectTasks, type Project, type ProjectSummary } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Briefcase, Calendar, CheckCircle2, CircleDashed, ListTodo, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-xl border-zinc-200" onClick={() => navigate('/projects')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <Briefcase className="text-emerald-500" size={28} />
            {project.name}
          </h1>
          <p className="text-zinc-500 font-medium flex items-center gap-2 mt-1 text-sm">
            <Calendar size={14} />
            Created {format(new Date(project.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {project.description && (
        <p className="text-zinc-600 max-w-3xl leading-relaxed">{project.description}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 text-white border-none shadow-xl shadow-zinc-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
              <ListTodo size={14} />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{summary?.summary.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2">
              <CheckCircle2 size={14} />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-950">{summary?.summary.done || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
              <CircleDashed size={14} />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-blue-950">
              {Math.round(summary?.summary.completion_pct || 0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 flex items-center gap-2">
              <AlertTriangle size={14} />
              Avg Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-rose-950">
              {Math.round((summary?.summary.avg_delay_prob || 0) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-4 pt-6 border-t border-zinc-100">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Project Tasks</h2>
        {summary?.tasks && summary.tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.tasks.map(task => (
              <div key={task.id} className="p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 transition-colors shadow-sm cursor-pointer" onClick={() => navigate('/tasks')}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-zinc-900 line-clamp-1">{task.title}</h3>
                  <Badge variant="outline" className="capitalize text-[10px] font-bold">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 font-medium mb-3">
                  Effort: {task.effort_hours}h
                </p>
                {task.delay_prob > 0.5 && (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none font-black text-[10px] uppercase">
                    High Risk
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl">
            <p className="text-zinc-500 font-medium">No tasks found for this project.</p>
            <Button className="mt-4" onClick={() => navigate('/tasks')}>Go to Board</Button>
          </div>
        )}
      </div>

    </motion.div>
  )
}

export default ProjectDetails
