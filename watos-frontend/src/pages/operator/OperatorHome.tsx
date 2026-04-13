import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTaskStore } from '@/store/taskStore'
import client from '@/api/client'
import { useState } from 'react'
import StatCard from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, AlertTriangle, LayoutGrid, Brain, ChevronRight, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

interface WorkloadUser { user_id: string; full_name: string; utilization: number; assigned_tasks: number }

const OperatorHome = () => {
  const navigate = useNavigate()
  const { tasks, loading, fetchTasks } = useTaskStore()
  const [workloads, setWorkloads] = useState<WorkloadUser[]>([])
  const [wLoading, setWLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    client.get('/workload/utilization').then(r => setWorkloads(r.data)).catch(console.error).finally(() => setWLoading(false))
  }, [fetchTasks])

  const active = tasks.filter(t => t.status !== 'done')
  const highRisk = tasks.filter(t => t.delay_prob > 0.6 && t.status !== 'done')
  const avgUtil = workloads.length ? Math.round(workloads.reduce((a, b) => a + b.utilization, 0) / workloads.length * 100) : 0
  const overloaded = workloads.filter(w => w.utilization > 0.8)

  const quickActions = [
    { label: 'Task Board', desc: 'Manage & assign all tasks', path: '/operator/board', icon: LayoutGrid },
    { label: 'Team Workload', desc: 'Rebalance utilization', path: '/operator/workload', icon: Users },
    { label: 'Analytics', desc: 'PERT, skills & risk', path: '/operator/analytics', icon: TrendingUp },
    { label: 'Smart Assign', desc: 'ML-powered recommendations', path: '/operator/assign', icon: Brain },
  ]

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }}
      className="p-8 max-w-6xl mx-auto space-y-10">

      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">Operator Dashboard</h1>
        <p className="text-zinc-500 font-medium mt-1">Team overview, workload health, and operational controls.</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading || wLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />) : <>
          <StatCard title="Active Tasks" value={active.length} icon={LayoutGrid} variant="dark" subtitle="Across all members" />
          <StatCard title="High Risk" value={highRisk.length} icon={AlertTriangle} variant={highRisk.length > 0 ? 'danger' : 'default'} subtitle="Need intervention" />
          <StatCard title="Avg Utilization" value={`${avgUtil}%`} icon={TrendingUp} variant={avgUtil > 80 ? 'warning' : 'default'} subtitle="Team capacity" />
          <StatCard title="Overloaded" value={overloaded.length} icon={Users} variant={overloaded.length > 0 ? 'warning' : 'success'} subtitle="Members > 80%" />
        </>}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Team Workload Heatmap */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
            <Users size={18} className="text-zinc-400" /> Team Capacity
          </h2>
          <div className="p-6 bg-white border border-zinc-100 rounded-3xl space-y-5">
            {wLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />) : workloads.slice(0, 8).map(w => {
              const pct = Math.min(w.utilization * 100, 100)
              const overload = w.utilization > 0.8
              const moderate = w.utilization > 0.5
              return (
                <div key={w.user_id} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-zinc-800">{w.full_name}</span>
                    <span className={cn('text-[10px] font-black uppercase tracking-widest',
                      overload ? 'text-rose-500' : moderate ? 'text-amber-500' : 'text-emerald-500'
                    )}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700',
                      overload ? 'bg-rose-500' : moderate ? 'bg-amber-400' : 'bg-emerald-500'
                    )} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">{w.assigned_tasks} active task{w.assigned_tasks !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
            {workloads.length === 0 && !wLoading && <p className="text-sm text-zinc-400 text-center py-4">No team data yet.</p>}
          </div>
          <button onClick={() => navigate('/operator/workload')}
            className="w-full flex items-center justify-center gap-2 py-3 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all">
            Full Workload View <ChevronRight size={13} />
          </button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
            <Zap size={18} className="text-zinc-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map(action => (
              <button key={action.path} onClick={() => navigate(action.path)}
                className="flex items-center gap-4 p-5 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-900 hover:shadow-lg transition-all group text-left">
                <div className="h-11 w-11 rounded-2xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors shrink-0">
                  <action.icon size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-zinc-900 tracking-tight">{action.label}</p>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{action.desc}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-200 group-hover:text-zinc-900 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default OperatorHome
