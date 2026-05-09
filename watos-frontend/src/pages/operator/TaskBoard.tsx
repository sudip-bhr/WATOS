import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import TaskCard from '@/components/tasks/TaskCard'
import TaskDetails from '@/components/tasks/TaskDetails'
import TaskForm from '@/components/tasks/TaskForm'
import type { Task } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, LayoutGrid, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const COLUMNS: { id: Task['status']; label: string; accent: string }[] = [
  { id: 'todo',        label: 'To Do',          accent: 'bg-zinc-100 text-zinc-600' },
  { id: 'in_progress', label: 'In Progress',     accent: 'bg-blue-50 text-blue-600' },
  { id: 'rejected',    label: 'Needs Revision',  accent: 'bg-rose-50 text-rose-600' },
  { id: 'review',      label: 'In Review',       accent: 'bg-amber-50 text-amber-600' },
  { id: 'approved',    label: 'Approved',        accent: 'bg-violet-50 text-violet-600' },
  { id: 'done',        label: 'Done',            accent: 'bg-emerald-50 text-emerald-600' },
  { id: 'blocked',     label: 'Blocked',         accent: 'bg-rose-100 text-rose-700' },
]

// Member-visible columns: only what is actionable for them
const MEMBER_COLUMNS = ['todo', 'in_progress', 'rejected', 'review']

const TaskBoard = () => {
  const { user } = useAuthStore()
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTaskStore()

  // Store task ID and resolve live from store — prevents stale prop issues on review panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const isMember = user?.role === 'member'

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Resolve live task from store (critical: operator review panel sees correct status)
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) ?? null : null

  const displayColumns = isMember
    ? COLUMNS.filter(c => MEMBER_COLUMNS.includes(c.id))
    : COLUMNS

  // Members only see their own tasks in actionable columns
  const filteredByRole = isMember
    ? tasks.filter(t => t.assignee_id === user?.id && MEMBER_COLUMNS.includes(t.status))
    : tasks

  const filtered = filteredByRole.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const forCol = (s: Task['status']) => filtered.filter(t => t.status === s)

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStatus = destination.droppableId as Task['status']
    const task = tasks.find(t => t.id === draggableId)
    if (!task || task.status === newStatus) return
    
    if (isMember) {
      if (task.status === 'review') return // Cannot move out of review
      if (newStatus === 'todo' || newStatus === 'approved' || newStatus === 'rejected') {
        return // Members cannot move to these states
      }
    }

    try {
      await updateTaskStatus(draggableId, newStatus)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-8 py-5 border-b border-zinc-200/50 bg-white/40 backdrop-blur-xl flex flex-col md:flex-row md:items-center gap-4 shrink-0 relative z-30">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/10">
              <LayoutGrid size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-zinc-900">Task Board</h1>
              <p className="text-[10px] md:text-xs text-zinc-400 font-medium mt-0.5">
                {isMember
                  ? 'Your tasks'
                  : `${tasks.length} total · ${tasks.filter(t => t.status !== 'done').length} active`
                }
              </p>
            </div>
          </div>

          {/* New Task button for mobile (only if not member) */}
          {!isMember && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="md:hidden h-9 w-9 p-0 rounded-xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/10"
            >
              <Plus size={18} />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:ml-auto">
          {isMember && (
            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white/50 backdrop-blur-sm border border-zinc-200 rounded-xl px-2 md:px-3 py-1.5 md:py-2">
              <Lock size={10} />
              <span>Submit via card</span>
            </div>
          )}

          <div className="relative flex-1 md:flex-none min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-zinc-200 bg-white/50 backdrop-blur-sm focus:bg-white transition-all duration-300 w-full md:w-48 text-sm focus:ring-4 focus:ring-zinc-900/5"
            />
          </div>

          {/* Desktop New Task button */}
          {!isMember && (
            <Button
              onClick={() => setShowForm(true)}
              className="hidden md:flex gap-2 h-9 px-4 rounded-xl bg-zinc-900 text-white font-bold text-xs shadow-xl shadow-zinc-900/20 hover:shadow-2xl hover:shadow-zinc-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
            >
              <Plus size={14} /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Board Background & Texture */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 py-6 custom-scrollbar board-bg">
        <div className="noise-texture" />
        
        {loading ? (
          <div className="flex gap-6 md:gap-8 relative z-10">
            {displayColumns.map(c => (
              <div key={c.id} className="w-[300px] md:w-80 shrink-0 space-y-4">
                <div className="px-2">
                  <Skeleton className="h-6 w-32 rounded-lg opacity-40" />
                </div>
                <Skeleton className="h-[calc(100vh-280px)] rounded-[2.5rem] opacity-20" />
              </div>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 md:gap-8 h-full relative z-10">
              {displayColumns.map(col => (
                <div key={col.id} className="w-[300px] md:w-80 shrink-0 flex flex-col group/column">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full ring-4 ring-white/20 shadow-sm',
                        col.id === 'todo' ? 'bg-zinc-400' :
                        col.id === 'in_progress' ? 'bg-blue-400' :
                        col.id === 'rejected' ? 'bg-rose-400' :
                        col.id === 'review' ? 'bg-amber-400' :
                        col.id === 'approved' ? 'bg-violet-400' :
                        col.id === 'done' ? 'bg-emerald-400' : 'bg-zinc-400'
                      )} />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover/column:text-zinc-600 transition-colors duration-300">
                        {col.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/40 border border-white/60 text-zinc-400 group-hover/column:bg-white group-hover/column:text-zinc-500 transition-all duration-300 shadow-sm">
                        {forCol(col.id).length}
                      </span>
                    </div>
                  </div>

                  {/* Droppable Column Area */}
                  <Droppable droppableId={col.id} isDropDisabled={isMember}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 glass-panel rounded-[2.5rem] p-3 overflow-y-auto custom-scrollbar transition-all duration-500',
                          snapshot.isDraggingOver 
                            ? 'bg-white/60 ring-1 ring-zinc-200/50 shadow-2xl scale-[1.02]' 
                            : 'hover:bg-white/45'
                        )}
                      >
                        <div className="space-y-3 pb-4">
                          {forCol(col.id).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-[10px] font-black text-zinc-300 uppercase tracking-widest gap-2">
                              <div className="w-8 h-8 rounded-2xl border-2 border-dashed border-zinc-100 flex items-center justify-center">
                                <Plus size={12} className="opacity-20" />
                              </div>
                              {snapshot.isDraggingOver ? 'Drop to assign' : 'No tasks'}
                            </div>
                          ) : forCol(col.id).map((task, index) => (
                            <div 
                              key={task.id} 
                              onClick={() => setSelectedTaskId(task.id)}
                              className="transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <TaskCard task={task} index={index} />
                            </div>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Live task lookup ensures operator review panel sees fresh status */}
      <TaskDetails task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTaskId(null)} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black tracking-tight mb-6">Create Task</h2>
            <TaskForm onSuccess={() => { setShowForm(false); fetchTasks() }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskBoard
