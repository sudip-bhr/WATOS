import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Download, FileText, TrendingUp, AlertTriangle, Crosshair } from 'lucide-react'
import client from '@/api/client'
import PertChart from '@/components/analytics/PertChart'
import { useTaskStore } from '@/store/taskStore'
import { Skeleton } from '@/components/ui/skeleton'

// Custom Skill Radar SVG Component
const SkillRadar = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-zinc-400 text-sm font-medium">No skill data available</div>

  const size = 300
  const center = size / 2
  const radius = (size / 2) * 0.7
  const angleStep = (Math.PI * 2) / data.length

  const getPoint = (val: number, max: number, index: number) => {
    const r = (val / Math.max(max, 1)) * radius
    const angle = index * angleStep - Math.PI / 2
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    }
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.supply, d.demand)), 1)
  
  const supplyPoints = data.map((d, i) => getPoint(d.supply, maxVal, i))
  const demandPoints = data.map((d, i) => getPoint(d.demand, maxVal, i))
  
  const supplyPath = supplyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const demandPath = demandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {/* Background Grids */}
      {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
        <path
          key={r}
          d={data.map((_, i) => {
            const p = getPoint(r * maxVal, maxVal, i)
            return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
          }).join(' ') + ' Z'}
          className="fill-none stroke-zinc-200"
          strokeWidth="1"
        />
      ))}

      {/* Axes */}
      {data.map((_, i) => {
        const p = getPoint(maxVal, maxVal, i)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            className="stroke-zinc-200"
            strokeWidth="1"
          />
        )
      })}

      {/* Labels */}
      {data.map((d, i) => {
        const p = getPoint(maxVal * 1.2, maxVal, i)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            alignmentBaseline="middle"
            className="text-[10px] font-bold fill-zinc-500 uppercase tracking-wider"
          >
            {d.skill}
          </text>
        )
      })}

      {/* Data Polygons */}
      <path
        d={supplyPath}
        className="fill-emerald-500/20 stroke-emerald-500"
        strokeWidth="2"
      />
      <path
        d={demandPath}
        className="fill-rose-500/20 stroke-rose-500"
        strokeWidth="2"
      />
      
      {/* Legend */}
      <g transform={`translate(${size - 80}, ${size - 40})`}>
        <circle cx="0" cy="0" r="4" className="fill-emerald-500" />
        <text x="10" y="3" className="text-[8px] font-bold fill-zinc-500 uppercase">Supply</text>
        <circle cx="0" cy="15" r="4" className="fill-rose-500" />
        <text x="10" y="18" className="text-[8px] font-bold fill-zinc-500 uppercase">Demand</text>
      </g>
    </svg>
  )
}

const TeamAnalytics = () => {
  const { tasks, loading: tasksLoading, fetchTasks } = useTaskStore()
  const [skillData, setSkillData] = useState<any[]>([])
  const [pertData, setPertData] = useState<{nodes: any[], edges: any[]}>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    
    // Fetch skill gap and PERT data
    Promise.all([
      client.get('/analytics/skills-gap').catch(() => ({ data: { skills: [] } })),
      client.get('/analytics/pert').catch(() => ({ data: { nodes: [], edges: [] } }))
    ]).then(([skillRes, pertRes]) => {
      setSkillData(skillRes.data.skills || [])
      setPertData(pertRes.data || { nodes: [], edges: [] })
    }).finally(() => setLoading(false))
  }, [fetchTasks])

  const exportReport = async () => {
    try {
      const response = await client.get('/reports/generate?format=json', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'watos_report.json')
      document.body.appendChild(link)
      link.click()
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const highRiskCount = activeTasks.filter(t => t.delay_prob > 0.6).length
  const avgComplexity = activeTasks.length ? activeTasks.reduce((acc, curr) => acc + curr.complexity, 0) / activeTasks.length : 0

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
          <p className="text-zinc-500 mt-1">Deep-dive into project risk, skills gaps, and task dependencies.</p>
        </div>
        <Button onClick={exportReport} className="gap-2 bg-zinc-900 text-white rounded-xl shadow-xl shadow-zinc-900/20">
          <Download size={16} /> JSON Export
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl shadow-emerald-900/5 bg-emerald-50/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600">Active Tasks</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-950">{activeTasks.length}</div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-rose-900/5 bg-rose-50/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-rose-600">High Risk Tasks</CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-950">{highRiskCount}</div>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Avg Complexity</CardTitle>
                <Crosshair className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900">{avgComplexity.toFixed(1)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <FileText size={18} className="text-zinc-400" /> PERT Dependency Chart
              </h2>
              <Card className="border border-zinc-200 bg-white overflow-hidden p-6 h-[500px]">
                <PertChart nodes={pertData.nodes} edges={pertData.edges} />
              </Card>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Brain size={18} className="text-zinc-400" /> Skill Supply vs Demand
              </h2>
              <Card className="border border-zinc-200 bg-white p-6 h-[500px] flex items-center justify-center">
                <div className="w-full max-w-[300px] aspect-square">
                  <SkillRadar data={skillData} />
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TeamAnalytics
