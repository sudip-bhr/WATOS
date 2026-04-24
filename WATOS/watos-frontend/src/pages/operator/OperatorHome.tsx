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

  const operatorModules = [
    {
      category: 'Operations',
      items: [
        { label: 'Task Board', desc: 'Manage & assign all team tasks.', path: '/operator/board', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100' },
        { label: 'Smart Assign', desc: 'ML-powered recommendations.', path: '/operator/assign', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100' },
        { label: 'Analytics', desc: 'PERT, skills & risk metrics.', path: '/operator/analytics', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50 group-hover:bg-violet-100' },
      ]
    },
    {
      category: 'Management',
      items: [
        { label: 'User Management', desc: 'Manage team accounts and roles.', path: '/operator/users', icon: Users, color: 'text-zinc-900', bg: 'bg-zinc-100 group-hover:bg-zinc-200' },
        { label: 'ML Config', desc: 'Tune prediction models.', path: '/operator/ml', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 group-hover:bg-amber-100' },
      ]
    },
    {
      category: 'Organization',
      items: [
        { label: 'Org Settings', desc: 'Global configurations.', path: '/operator/org', icon: LayoutGrid, color: 'text-zinc-500', bg: 'bg-zinc-100 group-hover:bg-zinc-200' },
        { label: 'Audit Log', desc: 'Activity monitoring.', path: '/operator/audit', icon: TrendingUp, color: 'text-zinc-900', bg: 'bg-zinc-100 group-hover:bg-zinc-200' },
      ]
    }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        {operatorModules.map((module, idx) => (
          <motion.div key={module.category} variants={itemVariants} className={cn(
            "space-y-4",
            idx === 0 ? "md:col-span-2" : ""
          )}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-2">
              {module.category}
            </h2>
            <div className={cn(
              "grid gap-4",
              idx === 0 ? "md:grid-cols-3" : "grid-cols-1"
            )}>
              {module.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-start gap-5 p-6 bg-white border border-zinc-200 rounded-3xl hover:border-zinc-900 hover:shadow-xl hover:shadow-zinc-900/5 transition-all group text-left h-full"
                >
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", item.bg)}>
                    <item.icon size={20} className={item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                      {item.label}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-900 shrink-0 transition-colors mt-2" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default OperatorHome
