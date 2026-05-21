import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, FileText, TrendingUp, AlertTriangle, Crosshair, Users, CheckCircle2, Zap } from 'lucide-react'
import client from '@/api/client'
import PertChart from '@/components/analytics/PertChart'
import ClusterChart from '@/components/analytics/ClusterChart'
import { useTaskStore } from '@/store/taskStore'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Custom Skill Radar SVG ──
interface SkillData {
  subject: string
  supply: number
  demand: number
}

const SkillRadar = ({ data }: { data: SkillData[] }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">No skill data available</div>

  const size = 300
  const center = size / 2
  const radius = (size / 2) * 0.7
  const angleStep = (Math.PI * 2) / data.length

  const getPoint = (val: number, max: number, index: number) => {
    const r = (val / Math.max(max, 1)) * radius
    const angle = index * angleStep - Math.PI / 2
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.supply, d.demand)), 1)
  const supplyPoints = data.map((d, i) => getPoint(d.supply, maxVal, i))
  const demandPoints = data.map((d, i) => getPoint(d.demand, maxVal, i))
  const supplyPath = supplyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const demandPath = demandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="filter drop-shadow-sm">
      <defs>
        <linearGradient id="supplyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="demandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
        <path key={r} d={data.map((_, i) => { const p = getPoint(r * maxVal, maxVal, i); return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}` }).join(' ') + ' Z'} className="fill-none stroke-zinc-100" strokeWidth="1" />
      ))}
      {data.map((_, i) => { const p = getPoint(maxVal, maxVal, i); return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} className="stroke-zinc-100" strokeWidth="1" /> })}
      {data.map((d, i) => { 
        const p = getPoint(maxVal * 1.25, maxVal, i); 
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" alignmentBaseline="middle" className="text-[10px] font-bold fill-zinc-400 uppercase tracking-widest">{d.subject}</text> 
      })}
      <path d={supplyPath} fill="url(#supplyGrad)" className="stroke-emerald-500" strokeWidth="2.5" />
      <path d={demandPath} fill="url(#demandGrad)" className="stroke-rose-500" strokeWidth="2.5" strokeDasharray="4 2" />
      <g transform={`translate(${size - 95}, ${size - 45})`}>
        <rect x="-5" y="-10" width="85" height="45" rx="16" className="fill-zinc-900/40 backdrop-blur-md stroke-white/5" />
        <circle cx="8" cy="5" r="3.5" className="fill-emerald-500 shadow-sm shadow-emerald-500/50" />
        <text x="18" y="8" className="text-[9px] font-bold fill-zinc-300 uppercase tracking-widest">Supply</text>
        <circle cx="8" cy="22" r="3.5" className="fill-rose-500 shadow-sm shadow-rose-500/50" />
        <text x="18" y="25" className="text-[9px] font-bold fill-zinc-300 uppercase tracking-widest">Demand</text>
      </g>
    </svg>
  )
}

// ── Skill Matrix Table ──
const SkillMatrixTable = ({ members }: { members: MemberPerf[] }) => {
  const allSkills = Array.from(new Set(members.flatMap(m => m.skills))).sort()
  
  if (allSkills.length === 0) return null

  return (
    <div className="overflow-x-auto custom-scrollbar -mx-6 px-6">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-30 py-4 pr-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-900 min-w-[180px]">
              <div className="flex items-center gap-2">
                <Users size={12} className="text-zinc-400" /> Specialist
              </div>
            </th>
            {allSkills.map(skill => (
              <th key={skill} className="py-4 px-6 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center whitespace-nowrap min-w-[120px] bg-zinc-50/30">
                {skill}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id} className="group hover:bg-zinc-50/50 transition-colors">
              <td className="sticky left-0 bg-white group-hover:bg-zinc-50/50 z-20 py-4 pr-4 border-b border-zinc-50 font-bold text-sm text-zinc-900 whitespace-nowrap">
                {m.full_name}
              </td>
              {allSkills.map(skill => {
                const hasSkill = m.skills.includes(skill)
                return (
                  <td key={skill} className="py-4 px-4 border-b border-zinc-50 text-center">
                    {hasSkill ? (
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100">
                          <CheckCircle2 size={14} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-100" />
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Mini Sparkline SVG ──
const Sparkline = ({ data, color = '#18181b' }: { data: number[], color?: string }) => {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  const w = 80, h = 28, pad = 2
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = h - pad - (v / max) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

import type { PertNodeData, PertEdgeData } from '@/types'

// ... types ...
interface MemberPerf {
  user_id: string
  full_name: string
  email: string
  skills: string[]
  total_tasks: number
  done_count: number
  completion_rate: number
  on_time_rate: number
  avg_time_ratio: number | null
  in_review: number
  rejected: number
  weekly_trend: { week: string; completed: number }[]
}

const TeamAnalytics = () => {
  const { tasks, loading: tasksLoading, fetchTasks } = useTaskStore()
  const [skillData, setSkillData] = useState<SkillData[]>([])
  const [pertData, setPertData] = useState<{nodes: PertNodeData[], edges: PertEdgeData[]}>({ nodes: [], edges: [] })
  const [memberPerf, setMemberPerf] = useState<MemberPerf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    Promise.all([
      client.get('/analytics/skills-gap').catch(() => ({ data: [] })),
      client.get('/analytics/pert').catch(() => ({ data: { nodes: [], edges: [] } })),
      client.get('/analytics/member-performance').catch(() => ({ data: [] })),
    ]).then(([skillRes, pertRes, perfRes]) => {
      // Ensure we have data
      const sData = Array.isArray(skillRes.data) ? skillRes.data : []
      const mData = Array.isArray(perfRes.data) ? perfRes.data : []
      
      setSkillData(sData)
      setPertData(pertRes.data || { nodes: [], edges: [] })
      setMemberPerf(mData)
    }).finally(() => setLoading(false))
  }, [fetchTasks])

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const highRiskCount = activeTasks.filter(t => t.delay_prob > 0.6).length
  const avgComplexity = activeTasks.length ? activeTasks.reduce((acc, curr) => acc + curr.complexity, 0) / activeTasks.length : 0

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'text-emerald-600'
    if (rate >= 50) return 'text-amber-600'
    return 'text-rose-600'
  }

  const getRateBg = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500'
    if (rate >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="p-4 md:p-8 space-y-10 md:space-y-12 max-w-7xl mx-auto pb-20">
      {/* Header with Glassmorphism Effect */}
      <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Team Analytics</h1>           
          </div>
    
      {tasksLoading || loading ? (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
           </div>
           <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl p-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Active</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-zinc-900">{activeTasks.length}</div>
                  <p className="text-xs text-zinc-500 font-medium mt-1">Workload tasks in pipeline</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl p-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">At Risk</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-rose-600">{highRiskCount}</div>
                  <p className="text-xs text-zinc-500 font-medium mt-1">High probability of delay</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl p-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Crosshair size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Complexity</span>
                </div>
                <div>
                  <div className="text-4xl font-bold text-zinc-900">{avgComplexity.toFixed(1)}</div>
                  <p className="text-xs text-zinc-500 font-medium mt-1">Average points per task</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── ML Workload Group Clustering Section ── */}
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                <Brain className="text-indigo-500 animate-pulse" size={24} /> ML Workload Grouping
              </h2>
              <p className="text-sm text-zinc-500 font-medium">
                Predictive clustering based on task complexity, effort hours, and priority scores.
              </p>
            </div>
            <ClusterChart tasks={tasks} />
          </div>

          {/* ── Member Performance Section ── */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                  <Users className="text-zinc-400" size={24} /> Performance Audit
                </h2>
                <p className="text-sm text-zinc-500 font-medium">Detailed throughput and reliability metrics for every team member.</p>
              </div>
            </div>

            <div className="bg-white rounded-4xl border border-zinc-100 shadow-2xl shadow-zinc-200/40 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px]">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-zinc-50/50">
                        <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Member Profile</th>
                        <th className="px-4 py-5 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Load</th>
                        <th className="px-4 py-5 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Velocity</th>
                        <th className="px-4 py-5 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">Quality</th>
                        <th className="px-8 py-5 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100 w-48">Weekly Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {memberPerf.map((m) => (
                        <tr key={m.user_id} className="hover:bg-zinc-50/30 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-12 w-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0",
                                m.completion_rate >= 80 ? "bg-emerald-500 shadow-emerald-500/20" : 
                                m.completion_rate >= 50 ? "bg-amber-500 shadow-amber-500/20" : 
                                "bg-rose-500 shadow-rose-500/20"
                              )}>
                                {m.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-zinc-900">{m.full_name}</div>
                                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5 truncate max-w-[150px]">
                                  {m.skills.slice(0, 3).join(' • ') || 'Unskilled'}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-6 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-sm font-bold text-zinc-900">{m.total_tasks}</span>
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Tasks</span>
                            </div>
                          </td>

                          <td className="px-4 py-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full", getRateBg(m.completion_rate))}
                                    style={{ width: `${m.completion_rate}%` }}
                                  />
                                </div>
                                <span className={cn("text-xs font-bold w-8 text-right", getRateColor(m.completion_rate))}>
                                  {m.completion_rate}%
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Efficiency</span>
                            </div>
                          </td>

                          <td className="px-4 py-6 text-center">
                            <div className="inline-flex gap-4">
                              <div className="flex flex-col items-center">
                                <span className={cn("text-xs font-bold", m.on_time_rate >= 80 ? 'text-emerald-600' : 'text-zinc-600')}>{m.on_time_rate}%</span>
                                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">SLA</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className={cn("text-xs font-bold", m.rejected > 0 ? 'text-rose-600' : 'text-zinc-600')}>{m.rejected}</span>
                                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Rej</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-6 flex justify-center">
                            <div className="bg-zinc-50/50 rounded-xl p-2 border border-zinc-100">
                              <Sparkline
                                data={m.weekly_trend.map(w => w.completed)}
                                color={m.completion_rate >= 80 ? '#10b981' : m.completion_rate >= 50 ? '#f59e0b' : '#ef4444'}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Refined Skill Matrix Section ── */}
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
                <Brain className="text-emerald-500" size={24} /> Talent Matrix
              </h2>
              <p className="text-sm text-zinc-500 font-medium">Cross-referencing team competencies against project requirements.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Heatmap Matrix (Larger) */}
              <div className="lg:col-span-8">
                <Card className="border-none shadow-2xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden">
                  <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Competency Heatmap</span>
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Expert</div>
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-zinc-100" /> None</div>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <SkillMatrixTable members={memberPerf} />
                  </CardContent>
                </Card>
              </div>

              {/* Right: Radar + Insights */}
              <div className="lg:col-span-4 space-y-8">
                <Card className="border-none bg-zinc-950 text-white rounded-4xl p-8 shadow-2xl shadow-zinc-900/30 h-fit">
                  <div className="text-center space-y-2 mb-10">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Gap Analysis</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Supply vs. Current Demand</p>
                  </div>
                  <div className="flex justify-center mb-8">
                    <div className="w-full max-w-[280px] aspect-square">
                      <SkillRadar data={skillData} />
                    </div>
                  </div>
                  
                  {/* Skill Insights Mini-Card */}
                  {/* ── Refined System Intelligence: Strategy Insight ── */}
                  <div className="bg-zinc-50 rounded-3xl p-6 space-y-4 border border-zinc-100 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                        <Zap size={14} className="text-zinc-400" /> Strategy Insight
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-emerald-50 text-[8px] font-bold text-emerald-600 uppercase tracking-wider border border-emerald-100">
                        Reliable
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                        {skillData.some(d => d.demand > d.supply) 
                          ? `A resource bottleneck was detected in ${skillData.filter(d => d.demand > d.supply).slice(0,2).map(d => d.subject).join(', ')}. Targeted skill development is recommended.`
                          : "Resource allocation is currently stable. Existing team expertise sufficiently covers all project requirements."}
                      </p>

                      <div className="pt-4 border-t border-zinc-200/60 flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>Analysis Confidence: 94%</span>
                        <span>v4.2.0</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* ── PERT & Dependency Analysis ── */}
          <div className="space-y-6 mt-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-zinc-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-zinc-900/20 h-full flex flex-col justify-center">
                  <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-3">
                    <FileText className="text-rose-500" /> PERT Context
                  </h2>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-medium mb-6">
                    The <strong className="text-rose-400">Critical Path</strong> (highlighted in rose) directly determines project completion. Any delay here delays the entire sprint.
                  </p>
                  <div className="space-y-3">
                    <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">ES / EF</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Early Start/Finish</span>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">LS / LF</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Late Start/Finish</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                    <Crosshair size={18} className="text-zinc-400" /> Dependency Graph
                  </h2>
                </div>
                <Card className="border border-zinc-200 bg-white overflow-hidden shadow-xl shadow-zinc-200/50 rounded-3xl">
                  <PertChart nodes={pertData.nodes} edges={pertData.edges} />
                </Card>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TeamAnalytics
