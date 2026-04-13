import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { 
  ShieldCheck, Users, Brain, LayoutGrid, Settings, 
  ChevronRight, Activity, Database, Key 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

const AdminHome = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const adminModules = [
    {
      category: 'System & Security',
      items: [
        { label: 'Audit Logs', desc: 'System-wide activity monitoring & compliance tracking.', path: '/admin/audit', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50 group-hover:bg-violet-100' },
        { label: 'Organization Settings', desc: 'Global configurations, roles, and security policies.', path: '/admin/org', icon: Settings, color: 'text-zinc-500', bg: 'bg-zinc-100 group-hover:bg-zinc-200' },
      ]
    },
    {
      category: 'People & Access',
      items: [
        { label: 'User Management', desc: 'Create accounts, assign roles, and manage credentials.', path: '/admin/users', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 group-hover:bg-blue-100' },
      ]
    },
    {
      category: 'Intelligence & Operations',
      items: [
        { label: 'ML Configuration', desc: 'Tune delay prediction models and SHAP explainer settings.', path: '/admin/ml', icon: Brain, color: 'text-emerald-500', bg: 'bg-emerald-50 group-hover:bg-emerald-100' },
        { label: 'Global Task Board', desc: 'Full-access view of all organization tasks across all teams.', path: '/admin/board', icon: LayoutGrid, color: 'text-amber-500', bg: 'bg-amber-50 group-hover:bg-amber-100' },
      ]
    }
  ]

  return (
    <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }}
      className="p-8 max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="h-16 w-16 bg-zinc-900 rounded-3xl flex items-center justify-center shadow-lg shadow-zinc-900/20 shrink-0">
          <ShieldCheck size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Admin Console</h1>
          <p className="text-zinc-500 font-medium mt-1">Superuser access to WATOS configurations and security.</p>
        </div>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
        {adminModules.map((module, idx) => (
          <motion.div key={module.category} variants={itemVariants} className={cn(
            "space-y-4",
            idx === 2 ? "md:col-span-2" : ""
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
            <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400 mb-0.5">Role</p>
            <p className="text-xs font-bold text-white uppercase">{user?.role || 'Admin'}</p>
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[9px] uppercase font-black tracking-widest text-zinc-400 mb-0.5">Access Level</p>
            <p className="text-xs font-bold text-white uppercase flex items-center gap-1">
              <Key size={10} className="text-emerald-400" /> Unrestricted
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AdminHome
