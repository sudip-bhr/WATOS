import { useState, useEffect } from 'react'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { 
  FolderKanban, Plus, Trash2, Pencil, X, Check, BarChart3,
  ChevronRight, Clock, AlertTriangle, CheckCircle2, ListPlus, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getProjects, createProject, updateProject, deleteProject, getProjectTasks, type Project } from '@/api/projects'
import { createTask } from '@/api/tasks'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import client from '@/api/client'
import type { User as UserType } from '@/types'

interface ProjectWithStats extends Project {
  total?: number
  done?: number
  completion_pct?: number
  avg_delay_prob?: number
  loading_stats?: boolean
}

interface InlineTask {
  id: string
  title: string
  complexity: number
  effort_hours: number
  deadline: string
  assignee_ids: string[]
}

const Projects = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'admin' || user?.role === 'operator'

  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<UserType[]>([])

  // New project dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [inlineTasks, setInlineTasks] = useState<InlineTask[]>([])

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)


  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const data = await getProjects()
        if (!ignore) {
          setProjects(data.map(p => ({ ...p, loading_stats: true })))
          // Fire off detail fetches
          data.forEach(async (p) => {
            try {
              const s = await getProjectTasks(p.id)
              if (!ignore) {
                setProjects(prev => prev.map(ep => ep.id === p.id ? { ...ep, ...s.summary, loading_stats: false } : ep))
              }
            } catch {
              if (!ignore) {
                setProjects(prev => prev.map(ep => ep.id === p.id ? { ...ep, loading_stats: false } : ep))
              }
            }
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!ignore) setLoading(false)
      }

      // Also fetch members
      try {
        const r = await client.get('/users/')
        if (!ignore) {
          const users: UserType[] = r.data
          setMembers(users.filter(u => u.role === 'member' && u.is_active))
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const addInlineTask = () => {
    setInlineTasks(prev => [...prev, {
      id: crypto.randomUUID(),
      title: '',
      complexity: 1,
      effort_hours: 8,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      assignee_ids: [],
    }])
  }

  const updateInlineTask = (id: string, field: keyof InlineTask, value: string | number | string[]) => {
    setInlineTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const removeInlineTask = (id: string) => {
    setInlineTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject({ name: newName.trim(), description: newDesc.trim() || undefined })

      // Create tasks for this project
      const validTasks = inlineTasks.filter(t => t.title.trim())
      for (const task of validTasks) {
        const assignees = task.assignee_ids.length > 0 ? task.assignee_ids : [undefined]
        for (const aid of assignees) {
          await createTask({
            title: task.title.trim(),
            project_id: project.id,
            complexity: task.complexity,
            effort_hours: task.effort_hours,
            deadline: task.deadline,
            assignee_id: aid,
            status: 'todo',
          })
        }
      }

      toast({
        title: 'Project created',
        description: `"${project.name}" created with ${validTasks.length} task${validTasks.length !== 1 ? 's' : ''}.`,
      })

      setProjects(prev => [{ ...project, total: validTasks.length, done: 0, completion_pct: 0, avg_delay_prob: 0, loading_stats: false }, ...prev])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      setInlineTasks([])
    } catch (e: unknown) {
      const axiosError = e as AxiosError<{ detail?: string }>
      toast({ title: 'Error', description: axiosError.response?.data?.detail || 'Failed to create project.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return
    try {
      const updated = await updateProject(id, { name: editName.trim() })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p))
    } catch (e) { console.error(e) }
    setEditingId(null)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await deleteProject(deletingId)
      setProjects(prev => prev.filter(p => p.id !== deletingId))
      toast({ title: 'Project Deleted', description: 'The project was successfully removed.' })
    } catch (e) { console.error(e) }
    setDeletingId(null)
  }

  const getRiskColor = (prob: number) => {
    if (prob > 0.6) return 'text-rose-500'
    if (prob > 0.35) return 'text-amber-500'
    return 'text-emerald-500'
  }

  const getRiskLabel = (prob: number) => {
    if (prob > 0.6) return 'High Risk'
    if (prob > 0.35) return 'Moderate'
    return 'On Track'
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm md:text-base text-zinc-500 mt-1">Create projects, define tasks and assign members.</p>
        </div>
        {canEdit && (
          <Button
            className="w-full md:w-auto gap-2 bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} /> New Project
          </Button>
        )}
      </div>

      {/* ── Enhanced Create Project Dialog ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-none md:rounded-3xl border-t md:border border-zinc-100 shadow-2xl w-full max-w-2xl h-full md:h-auto max-h-screen md:max-h-[85vh] overflow-y-auto">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-black tracking-tight">Create New Project</h2>
                  <p className="text-[10px] md:text-xs text-zinc-400 mt-1">Define your project scope — add tasks and assign members.</p>
                </div>
                <button onClick={() => { setShowCreate(false); setInlineTasks([]) }} className="h-8 w-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center">
                  <X size={15} className="text-zinc-400" />
                </button>
              </div>

              {/* Project Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project Name *</Label>
                  <Input
                    placeholder="e.g. Sprint 12 – Authentication Module"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="rounded-xl border-zinc-200 h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Description</Label>
                  <textarea
                    placeholder="Brief project description…"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Inline Tasks */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm">Project Tasks</h3>
                    <p className="text-[10px] md:text-[11px] text-zinc-400">Define tasks now or add them later.</p>
                  </div>
                  <button
                    onClick={addInlineTask}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    <ListPlus size={12} /> Add Task
                  </button>
                </div>

                <AnimatePresence>
                  {inlineTasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Task {idx + 1}</span>
                        <button onClick={() => removeInlineTask(task.id)} className="text-zinc-300 hover:text-rose-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>

                      <Input
                        placeholder="Task title *"
                        value={task.title}
                        onChange={e => updateInlineTask(task.id, 'title', e.target.value)}
                        className="rounded-xl border-zinc-200 bg-white h-10"
                      />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-400">Complexity</Label>
                          <Input
                            type="number"
                            min={1} max={5} step={0.5}
                            value={task.complexity}
                            onChange={e => updateInlineTask(task.id, 'complexity', parseFloat(e.target.value) || 1)}
                            className="rounded-lg border-zinc-200 bg-white h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-zinc-400">Effort (hrs)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={task.effort_hours}
                            onChange={e => updateInlineTask(task.id, 'effort_hours', parseFloat(e.target.value) || 1)}
                            className="rounded-lg border-zinc-200 bg-white h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-2">
                          <Label className="text-[10px] text-zinc-400">Deadline</Label>
                          <Input
                            type="date"
                            value={task.deadline}
                            onChange={e => updateInlineTask(task.id, 'deadline', e.target.value)}
                            className="rounded-lg border-zinc-200 bg-white h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-4 mt-2">
                          <Label className="text-[10px] text-zinc-400 flex items-center gap-1"><User size={9} /> Assign Members</Label>
                          <div className="flex flex-wrap gap-2">
                            {members.map(m => {
                              const isSelected = task.assignee_ids.includes(m.id)
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    const next = isSelected 
                                      ? task.assignee_ids.filter(id => id !== m.id)
                                      : [...task.assignee_ids, m.id]
                                    updateInlineTask(task.id, 'assignee_ids', next)
                                  }}
                                  className={cn(
                                    "px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
                                    isSelected 
                                      ? "bg-zinc-900 border-zinc-900 text-white" 
                                      : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                                  )}
                                >
                                  {m.full_name.split(' ')[0]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {inlineTasks.length === 0 && (
                  <div className="p-6 border-2 border-dashed border-zinc-100 rounded-2xl text-center">
                    <p className="text-xs text-zinc-400">No tasks added yet. Click "Add Task" to define the project scope.</p>
                  </div>
                )}
              </div>

              {/* Summary + Submit */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-100">
                <div className="flex-1 text-[10px] md:text-xs text-zinc-400 font-medium text-center sm:text-left">
                  {inlineTasks.filter(t => t.title.trim()).reduce((acc, t) => acc + (t.assignee_ids.length > 0 ? t.assignee_ids.length : 1), 0)} task(s) will be created
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => { setShowCreate(false); setInlineTasks([]) }} className="flex-1 sm:flex-none rounded-xl border-zinc-200">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="flex-1 sm:flex-none bg-zinc-900 text-white font-bold rounded-xl px-6 shadow-lg shadow-zinc-900/10"
                  >
                    {creating ? 'Creating…' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-5 text-center px-4">
          <div className="h-20 w-20 rounded-3xl bg-zinc-100 flex items-center justify-center">
            <FolderKanban size={36} className="text-zinc-300" />
          </div>
          <div>
            <p className="text-base md:text-lg font-black text-zinc-300 uppercase tracking-widest">No Projects Found</p>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-[240px] mx-auto">Create your first project to group and track tasks.</p>
          </div>
          {canEdit && (
            <Button onClick={() => setShowCreate(true)} className="gap-2 mt-2 rounded-xl">
              <Plus size={14} /> New Project
            </Button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {projects.map(p => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group bg-white rounded-3xl border border-zinc-100 p-6 space-y-5 shadow-sm hover:shadow-xl hover:border-zinc-200 transition-all duration-300 flex flex-col"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 text-sm font-bold rounded-lg border-zinc-200"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(p.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button onClick={() => handleEditSave(p.id)} className="text-emerald-500 hover:text-emerald-600">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-zinc-600">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-black text-zinc-900 tracking-tight truncate text-base">{p.name}</h3>
                    )}
                    {p.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{p.description}</p>
                    )}
                  </div>
                  {canEdit && editingId !== p.id && (
                    <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className="h-7 w-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center"
                      >
                        <Pencil size={12} className="text-zinc-400" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingId(p.id) }}
                        className="h-7 w-7 rounded-lg hover:bg-rose-50 flex items-center justify-center"
                      >
                        <Trash2 size={12} className="text-rose-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                {p.loading_stats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full rounded-full" />
                    <Skeleton className="h-3 w-2/3 rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Completion</span>
                        <span>{p.completion_pct ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 rounded-full transition-all duration-700"
                          style={{ width: `${p.completion_pct ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <Clock size={10} />
                        <span>{p.done ?? 0} / {p.total ?? 0} tasks</span>
                      </div>
                      {(p.total ?? 0) > 0 && (
                        <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-wide", getRiskColor(p.avg_delay_prob ?? 0))}>
                          <AlertTriangle size={10} />
                          {getRiskLabel(p.avg_delay_prob ?? 0)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="pt-2 mt-auto">
                  <button
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 transition-colors group/btn"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 group-hover/btn:text-zinc-900">
                      <BarChart3 size={13} /> Details
                    </div>
                    <ChevronRight size={14} className="text-zinc-300 group-hover/btn:text-zinc-600 transition-colors" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-rose-100">
            <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-lg md:text-xl font-black text-center mb-2">Delete Project?</h2>
            <p className="text-xs md:text-sm text-zinc-500 text-center mb-8 leading-relaxed">
              Are you sure? Tasks will remain but lose their project link. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white" onClick={confirmDelete}>Delete</Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}

export default Projects
