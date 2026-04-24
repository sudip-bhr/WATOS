import { useState, useEffect } from 'react'
import type { Task } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet'
import { Badge } from '../ui/badge'
import { Brain, Calendar, Info, Clock, BarChart3, Zap, Plus, Trash2, CheckCircle2, Circle, ListChecks, Shield, MessageSquare, Paperclip, Send, Eye, EyeOff, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { cn } from '@/lib/utils'
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from '@/api/subtasks'
import type { Subtask } from '@/api/subtasks'
import { getComments, createComment, getAttachments, uploadAttachment, watchTask, unwatchTask } from '@/api/collaboration'
import type { Comment, Attachment } from '@/api/collaboration'
import { useAuthStore } from '@/store/authStore'

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
  
  const { user } = useAuthStore()

  useEffect(() => {
    if (task && isOpen) {
      setLoadingSubtasks(true)
      getSubtasks(task.id)
        .then(setSubtasks)
        .catch(() => setSubtasks([]))
        .finally(() => setLoadingSubtasks(false))
        
      getComments(task.id).then(setComments).catch(() => setComments([]))
      getAttachments(task.id).then(setAttachments).catch(() => setAttachments([]))
    }
  }, [task?.id, isOpen])

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

  if (!task) return null

  const doneCount = subtasks.filter(s => s.is_completed).length
  const totalCount = subtasks.length
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  // SLA computation
  const slaInfo = task.sla_hours ? (() => {
    const created = new Date(task.created_at)
    const deadline = new Date(created.getTime() + task.sla_hours * 3600000)
    const remainingMs = deadline.getTime() - Date.now()
    const remainingHrs = remainingMs / 3600000
    const breached = remainingHrs < 0
    return { deadline, remainingHrs: Math.abs(remainingHrs), breached, level: task.escalation_level }
  })() : null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px]">{task.status.replace('_', ' ')}</Badge>
            <Badge variant="secondary" className="text-[10px]">ID: {task.id.slice(0, 8)}</Badge>
            {slaInfo && (
              <Badge className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                slaInfo.breached
                  ? "bg-rose-500 text-white"
                  : slaInfo.remainingHrs < 2
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
              )}>
                <Shield size={10} className="mr-1" />
                {slaInfo.breached
                  ? `SLA Breached (L${slaInfo.level})`
                  : `SLA: ${slaInfo.remainingHrs.toFixed(1)}h left`
                }
              </Badge>
            )}
            <button 
              onClick={toggleWatch}
              className={cn(
                "ml-auto flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all border",
                isWatching 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900"
              )}
            >
              {isWatching ? <Eye size={12} /> : <EyeOff size={12} />}
              {isWatching ? 'Watching' : 'Watch'}
            </button>
          </div>
          <SheetTitle className="text-2xl font-bold">{task.title}</SheetTitle>
          <SheetDescription className="mt-2 text-zinc-600">
            {task.description || "No description provided for this workload item."}
          </SheetDescription>
        </SheetHeader>

        <div className="py-8 space-y-8">
          {/* AI Insights Section - Premium Glass Card */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-zinc-50 p-6 space-y-6 shadow-sm">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Brain size={120} />
            </div>
            
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-widest">
              <Zap size={16} fill="currentColor" />
              Intelligence Dashboard
            </div>

            <div className="grid grid-cols-2 gap-8 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                  <Clock size={14} />
                  ML Predicted Effort
                </div>
                <div className="text-3xl font-black text-zinc-900">
                  {task.predicted_hours?.toFixed(1) ?? '—'}<span className="text-sm font-normal text-zinc-500 ml-1">hrs</span>
                </div>
                <div className="text-[10px] text-zinc-400 font-semibold italic">
                   Confidence Interval: ±{task.pert_std_dev?.toFixed(1) ?? '—'}h
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                  <BarChart3 size={14} />
                  Risk Factor
                </div>
                <div className="text-3xl font-black text-zinc-900">
                  {task.delay_prob ? Math.round(task.delay_prob * 100) : 0}%
                </div>
                <Badge variant={task.delay_prob > 0.4 ? 'warning' : 'success'} className="h-5">
                   {task.delay_prob > 0.4 ? 'Potential Delay' : 'On Track'}
                </Badge>
              </div>
            </div>

            {/* Explainer / SHAP contribution summary */}
            {task.shap_explanation && (
              <div className="mt-4 space-y-4">
                <div className="p-3 rounded-lg bg-white border border-zinc-200 text-[11px] leading-relaxed text-zinc-700 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="shrink-0 mt-0.5 text-zinc-900" />
                    <p>{task.shap_explanation.human_readable}</p>
                  </div>
                </div>

                {/* Bidirectional SHAP Waterfall Chart */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Feature Influence</p>
                  <div className="space-y-2.5">
                    {Object.entries(task.shap_explanation.contributions || {})
                      .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
                      .map(([feature, val]) => {
                        const v = val as number
                        const pct = Math.min(Math.abs(v) * 600, 48) // max 48% each side
                        const isRisk = v > 0
                        return (
                          <div key={feature} className="flex items-center gap-2">
                            {/* Feature label */}
                            <div className="w-24 text-[9px] text-zinc-500 truncate uppercase font-semibold shrink-0">
                              {feature.replace(/_/g, ' ')}
                            </div>

                            {/* Bidirectional bar */}
                            <div className="flex-1 flex items-center h-5 relative">
                              {/* Center axis line */}
                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-200 z-10" />

                              {/* Left half (negative = risk-reducing) */}
                              <div className="flex-1 flex justify-end h-full pr-px">
                                {!isRisk && (
                                  <div
                                    className="h-full bg-emerald-400 rounded-l-full transition-all duration-700"
                                    style={{ width: `${pct * 2}%` }}
                                  />
                                )}
                              </div>

                              {/* Right half (positive = risk-increasing) */}
                              <div className="flex-1 flex justify-start h-full pl-px">
                                {isRisk && (
                                  <div
                                    className="h-full bg-amber-400 rounded-r-full transition-all duration-700"
                                    style={{ width: `${pct * 2}%` }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Value label */}
                            <div className={cn(
                              "w-10 text-[9px] font-mono text-right font-black shrink-0",
                              isRisk ? "text-amber-600" : "text-emerald-600"
                            )}>
                              {isRisk ? '+' : ''}{(v * 100).toFixed(0)}%
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-300 font-semibold uppercase tracking-widest pt-1 px-26">
                    <span className="text-emerald-400">◀ Reduces Risk</span>
                    <span className="text-amber-400">Increases Risk ▶</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Subtask Checklist ─── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-zinc-900" />
                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                  Subtasks
                </Label>
                {totalCount > 0 && (
                  <span className="text-[10px] font-black text-zinc-400">
                    {doneCount}/{totalCount}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPct === 100 ? "bg-emerald-500" : "bg-zinc-900"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Subtask list */}
            <div className="space-y-1.5">
              {loadingSubtasks ? (
                <p className="text-xs text-zinc-300 italic py-2">Loading subtasks…</p>
              ) : subtasks.length === 0 ? (
                <p className="text-xs text-zinc-300 italic py-2">No subtasks yet.</p>
              ) : (
                subtasks.map(sub => (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group/sub",
                      sub.is_completed
                        ? "bg-zinc-50 opacity-60"
                        : "bg-white hover:bg-zinc-50"
                    )}
                  >
                    <button
                      onClick={() => handleToggle(sub)}
                      className="shrink-0 text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      {sub.is_completed
                        ? <CheckCircle2 size={16} className="text-emerald-500" />
                        : <Circle size={16} />
                      }
                    </button>
                    <span className={cn(
                      "flex-1 text-sm font-medium transition-all",
                      sub.is_completed ? "line-through text-zinc-400" : "text-zinc-800"
                    )}>
                      {sub.title}
                    </span>
                    <button
                      onClick={() => handleDelete(sub)}
                      className="opacity-0 group-hover/sub:opacity-100 text-zinc-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add subtask input */}
            <div className="flex gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                placeholder="Add a subtask…"
                className="rounded-xl border-zinc-200 text-sm font-medium"
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all",
                  newSubtaskTitle.trim()
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                )}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Standard Metadata */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Planned Start</Label>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar size={16} className="text-zinc-400" />
                  {format(new Date(task.created_at), 'MMMM dd, yyyy')}
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold">Target Deadline</Label>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar size={16} className="text-zinc-900" />
                  {format(new Date(task.deadline), 'MMMM dd, yyyy')}
                </div>
            </div>
          </div>

          {/* SLA Detail */}
          {slaInfo && (
            <div className="rounded-2xl border p-4 space-y-2"
              style={{
                borderColor: slaInfo.breached ? 'rgb(244 63 94)' : 'rgb(228 228 231)',
                backgroundColor: slaInfo.breached ? 'rgb(255 241 242)' : 'rgb(250 250 250)',
              }}
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className={slaInfo.breached ? "text-rose-500" : "text-zinc-400"} />
                <Label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: slaInfo.breached ? 'rgb(225 29 72)' : 'rgb(113 113 122)' }}>
                  SLA Policy — {task.sla_hours}h Window
                </Label>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">
                  Deadline: {format(slaInfo.deadline, 'MMM dd, HH:mm')}
                </span>
                <span className={cn("font-black", slaInfo.breached ? "text-rose-600" : "text-emerald-600")}>
                  {slaInfo.breached ? `${slaInfo.remainingHrs.toFixed(1)}h overdue` : `${slaInfo.remainingHrs.toFixed(1)}h remaining`}
                </span>
              </div>
              {slaInfo.level > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                  Escalation Level {slaInfo.level}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
             <Label className="text-[10px] text-zinc-500 uppercase font-bold">Required Competencies</Label>
             <div className="flex flex-wrap gap-2">
               {task.required_skills?.map(skill => (
                 <Badge key={skill} variant="secondary" className="bg-zinc-100 text-zinc-700 border-none">
                    {skill}
                 </Badge>
               )) || <span className="text-xs text-zinc-400 italic">No skills specified</span>}
             </div>
          </div>

          {/* ─── Collaboration: Attachments ─── */}
          <div className="space-y-4 pt-6 border-t border-zinc-100">
             <div className="flex items-center justify-between">
               <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                 <Paperclip size={14} /> Attachments
               </Label>
               <div>
                 <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                 <label htmlFor="file-upload" className="cursor-pointer text-[10px] font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5">
                   {uploading ? <Clock size={12} className="animate-spin" /> : <Plus size={12} />}
                   Upload File
                 </label>
               </div>
             </div>
             
             {attachments.length > 0 && (
               <div className="grid grid-cols-2 gap-3">
                 {attachments.map(att => (
                   <a 
                     key={att.id} 
                     href={`http://localhost:8000${att.file_url}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors group"
                   >
                     <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 group-hover:bg-zinc-200 transition-colors">
                       <FileText size={18} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-semibold text-zinc-900 truncate">{att.file_name}</p>
                       <p className="text-[10px] text-zinc-400 mt-0.5">{att.file_size}</p>
                     </div>
                     <Download size={14} className="text-zinc-300 group-hover:text-zinc-900" />
                   </a>
                 ))}
               </div>
             )}
          </div>

          {/* ─── Collaboration: Comments ─── */}
          <div className="space-y-4 pt-6 border-t border-zinc-100 pb-8">
            <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> Discussion
            </Label>
            
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                    {comment.author_name ? comment.author_name[0].toUpperCase() : comment.author_email?.[0].toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-zinc-900">
                        {comment.author_name || comment.author_email || 'Unknown User'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-2xl rounded-tl-none inline-block border border-zinc-100">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex gap-3 pt-4">
              <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
              </div>
              <div className="flex-1 relative">
                <Input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePostComment() } }}
                  placeholder="Write a comment..."
                  className="rounded-2xl border-zinc-200 bg-white pr-12"
                />
                <button 
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default TaskDetails
