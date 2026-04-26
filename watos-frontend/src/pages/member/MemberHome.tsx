import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock, Zap, Calendar,
  ChevronRight, Star, AlertCircle, ShieldAlert
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { useNotifications } from '@/hooks/useNotifications'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// Custom Progress Arc Component
const ProgressArc = ({ percentage, label }: { percentage: number, label: string }) => {
  const radius = 50 // Reduced radius for better fit
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 160 160" className="transform -rotate-90">
        <circle
          cx="80" cy="80" r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-zinc-100"
        />
        <circle
          cx="80" cy="80" r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={percentage > 80 ? 'text-emerald-500' : percentage > 40 ? 'text-blue-500' : 'text-amber-500'}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center top-0 left-0 w-full h-full">
        <span className="text-2xl font-black text-zinc-900">{percentage}%</span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-1">{label}</span>
      </div>
    </div>
  )
}

const MemberHome = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { tasks, loading, fetchTasks } = useTaskStore()
  const { notifications, unreadCount } = useNotifications()

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const myTasks = tasks.filter(t => t.assignee_id === user?.id)
  const done = myTasks.filter(t => t.status === 'done' || t.status === 'approved')
  const active = myTasks.filter(t => t.status !== 'done' && t.status !== 'approved')
  
  const needsRevision = myTasks.filter(t => t.status === 'rejected')
  const inReview = myTasks.filter(t => t.status === 'review')
  
  const completionPercentage = myTasks.length > 0 ? Math.round((done.length / myTasks.length) * 100) : 0

  const upcoming = [...active]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4)

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-10"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-[10px] md:text-sm font-bold text-zinc-400 uppercase tracking-[0.3em]">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-zinc-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm md:text-base text-zinc-500 font-medium">
            Here's your professional workload summary.
          </p>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Action Queue & Completion Arc */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Progress Overview Panel */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 max-w-sm text-center md:text-left">
              <h2 className="text-lg md:text-xl font-black tracking-tight text-zinc-900 flex items-center justify-center md:justify-start gap-2">
                <Zap size={20} className="text-blue-500" /> Sprint Progress
              </h2>
              <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-medium">
                You have completed {done.length} out of {myTasks.length} assigned tasks. Keep up the momentum to hit your sprint targets.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-2">
                   <AlertCircle size={14} className="text-amber-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">{needsRevision.length} Revisions</span>
                </div>
                <div className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-2">
                   <Clock size={14} className="text-blue-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">{inReview.length} In Review</span>
                </div>
              </div>
            </div>
            
            <div className="shrink-0 md:mr-4">
              <ProgressArc percentage={completionPercentage} label="Completion" />
            </div>
          </div>

          {/* Needs Revision Action Queue */}
          {needsRevision.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-500" />
                <h2 className="text-lg font-black tracking-tight text-zinc-900">Needs Revision</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsRevision.map(task => (
                  <div key={task.id} onClick={() => navigate('/member/board')} className="p-4 bg-rose-50 rounded-2xl border border-rose-200 cursor-pointer hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-white text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                        Rejected by Operator
                      </span>
                      <ChevronRight size={14} className="text-rose-300 group-hover:text-rose-600 transition-colors" />
                    </div>
                    <h3 className="font-bold text-zinc-900 mb-1">{task.title}</h3>
                    <p className="text-xs text-rose-700 font-medium line-clamp-2 italic">
                      "{task.rejection_note || 'No feedback provided'}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
                <Calendar size={18} className="text-zinc-400" /> Active Workload
              </h2>
              <button
                onClick={() => navigate('/member/board')}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1"
              >
                View Board <ChevronRight size={12} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="p-10 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl">
                <Star size={32} className="text-zinc-200 mx-auto mb-3" />
                <p className="font-black text-zinc-300 text-sm uppercase tracking-widest">All caught up!</p>
                <p className="text-xs text-zinc-400 mt-1">No active tasks at the moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(task => {
                  const daysLeft = differenceInDays(parseISO(task.deadline), new Date())
                  const isOverdue = daysLeft < 0
                  const isUrgent = daysLeft <= 2 && !isOverdue

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition-all group cursor-pointer"
                      onClick={() => navigate('/member/board')}
                    >
                      <div className={cn(
                        'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0',
                        isOverdue ? 'bg-rose-100' : isUrgent ? 'bg-amber-100' : 'bg-zinc-100'
                      )}>
                        <Clock size={16} className={
                          isOverdue ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-zinc-400'
                        } />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{task.title}</p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          {isOverdue
                            ? `${Math.abs(daysLeft)}d overdue`
                            : daysLeft === 0 ? 'Due today'
                            : `${daysLeft}d remaining`}
                          {' · '}
                          {format(parseISO(task.deadline), 'MMM d')}
                        </p>
                      </div>

                      <span className={cn(
                        "shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                        task.status === 'review' ? "bg-amber-50 text-amber-600" :
                        "bg-zinc-100 text-zinc-500"
                      )}>
                        {task.status.replace('_', ' ')}
                      </span>

                      <ChevronRight size={14} className="text-zinc-200 group-hover:text-zinc-500 transition-colors shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column - Alerts & Notifications */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl shadow-zinc-900/20">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Operator Pulse</h2>
            <div className="space-y-4">
               <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                 <p className="text-sm font-medium leading-relaxed text-zinc-200">
                   "Great job hitting the deliverables last week. Let's focus on clearing the review queue before the sprint ends."
                 </p>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-3">
                   — Auto-summarized from Operator
                 </p>
               </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Recent Alerts</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[9px] font-black rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 5).map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 rounded-2xl border text-xs transition-colors',
                    n.is_read ? 'bg-white border-zinc-100 text-zinc-400' : 'bg-blue-50/50 border-blue-100 text-zinc-700 font-medium'
                  )}
                >
                  <p className="line-clamp-2">{n.message}</p>
                  <p className="text-[9px] mt-1 text-zinc-400 font-medium">
                    {format(new Date(n.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4">No notifications yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default MemberHome
