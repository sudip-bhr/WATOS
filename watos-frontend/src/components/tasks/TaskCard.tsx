import { useState, useMemo } from 'react'
import { AxiosError } from 'axios'
import { Draggable } from '@hello-pangea/dnd'
import type { Task } from '@/types'
import { Badge } from '../ui/badge'
import { Calendar, AlertTriangle, Clock, Shield, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'

interface TaskCardProps {
  task: Task
  index: number
}

const TaskCard = ({ task, index }: TaskCardProps) => {
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const isMember = user?.role === 'member'

  const getDelayVariant = (prob: number) => {
    if (prob > 0.6) return 'destructive'
    if (prob > 0.3) return 'secondary'
    return 'outline'
  }

  const isHighRisk = task.delay_prob > 0.6

  // Capture "now" at mount time to keep render pure
  const [now] = useState(() => Date.now())

  // SLA badge computation
  const slaTag = useMemo(() => {
    if (!task.sla_hours) return null
    const created = new Date(task.created_at)
    const slaDeadline = new Date(created.getTime() + task.sla_hours * 3600000)
    const remainingHrs = (slaDeadline.getTime() - now) / 3600000
    const breached = remainingHrs < 0

    if (breached) return { label: `SLA L${task.escalation_level}`, color: 'bg-rose-500 text-white' }
    if (remainingHrs < 2) return { label: `${remainingHrs.toFixed(0)}h SLA`, color: 'bg-amber-100 text-amber-800' }
    return { label: `${Math.round(remainingHrs)}h SLA`, color: 'bg-emerald-50 text-emerald-700' }
  }, [task.sla_hours, task.created_at, task.escalation_level, now])

  const handleSubmitReview = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await useTaskStore.getState().updateTaskStatus(task.id, 'review')
      await useTaskStore.getState().fetchTasks()
      toast({ title: 'Submitted for review', description: `"${task.title}" sent to your operator for review.` })
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      const detail = axiosError.response?.data?.detail || 'Could not submit task for review.'
      toast({ title: 'Submission failed', description: detail, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const showSubmitButton = isMember && (task.status === 'in_progress' || task.status === 'rejected')

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isMember && task.status === 'review'}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-5 transition-all duration-500 outline-hidden",
            snapshot.isDragging && "z-50"
          )}
        >
          <div className={cn(
            "group bg-white/70 backdrop-blur-md rounded-[2.2rem] border border-zinc-100 transition-all duration-500 cursor-pointer overflow-hidden relative active:scale-95",
            snapshot.isDragging ? "shadow-4xl border-zinc-900/10 scale-105 -rotate-2" : "hover:shadow-2xl hover:shadow-zinc-200/50 hover:border-zinc-200 hover:-translate-y-1"
          )}>
            {/* Top Intensity Bar for High Risk */}
            {isHighRisk && (
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900 animate-pulse" />
            )}

            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start gap-4">
                <h4 className="font-black text-sm leading-snug text-zinc-900 tracking-tight transition-all group-hover:text-zinc-950">
                  {task.title}
                </h4>
                <div className="shrink-0 bg-zinc-900 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-sm">
                  C.{task.complexity.toFixed(1)}
                </div>
              </div>

              {task.status === 'rejected' && task.rejection_note && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 font-medium leading-relaxed">
                  <span className="font-black uppercase tracking-widest text-[9px] text-rose-500 block mb-1">Rejection Note</span>
                  {task.rejection_note}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                {task.delay_prob > 0 && (
                  <Badge 
                    variant={getDelayVariant(task.delay_prob)} 
                    className={cn(
                      "text-[9px] uppercase font-black py-0.5 h-6 px-3 tracking-widest rounded-full border-none",
                      task.delay_prob > 0.6 ? "bg-zinc-900 text-white" : 
                      task.delay_prob > 0.3 ? "bg-zinc-100 text-zinc-900" : "bg-transparent border border-zinc-100"
                    )}
                  >
                    <AlertTriangle className={cn("mr-1.5 h-3 w-3", task.delay_prob > 0.6 ? "text-emerald-400" : "text-zinc-400")} />
                    {Math.round(task.delay_prob * 100)}% Risk
                  </Badge>
                )}
                <div className="inline-flex items-center text-[9px] h-6 px-3 bg-zinc-50 border border-zinc-100/50 text-zinc-400 rounded-full font-bold uppercase tracking-widest group-hover:border-zinc-200 transition-colors">
                  <Clock className="mr-1.5 h-3 w-3" />
                  {task.predicted_hours?.toFixed(1) ?? '—'}H
                </div>

                {/* SLA Badge */}
                {slaTag && (
                  <div className={cn(
                    "inline-flex items-center text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest",
                    slaTag.color
                  )}>
                    <Shield className="mr-1 h-3 w-3" />
                    {slaTag.label}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                <div className="flex items-center text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em] group-hover:text-zinc-500 transition-colors">
                  <Calendar className="mr-2 h-3.5 w-3.5 opacity-50" />
                  {format(new Date(task.deadline), 'MMM dd')}
                </div>
                
                <div className="flex items-center gap-2">
                   {showSubmitButton ? (
                     <button 
                       onClick={handleSubmitReview}
                       disabled={submitting}
                       className={cn(
                         "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 relative shadow-sm",
                         submitting
                           ? "bg-zinc-100 text-zinc-400 cursor-wait"
                           : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                       )}
                     >
                       {submitting ? (
                         <span className="flex items-center gap-1.5">
                           <Loader2 size={10} className="animate-spin" /> Sending…
                         </span>
                       ) : 'Submit Review'}
                     </button>
                   ) : (
                     <div className="h-8 w-8 rounded-xl border border-zinc-100 bg-white shadow-sm flex items-center justify-center text-[10px] font-black text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all duration-500">
                       {task.assignee_id ? task.assignee_id[0].toUpperCase() : '?'}
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default TaskCard
