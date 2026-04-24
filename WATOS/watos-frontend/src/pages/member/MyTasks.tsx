import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd'
import TaskCard from '@/components/tasks/TaskCard'
import TaskDetails from '@/components/tasks/TaskDetails'
import type { Task } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'bg-zinc-100 text-zinc-600' },
  { id: 'in_progress', label: 'In Progress',  color: 'bg-blue-50 text-blue-600' },
  { id: 'review',      label: 'In Review',    color: 'bg-amber-50 text-amber-600' },
  { id: 'done',        label: 'Done',         color: 'bg-emerald-50 text-emerald-600' },
]

const MyTasks = () => {
  const { user } = useAuthStore()
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTaskStore()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'high_risk'>('all')

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const myTasks = tasks.filter(t => t.assignee_id === user?.id)
  const filtered = filter === 'high_risk' ? myTasks.filter(t => t.delay_prob > 0.5) : myTasks
  const forCol = (s: Task['status']) => filtered.filter(t => t.status === s)

  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result
    if (!destination) return
    const newStatus = destination.droppableId as Task['status']
    const task = myTasks.find(t => t.id === draggableId)
    if (!task || task.status === newStatus) return
    await updateTaskStatus(draggableId, newStatus)
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <CheckSquare size={22} className="text-zinc-400" /> My Tasks
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-0.5">{myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-2xl">
          {(['all', 'high_risk'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              )}>
              {f === 'all' ? 'All Tasks' : '⚠ High Risk'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
        {loading ? (
          <div className="flex gap-6">
            {COLUMNS.map(c => <div key={c.id} className="w-80 shrink-0 space-y-3"><Skeleton className="h-8 w-32 rounded-xl" />{[1,2].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>)}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full">
              {COLUMNS.map(col => (
                <div key={col.id} className="w-80 shrink-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest', col.color)}>{col.label}</span>
                    <span className="text-[10px] font-black text-zinc-300">{forCol(col.id).length}</span>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={cn('flex-1 rounded-3xl p-2 transition-colors overflow-y-auto',
                          snapshot.isDraggingOver ? 'bg-zinc-100/80' : 'bg-zinc-50/50'
                        )}>
                        {forCol(col.id).length === 0 ? (
                          <div className="flex items-center justify-center h-24 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
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
    </div>
  )
}

export default MyTasks
