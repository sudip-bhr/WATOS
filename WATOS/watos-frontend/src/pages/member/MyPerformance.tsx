import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, Brain, Zap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import StatCard from '@/components/shared/StatCard'
import { isAfter, parseISO, isWithinInterval, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const MyPerformance = () => {
  const { user } = useAuthStore()
  const { tasks, loading, fetchTasks } = useTaskStore()

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const myTasks = tasks.filter(t => t.assignee_id === user?.id)
  const done = myTasks.filter(t => t.status === 'done')
  const active = myTasks.filter(t => t.status !== 'done')

  // On-time: done tasks completed before deadline
  const onTime = done.filter(t => !isAfter(new Date(), parseISO(t.deadline)))
  const onTimeRate = done.length > 0 ? Math.round((onTime.length / done.length) * 100) : 0

  // This week's completions (approximated by deadline within last 7 days)
  const thisWeek = done.filter(t => isWithinInterval(parseISO(t.deadline), { start: subDays(new Date(), 7), end: new Date() }))

  // Avg delay probability on active tasks
  const avgRisk = active.length > 0 ? active.reduce((a, b) => a + b.delay_prob, 0) / active.length : 0

  // Riskiest task for SHAP
  const riskiest = [...active].sort((a, b) => b.delay_prob - a.delay_prob)[0]

  // Skill demand vs supply
  const allRequiredSkills = myTasks.flatMap(t => t.required_skills)
  const skillDemand = allRequiredSkills.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {} as Record<string, number>)
  const mySkills = new Set(user?.skills || [])

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }}
      className="p-8 max-w-5xl mx-auto space-y-10">

      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">My Performance</h1>
        <p className="text-zinc-500 font-medium mt-1">Personal delivery metrics and ML insights.</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />) : <>
          <StatCard title="Total Assigned" value={myTasks.length} icon={CheckCircle2} variant="dark" subtitle="All time" />
          <StatCard title="Completed" value={done.length} icon={TrendingUp} variant="success" subtitle="Tasks done" />
          <StatCard title="On-Time Rate" value={`${onTimeRate}%`} icon={Clock} variant="default" subtitle="Delivery accuracy" />
          <StatCard title="Avg Delay Risk" value={`${Math.round(avgRisk * 100)}%`} icon={AlertTriangle}
            variant={avgRisk > 0.5 ? 'danger' : avgRisk > 0.3 ? 'warning' : 'default'} subtitle="Active tasks" />
        </>}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ML Insight: Riskiest Task */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
            <Brain size={18} className="text-zinc-400" /> AI Insight
          </h2>
          {riskiest ? (
            <div className="p-6 bg-zinc-900 text-white rounded-3xl space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mb-2">Highest Risk Task</p>
                  <h3 className="font-black text-lg leading-tight">{riskiest.title}</h3>
                </div>
                <span className="shrink-0 px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-xl uppercase">
                  {Math.round(riskiest.delay_prob * 100)}% risk
                </span>
              </div>

              {riskiest.shap_explanation ? (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-50">Why is this flagged?</p>
                  <p className="text-sm font-medium opacity-80 leading-relaxed">{riskiest.shap_explanation.human_readable}</p>
                  <div className="space-y-2 pt-2">
                    {Object.entries(riskiest.shap_explanation.contributions)
                      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
                      .slice(0, 4)
                      .map(([factor, value]) => (
                        <div key={factor} className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-bold opacity-60 capitalize">{factor.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', value > 0 ? 'bg-rose-400' : 'bg-emerald-400')}
                                style={{ width: `${Math.min(Math.abs(value) * 200, 100)}%` }}
                              />
                            </div>
                            <span className={cn('text-[9px] font-black shrink-0', value > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                              {value > 0 ? '+' : ''}{value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm opacity-60">Effort: {riskiest.effort_hours}h · Complexity: {riskiest.complexity.toFixed(1)}</p>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl">
              <Zap size={28} className="text-zinc-200 mx-auto mb-3" />
              <p className="font-black text-zinc-300 text-sm uppercase tracking-widest">All Clear</p>
              <p className="text-xs text-zinc-400 mt-1">No active high-risk tasks.</p>
            </div>
          )}
        </motion.div>

        {/* Skill Coverage */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
            <Zap size={18} className="text-zinc-400" /> Skill Coverage
          </h2>
          <div className="p-6 bg-white border border-zinc-100 rounded-3xl space-y-4">
            <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Required vs Your Skills</p>
            {Object.keys(skillDemand).length === 0 ? (
              <p className="text-sm text-zinc-400">No specific skills required by your current tasks.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(skillDemand)
                  .sort(([,a],[,b]) => b - a)
                  .slice(0, 8)
                  .map(([skill, count]) => {
                    const covered = mySkills.has(skill)
                    return (
                      <div key={skill} className="flex items-center gap-3">
                        <div className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          covered ? 'bg-emerald-500' : 'bg-rose-400'
                        )} />
                        <span className="text-xs font-bold text-zinc-700 capitalize flex-1">{skill}</span>
                        <span className="text-[9px] text-zinc-400 font-medium">{count} task{count > 1 ? 's' : ''}</span>
                        <span className={cn(
                          'text-[9px] font-black uppercase px-2 py-0.5 rounded-lg',
                          covered ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                        )}>
                          {covered ? 'Covered' : 'Gap'}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Weekly summary */}
          <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-3xl">
            <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-3">This Week</p>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-black text-zinc-900">{thisWeek.length}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900">{active.length}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">In Progress</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default MyPerformance
