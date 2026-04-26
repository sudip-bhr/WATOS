import { useState, useEffect, useRef } from 'react'
import type { Task } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet'
import { Badge } from '../ui/badge'
import { Brain, Calendar, Info, Clock, BarChart3, Zap, Plus, Trash2, CheckCircle2, Circle, ListChecks, Shield, MessageSquare, Paperclip, Send, Eye, EyeOff, FileText, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from '@/api/subtasks'
import type { Subtask } from '@/api/subtasks'
import { getComments, createComment, getAttachments, uploadAttachment, watchTask, unwatchTask } from '@/api/collaboration'
import type { Comment, Attachment } from '@/api/collaboration'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import client from '@/api/client'
interface TaskDetailsProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
}

const TaskDetails = ({ task, isOpen, onClose }: TaskDetailsProps) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)

  // Collab state
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [isWatching, setIsWatching] = useState(false) // Simplified for demo, ideally checked from API
  
  // Review state — reset whenever task changes so panel is always fresh
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateTaskStatus } = useTaskStore()

  const { user } = useAuthStore()

  const prevTaskIdRef = useRef<string | null>(null)

  useEffect(() => {
    let ignore = false

    // Reset review panel state each time a different task is opened
    if (isOpen && task?.id !== prevTaskIdRef.current) {
      setIsRejecting(false)
      setRejectionNote('')
      setIsSubmitting(false)
      prevTaskIdRef.current = task?.id || null
    }

    if (task && isOpen) {
      const fetchData = async () => {
        setLoadingSubtasks(true)
        try {
          const [s, c, a] = await Promise.all([
            getSubtasks(task.id),
            getComments(task.id),
            getAttachments(task.id)
          ])
          if (!ignore) {
            setSubtasks(s)
            setComments(c)
            setAttachments(a)
          }
        } catch {
          if (!ignore) {
            setSubtasks([])
            setComments([])
            setAttachments([])
          }
        } finally {
          if (!ignore) setLoadingSubtasks(false)
        }
      }
      fetchData()
    }

    return () => { ignore = true }
  }, [task, isOpen])

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return
    const sub = await createSubtask(task.id, newSubtaskTitle.trim())
    setSubtasks(prev => [...prev, sub])
    setNewSubtaskTitle('')
  }

  const handleToggle = async (sub: Subtask) => {
    if (!task) return
    const updated = await updateSubtask(task.id, sub.id, { is_completed: !sub.is_completed })
    setSubtasks(prev => prev.map(s => s.id === sub.id ? updated : s))
  }

  const handleDelete = async (sub: Subtask) => {
    if (!task) return
    await deleteSubtask(task.id, sub.id)
    setSubtasks(prev => prev.filter(s => s.id !== sub.id))
  }

  const handlePostComment = async () => {
    if (!task || !newComment.trim()) return
    const posted = await createComment(task.id, newComment.trim())
    setComments(prev => [...prev, posted])
    setNewComment('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!task || !file) return
    setUploading(true)
    try {
      const att = await uploadAttachment(task.id, file)
      setAttachments(prev => [att, ...prev])
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const toggleWatch = async () => {
    if (!task) return
    if (isWatching) {
      await unwatchTask(task.id).catch(()=> {})
      setIsWatching(false)
    } else {
      await watchTask(task.id).catch(()=> {})
      setIsWatching(true)
    }
  }

  const handleApprove = async () => {
    if (!task || isSubmitting) return
    setIsSubmitting(true)
    try {
      await updateTaskStatus(task.id, 'approved')
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!task || !rejectionNote.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      // Use client directly to send rejection_note payload, then refresh store
      await client.patch(`/tasks/${task.id}`, { status: 'rejected', rejection_note: rejectionNote.trim() })
      await useTaskStore.getState().fetchTasks()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const doneCount = subtasks.filter(s => s.is_completed).length
  const totalCount = subtasks.length
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  // SLA computation
  const [now] = useState(() => Date.now())
  const slaInfo = task?.sla_hours ? (() => {
    const created = new Date(task.created_at)
    const deadline = new Date(created.getTime() + task.sla_hours * 3600000)
    const remainingMs = deadline.getTime() - now
    const remainingHrs = remainingMs / 3600000
    const breached = remainingHrs < 0
    return { deadline, remainingHrs: Math.abs(remainingHrs), breached, level: task.escalation_level }
  })() : null

  if (!task) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-5 md:p-8 border-b border-zinc-100 shrink-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className="text-[10px] uppercase font-black">{task.status.replace('_', ' ')}</Badge>
              {slaInfo && (
                <Badge className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  slaInfo.breached
                    ? "bg-rose-500 text-white"
                    : slaInfo.remainingHrs < 2
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-500 text-white"
                )}>
                  <Shield size={10} className="mr-1" />
                  {slaInfo.breached
                    ? `SLA Breached`
                    : `SLA: ${slaInfo.remainingHrs.toFixed(1)}h`
                  }
                </Badge>
              )}
              <button 
                onClick={toggleWatch}
                className={cn(
                  "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all border",
                  isWatching 
                    ? "bg-zinc-900 text-white border-zinc-900" 
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                {isWatching ? <Eye size={12} /> : <EyeOff size={12} />}
                {isWatching ? 'Watching' : 'Watch'}
              </button>
            </div>
            <SheetTitle className="text-xl md:text-2xl font-black text-zinc-900 leading-tight">{task.title}</SheetTitle>
            <SheetDescription className="mt-2 text-xs md:text-sm text-zinc-500 font-medium leading-relaxed">
              {task.description || "No description provided for this workload item."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 custom-scrollbar">
            {/* Rejection Feedback Banner */}
            {task.rejection_note && (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-rose-700 font-black uppercase tracking-widest text-[10px] mb-2">
                  <Shield size={14} /> Operator Feedback
                </div>
                <p className="text-sm text-rose-900 font-medium leading-relaxed">
                  {task.rejection_note}
                </p>
              </div>
            )}

            {/* Operator Review Panel */}
            {user?.role === 'operator' && task.status === 'review' && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-700 font-black uppercase tracking-widest text-[10px]">
                  <Shield size={14} /> Pending Review
                </div>
                <p className="text-xs md:text-sm text-amber-900 font-medium leading-relaxed">
                  Review the work completed. Approve to close or reject with feedback.
                </p>
                
                {!isRejecting ? (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button 
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      {isSubmitting ? 'Approving...' : 'Approve Task'}
                    </button>
                    <button 
                      onClick={() => setIsRejecting(true)}
                      className="flex-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Reject Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-amber-900">Rejection Feedback</Label>
                    <textarea
                      autoFocus
                      rows={4}
                      placeholder="e.g. Please add unit tests before resubmitting."
                      value={rejectionNote}
                      onChange={e => setRejectionNote(e.target.value)}
                      className="w-full px-4 py-3 text-sm rounded-2xl border border-amber-200 bg-white resize-none outline-none focus:ring-2 focus:ring-amber-300 transition-all font-medium"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={handleReject}
                        disabled={!rejectionNote.trim() || isSubmitting}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        {isSubmitting ? 'Sending...' : 'Confirm Rejection'}
                      </button>
                      <button 
                        onClick={() => { setIsRejecting(false); setRejectionNote('') }}
                        className="px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Section */}
            <div className="relative overflow-hidden rounded-4xl border border-zinc-200 bg-zinc-50 p-6 md:p-8 space-y-8 shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Brain size={160} />
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] relative z-10">
                <Zap size={14} className="text-indigo-500" fill="currentColor" />
                Intelligence Dashboard
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    <Clock size={12} /> Predicted Effort
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-5xl font-black text-zinc-900 leading-none tabular-nums">
                      {task.predicted_hours?.toFixed(1) ?? '—'}
                    </div>
                    <div className="text-sm font-black text-zinc-400 mb-1 uppercase">hrs</div>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-bold italic">
                     Margin: ±{task.pert_std_dev?.toFixed(1) ?? '—'}h
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                    <BarChart3 size={12} /> Delay Risk
                  </div>
                  <div className="text-4xl font-black text-zinc-900 tabular-nums">
                    {task.delay_prob ? Math.round(task.delay_prob * 100) : 0}%
                  </div>
                  <Badge variant={task.delay_prob > 0.4 ? 'warning' : 'success'} className="h-6 px-3 rounded-full text-[9px] font-black uppercase tracking-widest border-none">
                     {task.delay_prob > 0.4 ? 'High Risk' : 'Low Risk'}
                  </Badge>
                </div>
              </div>

              {/* Explainer / SHAP contribution summary */}
              {task.shap_explanation && (
                <div className="mt-6 pt-6 border-t border-zinc-200 relative z-10 space-y-6">
                  <div className="p-4 rounded-2xl bg-white border border-zinc-200 text-xs leading-relaxed text-zinc-600 font-medium shadow-sm">
                    <div className="flex items-start gap-3">
                      <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
                      <p>{task.shap_explanation.human_readable}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Influence Analysis</p>
                    <div className="space-y-3">
                      {Object.entries(task.shap_explanation.contributions || {})
                        .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
                        .slice(0, 5) // Show top 5 for cleaner mobile look
                        .map(([feature, val]) => {
                          const v = val as number
                          const pct = Math.min(Math.abs(v) * 100, 48)
                          const isRisk = v > 0
                          return (
                            <div key={feature} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                                <span className="truncate mr-2">{feature.replace(/_/g, ' ')}</span>
                                <span className={cn("tabular-nums font-black", isRisk ? "text-amber-600" : "text-emerald-600")}>
                                  {isRisk ? '+' : ''}{(v * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-2 w-full bg-zinc-200 rounded-full relative overflow-hidden">
                                <div 
                                  className={cn(
                                    "absolute h-full transition-all duration-1000",
                                    isRisk ? "bg-amber-400 left-1/2" : "bg-emerald-400 right-1/2"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-10" />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-400 font-black uppercase tracking-widest pt-2">
                      <span className="flex items-center gap-1 text-emerald-500">◀ Reduces Risk</span>
                      <span className="flex items-center gap-1 text-amber-500">Increases Risk ▶</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subtask Checklist */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks size={18} className="text-zinc-900" />
                  <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">
                    Work Breakdown
                  </Label>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-black ml-2">
                      {doneCount}/{totalCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      progressPct === 100 ? "bg-emerald-500" : "bg-zinc-900 shadow-lg"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Subtask list */}
              <div className="space-y-2">
                {loadingSubtasks ? (
                  <p className="text-xs text-zinc-400 italic">Loading checklist...</p>
                ) : subtasks.length === 0 ? (
                  <p className="text-xs text-zinc-300 font-medium">No subtasks defined yet.</p>
                ) : (
                  subtasks.map(sub => (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl transition-all group/sub border",
                        sub.is_completed
                          ? "bg-zinc-50/50 border-transparent opacity-60"
                          : "bg-white border-zinc-100 hover:border-zinc-200 shadow-sm"
                      )}
                    >
                      <button
                        onClick={() => handleToggle(sub)}
                        className="shrink-0 transition-transform active:scale-90"
                      >
                        {sub.is_completed
                          ? <CheckCircle2 size={20} className="text-emerald-500" />
                          : <Circle size={20} className="text-zinc-200" />
                        }
                      </button>
                      <span className={cn(
                        "flex-1 text-sm font-bold transition-all",
                        sub.is_completed ? "line-through text-zinc-400" : "text-zinc-800"
                      )}>
                        {sub.title}
                      </span>
                      <button
                        onClick={() => handleDelete(sub)}
                        className="opacity-0 sm:group-hover/sub:opacity-100 text-zinc-300 hover:text-rose-500 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add subtask input */}
              {user?.role !== 'member' && (
                <div className="flex gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                    placeholder="New milestone..."
                    className="h-12 rounded-2xl border-zinc-200 bg-white text-sm font-medium focus:ring-zinc-900 transition-shadow"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className={cn(
                      "h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center transition-all",
                      newSubtaskTitle.trim()
                        ? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg active:scale-95"
                        : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                    )}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Standard Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-100">
              <div className="space-y-2">
                  <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Entry Date</Label>
                  <div className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                    <Calendar size={18} className="text-zinc-300" />
                    {format(new Date(task.created_at), 'MMMM dd, yyyy')}
                  </div>
              </div>
              <div className="space-y-2">
                  <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Hard Deadline</Label>
                  <div className="flex items-center gap-3 text-sm font-bold text-zinc-900">
                    <Calendar size={18} className="text-indigo-500" />
                    {format(new Date(task.deadline), 'MMMM dd, yyyy')}
                  </div>
              </div>
            </div>

            {/* SLA Detail */}
            {slaInfo && (
              <div className={cn(
                "rounded-4xl border-2 p-6 space-y-3 transition-all",
                slaInfo.breached 
                  ? "bg-rose-50 border-rose-100" 
                  : "bg-zinc-50/50 border-zinc-100"
              )}>
                <div className="flex items-center gap-2">
                  <Shield size={16} className={slaInfo.breached ? "text-rose-500" : "text-zinc-400"} />
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em]" style={{ color: slaInfo.breached ? 'rgb(225 29 72)' : 'rgb(113 113 122)' }}>
                    SLA Protocol — {task.sla_hours}h Window
                  </Label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-zinc-600">
                    Due {format(slaInfo.deadline, 'MMM dd, HH:mm')}
                  </span>
                  <span className={cn("font-black uppercase tracking-widest text-[11px] px-3 py-1 rounded-full", slaInfo.breached ? "bg-rose-500 text-white shadow-lg" : "bg-emerald-500 text-white")}>
                    {slaInfo.breached ? `${slaInfo.remainingHrs.toFixed(1)}h Delay` : `${slaInfo.remainingHrs.toFixed(1)}h Remaining`}
                  </span>
                </div>
              </div>
            )}

            {/* Collaboration: Attachments */}
            <div className="space-y-6 pt-8 border-t border-zinc-100">
               <div className="flex items-center justify-between">
                 <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                   <Paperclip size={16} /> Documents
                 </Label>
                 <div>
                   <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                   <label htmlFor="file-upload" className="cursor-pointer text-[10px] font-black text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95">
                     {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                     Add File
                   </label>
                 </div>
               </div>
               
               {attachments.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {attachments.map(att => (
                     <a 
                       key={att.id} 
                       href={`http://localhost:8000${att.file_url}`} 
                       target="_blank" 
                       rel="noreferrer"
                       className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-lg transition-all group"
                     >
                       <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:bg-zinc-100 transition-colors">
                         <FileText size={20} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-black text-zinc-900 truncate uppercase tracking-tight">{att.file_name}</p>
                         <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{att.file_size}</p>
                       </div>
                       <Download size={16} className="text-zinc-200 group-hover:text-zinc-900" />
                     </a>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-zinc-300 font-medium italic">No files attached to this task.</p>
               )}
            </div>

            {/* Collaboration: Comments */}
            <div className="space-y-6 pt-8 border-t border-zinc-100 pb-12">
              <Label className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <MessageSquare size={16} /> Activity Log
              </Label>
              
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <p className="text-xs text-zinc-300 font-medium italic">Start a conversation about this task.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-500 shadow-sm">
                        {comment.author_name ? comment.author_name[0].toUpperCase() : comment.author_email?.[0].toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate">
                            {comment.author_name || comment.author_email || 'System'}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest shrink-0">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="bg-zinc-50/50 p-4 rounded-3xl rounded-tl-none border border-zinc-100/50">
                          <p className="text-sm text-zinc-600 font-medium leading-relaxed wrap-break-word">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm -mx-2 px-2 py-4">
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-900 flex items-center justify-center text-xs font-black text-white shadow-lg">
                  {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
                </div>
                <div className="flex-1 relative">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePostComment() } }}
                    placeholder="Type a message..."
                    className="h-12 rounded-2xl border-zinc-200 bg-white pr-14 text-sm font-medium focus:ring-zinc-900 shadow-sm"
                  />
                  <button 
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="absolute right-2 top-2 bottom-2 w-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default TaskDetails
