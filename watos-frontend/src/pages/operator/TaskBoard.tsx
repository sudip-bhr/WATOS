import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import TaskCard from '@/components/tasks/TaskCard'
import TaskDetails from '@/components/tasks/TaskDetails'
import TaskForm from '@/components/tasks/TaskForm'
import type { Task } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, LayoutGrid, Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { getClusterStyle, getClusterComplexityCategory } from '@/lib/clusters'

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
  const [highlightClusters, setHighlightClusters] = useState(true)
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<number | null>(null)
  const [showClusterFilters, setShowClusterFilters] = useState(true);

  const uniqueClusters = useMemo(() => {
    const set = new Set<number>()
    tasks.forEach(t => {
      if (t.cluster_id !== undefined && t.cluster_id !== null) {
        set.add(t.cluster_id)
      }
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [tasks])

  const isMember = user?.role === 'member'

  // Helper to determine if the current role can drop to a given status column
  const canDropTo = (status: Task['status']): boolean => {
    const role = (user?.role ?? '').toLowerCase()
    console.log('canDropTo check:', { role, status })
    if (role === 'member') {
      // Members may only move tasks to 'in_progress'
      return status === 'in_progress'
    }
    if (role === 'admin') {
      // Admins can move tasks to 'rejected' (Needs Revision)
      if (status === 'rejected') {
        console.log('Admin allowed to drop to Needs Revision')
        return true
      }
      return false
    }
    if (role === 'operator') {
      // Operators can approve tasks
      return status === 'approved'
    }
    return false
  }

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

  const filteredByCluster = selectedClusterFilter !== null
    ? filteredByRole.filter(t => t.cluster_id === selectedClusterFilter)
    : filteredByRole

  const filtered = filteredByCluster.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const forCol = (s: Task['status']) => filtered.filter(t => t.status === s)

  // --- Auto-scroll Logic ---
  const boardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const animationFrameRef = useRef<number | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const handleAutoScroll = () => {
    if (!isDragging || !boardRef.current) return

    const { x } = mousePosRef.current
    const container = boardRef.current
    const rect = container.getBoundingClientRect()
    
    const edgeSize = 150 // Area near edges that triggers scroll
    const maxSpeed = 15 // Max scroll speed
    
    let speed = 0
    
    if (x > rect.right - edgeSize) {
      // Scroll right
      speed = Math.min(maxSpeed, (x - (rect.right - edgeSize)) / 5)
    } else if (x < rect.left + edgeSize) {
      // Scroll left
      speed = -Math.min(maxSpeed, ((rect.left + edgeSize) - x) / 5)
    }
    
    if (speed !== 0) {
      container.scrollLeft += speed
    }

    // --- Manual Column Detection for precise highlighting ---
    const columns = container.querySelectorAll('.group\\/column')
    let foundId: string | null = null
    columns.forEach(colEl => {
      const rect = colEl.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right) {
        foundId = colEl.getAttribute('data-col-id')
      }
    })
    setDragOverColumnId(foundId)
    
    animationFrameRef.current = requestAnimationFrame(handleAutoScroll)
  }

  useEffect(() => {
    if (isDragging) {
      animationFrameRef.current = requestAnimationFrame(handleAutoScroll)
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isDragging])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const onDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const onDragUpdate = useCallback((update: any) => {
    if (update.client?.selection) {
      mousePosRef.current = { x: update.client.selection.x, y: update.client.selection.y }
    }
  }, [])

  const onDragEnd = useCallback(async (result: DropResult) => {
    console.log('DragEnd:', { result });
    setIsDragging(false)
    setDragOverColumnId(null)
    const { destination, draggableId } = result
    if (!destination) return
    const newStatus = destination.droppableId as Task['status']
    const task = tasks.find(t => t.id === draggableId)
    if (!task || task.status === newStatus) return
    
    // Enforce role permissions on drop
    if (!canDropTo(newStatus)) {
      return;
    }

    // Existing member restrictions (additional safety)
    if (user?.role === 'member') {
      if (task?.status === 'review') return; // Cannot move out of review
    }

    // Role-specific fetch and update
    console.log('Admin drop attempt:', { role: user?.role, taskId: draggableId, newStatus });
    try {
      await updateTaskStatus(draggableId, newStatus);
    } catch (e) {
      console.error(e);
    }
    console.log('DragEnd completed for', { taskId: draggableId, newStatus });
  }, [tasks, user, updateTaskStatus, canDropTo])

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
                  : `${tasks.length} total tasks · ${tasks.filter(t => t.status !== 'done').length} active tasks`
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

          <div className="relative flex-1 md:flex-none min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-zinc-200 bg-white/50 backdrop-blur-sm focus:bg-white transition-all duration-300 w-full md:w-48 text-sm focus:ring-4 focus:ring-zinc-900/5"
            />
          </div>

          {/* Highlight toggle switch */}
          {uniqueClusters.length > 0 && (
            <button
              onClick={() => setHighlightClusters(h => !h)}
              className={cn(
                "flex items-center gap-2 h-9 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 cursor-pointer",
                highlightClusters
                  ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-sm"
                  : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              )}
              title="Toggle color highlights for ML workload clusters"
            >
              <Brain size={13} className={cn("transition-transform duration-500 shrink-0", highlightClusters && "rotate-12 scale-110 text-indigo-500")} />
              <span className="hidden sm:inline">Highlight Clusters: {highlightClusters ? 'ON' : 'OFF'}</span>
              <span className="sm:hidden">Clusters: {highlightClusters ? 'ON' : 'OFF'}</span>
            </button>
          )}

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

      {/* Interactive Cluster Legend Bar */}
      {uniqueClusters.length > 0 && (
        <div className="border-b border-zinc-200/40 bg-white/40 backdrop-blur-md shrink-0 relative z-20">

          {/* Header */}
          <div className="px-4 md:px-8 py-3 flex items-center justify-between">
            <button
              type="button"
              aria-expanded={showClusterFilters}
              aria-controls="cluster-filters"
              onClick={() => setShowClusterFilters(v => !v)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Brain size={12} className="text-indigo-500" />

              Cluster Filters

              {showClusterFilters ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )}
            </button>

            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              {uniqueClusters.length} Clusters
            </span>
          </div>

          {/* Animated Filter List */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showClusterFilters
                ? "max-h-[500px] opacity-100"
                : "max-h-0 opacity-0"
            )}
          >
            <div className="px-4 md:px-8 pb-3 flex flex-wrap items-center gap-2.5">

              {/* All Clusters */}
              <button
                onClick={() => setSelectedClusterFilter(null)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border",
                  selectedClusterFilter === null
                    ? "bg-zinc-900 text-white border-zinc-950 shadow-md shadow-zinc-900/15"
                    : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300"
                )}
              >
                All Clusters ({tasks.filter(t => t.cluster_id !== undefined && t.cluster_id !== null).length})

              {uniqueClusters.map((cid) => {
                const style = getClusterStyle(cid);
                const isSelected = selectedClusterFilter === cid;
                const clusterTasks = tasks.filter(
                  (t) => t.cluster_id === cid
                );
                const count = clusterTasks.length;
                const complexityCategory =
                  getClusterComplexityCategory(clusterTasks);

                return (
                  <button
                    key={cid}
                    onClick={() =>
                      setSelectedClusterFilter(
                        isSelected ? null : cid
                      )
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border cursor-pointer",
                      isSelected
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "bg-white/50 text-zinc-500 border-zinc-200 hover:bg-white hover:border-zinc-300 hover:text-zinc-900 hover:shadow-md hover:-translate-y-0.5"
                    )}
                    style={
                      isSelected
                        ? {
                            borderColor: style.fill,
                            boxShadow: `0 0 0 2px ${style.fill}20`,
                          }
                        : {}
                    }
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        style.accent
                      )}
                    />

                    <span>{style.name}</span>

                    <span className="text-[8px] font-normal text-zinc-400 normal-case">
                      ({complexityCategory})
                    </span>

                    <span className="bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded-md font-mono text-[8px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Board Background & Texture */}
      <DragDropContext onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd}>
        <div 
          ref={boardRef}
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar board-bg"
        >
          <div className="noise-texture" />
          
          {loading ? (
            <div className="flex gap-6 md:gap-8 relative z-10 px-4 md:px-8 py-6">
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
            <div className="flex gap-6 md:gap-8 h-full relative z-10 px-4 md:px-8 py-6">
              {displayColumns.map(col => (
                <div key={col.id} data-col-id={col.id} className="w-[300px] md:w-80 shrink-0 flex flex-col group/column">
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
                      <h3 className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                        dragOverColumnId === col.id ? "text-zinc-900 scale-110 origin-left translate-x-1" : "text-zinc-400 group-hover/column:text-zinc-600"
                      )}>
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
                  <Droppable droppableId={col.id} isDropDisabled={!canDropTo(col.id)}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 glass-panel rounded-[2.5rem] p-3 overflow-y-auto custom-scrollbar transition-all duration-500 border border-transparent',
                          dragOverColumnId === col.id 
                            ? 'bg-white ring-4 ring-zinc-900/5 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] scale-[1.01] border-zinc-200/50' 
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
                              <TaskCard task={task} index={index} highlightClusters={highlightClusters} />
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
          )}
        </div>
      </DragDropContext>

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
