import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Brain, Search, Zap, Crosshair, Check } from 'lucide-react'
import client from '@/api/client'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useTaskStore } from '@/store/taskStore'
import type { Task } from '@/types'

interface AssignmentRecommendation {
  user_id: string
  full_name: string
  skill_match: number
  availability: number
  combined_score: number
  reason: string
}

const TaskAssignment = () => {
  const [skillsInput, setSkillsInput] = useState('')
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  
  // Quick assign functionality
  const { fetchTasks } = useTaskStore()
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assigningTask, setAssigningTask] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks().then(() => {
      const allTasks = useTaskStore.getState().tasks
      setUnassignedTasks(allTasks.filter(t => !t.assignee_id && t.status !== 'done'))
    })
  }, [fetchTasks])

  const getRecommendations = async (skills: string) => {
    if (!skills.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await client.get(`/workload/recommendations?task_skills=${encodeURIComponent(skills)}`)
      setRecommendations(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    getRecommendations(skillsInput)
  }

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
    if (task.required_skills && task.required_skills.length > 0) {
      const skillsStr = task.required_skills.join(', ')
      setSkillsInput(skillsStr)
      getRecommendations(skillsStr)
    }
  }

  const assignTask = async (taskId: string, assigneeId: string) => {
    setAssigningTask(taskId)
    try {
      await client.patch(`/tasks/${taskId}`, { assignee_id: assigneeId })
      await fetchTasks()
      setUnassignedTasks(useTaskStore.getState().tasks.filter(t => !t.assignee_id && t.status !== 'done'))
      setSelectedTask(null)
    } catch (err) {
      console.error(err)
    } finally {
      setAssigningTask(null)
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Assignment</h1>
        <p className="text-zinc-500 mt-1">ML-powered recommendations based on skill match and availability.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Input & Unassigned Tasks */}
        <div className="space-y-6 flex flex-col min-h-0">
          <Card className="bg-white border-zinc-200 shadow-sm shrink-0">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Crosshair size={16} className="text-zinc-400" /> Skill Requirements
              </h3>
              <form onSubmit={handleSearch} className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    placeholder="e.g. react, python, aws" 
                    className="pl-10 h-12 rounded-xl bg-zinc-50"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-zinc-900 text-white rounded-xl shadow-xl shadow-zinc-900/20" disabled={!skillsInput.trim() || loading}>
                  {loading ? 'Analyzing Team...' : 'Find Best Match'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 mb-4 shrink-0">
              <Zap size={16} className="text-zinc-400" /> Unassigned Tasks ({unassignedTasks.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4">
              {unassignedTasks.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-white text-zinc-400 text-sm">
                  No unassigned tasks.
                </div>
              ) : (
                unassignedTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskSelect(task)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group",
                      selectedTask?.id === task.id 
                        ? "bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-900/10" 
                        : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                    )}
                  >
                    <p className={cn("font-bold text-sm line-clamp-1", selectedTask?.id === task.id ? "text-white" : "text-zinc-900")}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.required_skills?.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="secondary" className={cn(
                          "text-[9px] uppercase tracking-wider px-1.5 py-0",
                          selectedTask?.id === task.id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                        )}>
                          {skill}
                        </Badge>
                      ))}
                      {task.required_skills && task.required_skills.length > 3 && (
                        <span className={cn("text-[10px] font-medium ml-1", selectedTask?.id === task.id ? "text-white/70" : "text-zinc-400")}>
                          +{task.required_skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recommendations */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Brain size={18} className="text-zinc-400" /> Recommendations
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedTask ? `Finding best fit for: ${selectedTask.title}` : 'Enter skills to see team availability and match scores.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!searched ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
                <div className="h-16 w-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
                  <Brain size={24} className="text-zinc-300" />
                </div>
                <p className="text-sm font-medium">Select a task or enter skills to get AI recommendations.</p>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl w-full" />)}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No matching team members found. Try simplifying the required skills.
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                {recommendations.map((rec, index) => {
                  const isTopMatch = index === 0
                  
                  return (
                    <div 
                      key={rec.user_id} 
                      className={cn(
                        "p-5 rounded-2xl border transition-all relative overflow-hidden",
                        isTopMatch ? "bg-emerald-50/30 border-emerald-200 shadow-sm" : "bg-white border-zinc-100"
                      )}
                    >
                      {isTopMatch && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                          Top Match
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm",
                            isTopMatch ? "bg-emerald-600" : "bg-zinc-900"
                          )}>
                            {rec.full_name[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900">{rec.full_name}</h4>
                            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">{rec.reason}</p>
                          </div>
                        </div>
                        
                        {selectedTask && (
                          <Button 
                            onClick={() => assignTask(selectedTask.id, rec.user_id)}
                            disabled={assigningTask === selectedTask.id}
                            className={cn(
                              "h-9 px-4 text-xs font-bold gap-2 shrink-0 rounded-xl",
                              isTopMatch ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-900 text-white"
                            )}
                          >
                            {assigningTask === selectedTask.id ? 'Assigning...' : 'Assign'} 
                            {!assigningTask && <Check size={14} />}
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-5">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                            <span>Match Score</span>
                            <span>{Math.round(rec.combined_score * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${rec.combined_score * 100}%` }} />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                            <span>Skill Coverage</span>
                            <span>{Math.round(rec.skill_match * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rec.skill_match * 100}%` }} />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                            <span>Availability</span>
                            <span>{Math.round(rec.availability * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className={cn(
                              "h-full rounded-full",
                              rec.availability < 0.2 ? "bg-rose-500" : rec.availability < 0.5 ? "bg-amber-400" : "bg-blue-500"
                            )} style={{ width: `${rec.availability * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskAssignment
