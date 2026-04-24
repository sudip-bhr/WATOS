import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2, AlertTriangle, Clock, Zap, Calendar,
  ChevronRight, TrendingUp, ListTodo, Star
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { useNotifications } from '@/hooks/useNotifications'
import StatCard from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { format, isAfter, parseISO, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const MemberHome = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { tasks, loading, fetchTasks } = useTaskStore()
  const { notifications, unreadCount } = useNotifications()

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const myTasks = tasks.filter(t => t.assignee_id === user?.id)
  const done = myTasks.filter(t => t.status === 'done')
  const active = myTasks.filter(t => t.status !== 'done')
  const highRisk = myTasks.filter(t => t.delay_prob > 0.6 && t.status !== 'done')

  const onTimeRate = myTasks.length > 0
    ? Math.round((done.filter(t => !isAfter(parseISO(t.deadline), new Date())).length / Math.max(done.length, 1)) * 100)
    : 0

  const upcoming = [...active]
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 max-w-6xl mx-auto space-y-10"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-[0.3em]">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-zinc-500 font-medium">
          Here's what's on your plate today.
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)
        ) : (
          <>
            <StatCard
              title="My Tasks"
              value={myTasks.length}
              subtitle="Total assigned"
              icon={ListTodo}
              variant="dark"
            />
            <StatCard
              title="Completed"
              value={done.length}
              subtitle="All time"
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title="On-Time Rate"
              value={`${onTimeRate}%`}
              subtitle="Delivery accuracy"
              icon={TrendingUp}
              variant="default"
            />
            <StatCard
              title="High Risk"
              value={highRisk.length}
              subtitle="Need attention"
              icon={AlertTriangle}
              variant={highRisk.length > 0 ? 'danger' : 'default'}
            />
          </>
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upcoming Deadlines */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
              <Calendar size={18} className="text-zinc-400" />
              Upcoming Deadlines
            </h2>
            <button
              onClick={() => navigate('/member/board')}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-1"
            >
              View All <ChevronRight size={12} />
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
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all group cursor-pointer"
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

                    {task.delay_prob > 0.5 && (
                      <span className="shrink-0 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100">
                        {Math.round(task.delay_prob * 100)}% risk
                      </span>
                    )}

                    <ChevronRight size={14} className="text-zinc-200 group-hover:text-zinc-500 transition-colors shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Task Board', desc: 'View & manage your tasks', path: '/member/board', icon: ListTodo },
                { label: 'Analytics', desc: 'Stats & ML insights', path: '/member/analytics', icon: TrendingUp },
                { label: 'Projects', desc: 'Browse your projects', path: '/projects', icon: Zap },
              ].map(action => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 p-4 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all group text-left"
                >
                  <div className="h-9 w-9 rounded-xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors shrink-0">
                    <action.icon size={15} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900 tracking-tight">{action.label}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">{action.desc}</p>
                  </div>
                  <ChevronRight size={13} className="text-zinc-200 group-hover:text-zinc-900 ml-auto shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Recent Alerts</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[9px] font-black rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 4).map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 rounded-2xl border text-xs',
                    n.is_read ? 'bg-white border-zinc-100 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-700 font-medium'
                  )}
                >
                  <p className="line-clamp-2">{n.message}</p>
                  <p className="text-[9px] mt-1 text-zinc-300 font-medium">
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
