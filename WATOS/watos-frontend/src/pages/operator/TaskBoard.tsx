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
import { Plus, Search, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLUMNS: { id: Task['status']; label: string; accent: string }[] = [
  { id: 'todo',        label: 'To Do',       accent: 'bg-zinc-100 text-zinc-600' },
  { id: 'in_progress', label: 'In Progress',  accent: 'bg-blue-50 text-blue-600' },
  { id: 'review',      label: 'Review',      accent: 'bg-amber-50 text-amber-600' },
  { id: 'approved',    label: 'Approved',    accent: 'bg-violet-50 text-violet-600' },
  { id: 'done',        label: 'Done',        accent: 'bg-emerald-50 text-emerald-600' },
  { id: 'blocked',     label: 'Blocked',     accent: 'bg-rose-50 text-rose-600' },
]

const TaskBoard = () => {
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTaskStore()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const forCol = (s: Task['status']) => filtered.filter(t => t.status === s)

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStatus = destination.droppableId as Task['status']
    const task = tasks.find(t => t.id === draggableId)
    if (!task || task.status === newStatus) return
    await updateTaskStatus(draggableId, newStatus)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 border-b border-zinc-100 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 mr-auto">
          <LayoutGrid size={20} className="text-zinc-400" />
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900">Task Board</h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">{tasks.length} total · {tasks.filter(t => t.status !== 'done').length} active</p>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl border-zinc-200 w-56 text-sm"
          />
        </div>

        <Button
          onClick={() => setShowForm(true)}
          className="gap-2 h-9 px-4 rounded-xl bg-zinc-900 text-white font-bold text-xs shadow-lg shadow-zinc-900/20"
        >
          <Plus size={14} /> New Task
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
        {loading ? (
          <div className="flex gap-5">
            {COLUMNS.map(c => (
              <div key={c.id} className="w-72 shrink-0 space-y-3">
                <Skeleton className="h-7 w-28 rounded-xl" />
                {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full">
              {COLUMNS.map(col => (
                <div key={col.id} className="w-72 shrink-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest', col.accent)}>
                      {col.label}
                    </span>
                    <span className="text-[10px] font-black text-zinc-300">{forCol(col.id).length}</span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'flex-1 rounded-3xl p-2 overflow-y-auto transition-colors',
                          snapshot.isDraggingOver ? 'bg-zinc-100/80 ring-2 ring-zinc-200' : 'bg-zinc-50/40'
                        )}
                      >
                        {forCol(col.id).length === 0 ? (
                          <div className="flex items-center justify-center h-16 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                            {snapshot.isDraggingOver ? 'Drop here' : 'Empty'}
                          </div>
                        ) : forCol(col.id).map((task, index) => (
                          <div key={task.id} onClick={() => setSelectedTask(task)}>
                            <TaskCard task={task} index={index} />
                          </div>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <TaskDetails task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />

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
