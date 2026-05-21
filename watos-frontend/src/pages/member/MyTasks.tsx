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
  { id: 'review',      label: 'In Review',    color: 'bg-indigo-50 text-indigo-600' },
  { id: 'rejected',    label: 'Needs Revision', color: 'bg-rose-50 text-rose-600' },
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
    
    if (task.status === 'review') return // Cannot move out of review
    
    if (newStatus === 'todo' || newStatus === 'approved' || newStatus === 'rejected') {
      return // Members cannot move to these states
    }

    try {
      await updateTaskStatus(draggableId, newStatus)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      <div className="px-4 md:px-8 py-6 bg-white border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <CheckSquare size={22} className="text-indigo-500" /> My Workload
          </h1>
          <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">
            {myTasks.length} total tasks assigned
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100 rounded-2xl w-fit">
          {(['all', 'high_risk'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                filter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              )}>
              {f === 'all' ? 'All Items' : 'High Risk'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex gap-6">
            {COLUMNS.map(c => <div key={c.id} className="w-72 md:w-80 shrink-0 space-y-4"><Skeleton className="h-10 w-32 rounded-xl" />{[1,2].map(i => <Skeleton key={i} className="h-48 rounded-4xl" />)}</div>)}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full min-h-[calc(100vh-250px)] pb-8">
              {COLUMNS.map(col => (
                <div key={col.id} className="w-72 md:w-80 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', col.color.split(' ')[0])} />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded-lg text-[10px] font-black">{forCol(col.id).length}</span>
                  </div>
                  <Droppable droppableId={col.id} isDropDisabled={col.id === 'review' || col.id === 'rejected'}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={cn('flex-1 rounded-[2.5rem] p-3 transition-all duration-500 overflow-y-auto custom-scrollbar border-2 border-dashed',
                          snapshot.isDraggingOver ? 'bg-indigo-50/50 border-indigo-200' : 'bg-transparent border-transparent'
                        )}>
                        {forCol(col.id).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-40 text-[10px] font-black text-zinc-300 uppercase tracking-widest text-center px-6">
                            <div className="mb-2 opacity-20">
                              <CheckSquare size={32} />
                            </div>
                            {col.id === 'review' || col.id === 'rejected' ? 'Queue Empty' : snapshot.isDraggingOver ? 'Drop here' : 'No tasks'}
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
