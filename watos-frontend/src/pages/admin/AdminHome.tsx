import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, type ReactNode } from 'react'
import client from '@/api/client'
import {
  ShieldCheck, Users, Brain, LayoutGrid,
  ChevronRight, Activity, Database, AlertTriangle, UserCog
} from 'lucide-react'
import { cn } from '@/lib/utils'

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const AdminHome = () => {
  const navigate = useNavigate()

  const [imbalance, setImbalance] = useState<{ imbalance_score: number; team_utilizations: ReactNode } | null>(null)
  const [stats, setStats] = useState({ users: 0, projects: 0 })

  useEffect(() => {
    Promise.all([
      client.get('/workload/imbalance').catch(() => ({ data: null })),
      client.get('/users/').catch(() => ({ data: [] })),
      client.get('/projects/').catch(() => ({ data: [] }))
    ]).then(([imbRes, usersRes, projRes]) => {
      if (imbRes.data) setImbalance(imbRes.data)
      setStats({
        users: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
        projects: Array.isArray(projRes.data) ? projRes.data.length : 0
      })
    })
  }, [])

  const adminModules = [
    {
      category: 'Workload Monitoring',
      items: [
        { label: 'Workload Overview', desc: 'Monitor team-wide utilization and identify bottlenecks.', path: '/admin/workload', icon: Users, color: 'text-rose-500', bg: 'bg-rose-50 group-hover:bg-rose-100' },
        { label: 'Imbalance Alerts', desc: 'Real-time notifications about workload distribution issues.', path: '/admin/workload', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50 group-hover:bg-amber-100' },
      ]
    },
    {
      category: 'Global Insights',
      items: [
        { label: 'Global Task Board', desc: 'Full-access view of all organization tasks.', path: '/admin/board', icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100' },
        { label: 'System Analytics', desc: 'High-level performance and predictive metrics.', path: '/admin/analytics', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100' },
      ]
    },
    {
      category: 'Access Control',
      items: [
        { label: 'User Management', desc: 'Manage organization accounts, roles, and security.', path: '/admin/users', icon: UserCog, color: 'text-indigo-500', bg: 'bg-indigo-50 group-hover:bg-indigo-100' },
      ]
    }
  ]

  const isImbalanced = (imbalance?.imbalance_score || 0) > 0.4

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }}
      className="p-4 md:p-8 max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="h-14 w-14 md:h-16 md:w-16 bg-zinc-900 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg shadow-zinc-900/20 shrink-0">
            <ShieldCheck size={28} className="text-white md:size-32" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">Admin Console</h1>
            <p className="text-sm md:text-base text-zinc-500 font-medium mt-1">Superuser access to WATOS monitoring.</p>
          </div>
        </motion.div>

        {/* Imbalance Notification */}
        <AnimatePresence>
          {isImbalanced && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="flex items-center gap-4 p-4 bg-rose-50 border border-rose-100 rounded-3xl shadow-xl shadow-rose-900/5 w-full md:max-w-sm"
            >
              <div className="h-12 w-12 rounded-2xl bg-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-rose-900 uppercase tracking-widest">Workload Imbalance</p>
                <p className="text-[10px] text-rose-600 font-medium mt-0.5">High variance detected (Score: {imbalance?.imbalance_score.toFixed(2)}). Rebalancing recommended.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
        {adminModules.map((module, idx) => (
          <motion.div key={module.category} variants={itemVariants} className={cn(
            "space-y-4",
            idx === 2 ? "lg:col-span-2" : ""
          )}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 pl-2">
              {module.category}
            </h2>
            <div className={cn(
              "grid gap-4",
              idx === 2 ? "md:grid-cols-2" : "grid-cols-1"
            )}>
              {module.items.map(item => (
                <button
                  key={item.label}
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

      {/* System Status Footer */}
      <motion.div variants={itemVariants} className="mt-12 p-6 rounded-3xl bg-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6 border border-zinc-800">
        <div className="flex items-center gap-4 text-white">
          <Database size={20} className="text-emerald-400" />
          <div>
            <p className="text-sm font-bold">System Online & Connected</p>
            <p className="text-[10px] uppercase font-black tracking-widest opacity-50 mt-1">All services operational</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400 mb-0.5">Active Users</p>
            <p className="text-xs font-bold text-white uppercase">{stats.users}</p>
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400 mb-0.5">Total Projects</p>
            <p className="text-xs font-bold text-white uppercase">{stats.projects}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AdminHome
