import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FolderKanban, Plus, Trash2, Pencil, X, Check, BarChart3,
  ChevronRight, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getProjects, createProject, updateProject, deleteProject, getProjectTasks, type Project } from '@/api/projects'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'

interface ProjectWithStats extends Project {
  total?: number
  done?: number
  completion_pct?: number
  avg_delay_prob?: number
  loading_stats?: boolean
}

const Projects = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canEdit = user?.role === 'admin' || user?.role === 'operator'

  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)

  // New project dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const data = await getProjects()
      setProjects(data.map(p => ({ ...p, loading_stats: true })))
      // Load stats for each project asynchronously
      data.forEach(async (p) => {
        try {
          const s = await getProjectTasks(p.id)
          setProjects(prev =>
            prev.map(ep =>
              ep.id === p.id
                ? { ...ep, ...s.summary, loading_stats: false }
                : ep
            )
          )
        } catch {
          setProjects(prev =>
            prev.map(ep => ep.id === p.id ? { ...ep, loading_stats: false } : ep)
          )
        }
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const p = await createProject({ name: newName.trim(), description: newDesc.trim() || undefined })
      setProjects(prev => [{ ...p, loading_stats: false }, ...prev])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } catch (e) { console.error(e) }
    finally { setCreating(false) }
  }

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return
    try {
      const updated = await updateProject(id, { name: editName.trim() })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p))
    } catch (e) { console.error(e) }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? Tasks will remain but lose their project link.')) return
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) { console.error(e) }
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-zinc-500 mt-1">Manage initiatives and track ML-assessed delivery risk.</p>
        </div>
        {canEdit && (
          <Button
            className="gap-2 bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} /> New Project
          </Button>
        )}
      </div>

      {/* Create Project Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-2xl p-8 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">New Project</h2>
              <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center">
                <X size={15} className="text-zinc-400" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Project name *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="rounded-xl border-zinc-200"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <Input
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="rounded-xl border-zinc-200"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 bg-zinc-900 text-white font-bold rounded-xl"
              >
                {creating ? 'Creating…' : 'Create Project'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl border-zinc-200">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
          <div className="h-20 w-20 rounded-3xl bg-zinc-100 flex items-center justify-center">
            <FolderKanban size={36} className="text-zinc-300" />
          </div>
          <div>
            <p className="text-lg font-black text-zinc-300 uppercase tracking-widest">No Projects</p>
            <p className="text-sm text-zinc-400 mt-1">Create your first project to group and track tasks.</p>
          </div>
          {canEdit && (
            <Button onClick={() => setShowCreate(true)} className="gap-2 mt-2">
              <Plus size={14} /> New Project
            </Button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className="h-7 w-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center"
                      >
                        <Pencil size={12} className="text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
                    {/* Completion Bar */}
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

                    {/* Stats Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <Clock size={10} />
                        <span>{p.done ?? 0} / {p.total ?? 0} tasks done</span>
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
                      <BarChart3 size={13} /> Project Details
                    </div>
                    <ChevronRight size={14} className="text-zinc-300 group-hover/btn:text-zinc-600 transition-colors" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

export default Projects
