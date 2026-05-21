import { useMemo } from 'react'
import type { Task } from '@/types'
import { getClusterStyle, getComplexityLabel, getComplexityStyle } from '@/lib/clusters'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, Clock, BarChart3, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClusterChartProps {
  tasks: Task[]
}

export default function ClusterChart({ tasks }: ClusterChartProps) {
  // Aggregate data by cluster_id
  const { totalTasks, totalWorkload, clustersData } = useMemo(() => {
    const clusterMap: Record<number, { count: number; workload: number }> = {}
    let totalTasksCount = 0
    let totalWorkloadHours = 0

    tasks.forEach((t) => {
      // Only aggregate clustered tasks (including DBSCAN noise as -1)
      if (t.cluster_id !== undefined && t.cluster_id !== null) {
        const cid = t.cluster_id
        if (!clusterMap[cid]) {
          clusterMap[cid] = { count: 0, workload: 0 }
        }
        clusterMap[cid].count += 1
        const hours = t.predicted_hours || t.effort_hours || 0
        clusterMap[cid].workload += hours
        
        totalTasksCount += 1
        totalWorkloadHours += hours
      }
    })

    // Map to list sorted by cluster_id (noise/outliers -1 goes to the end)
    const sortedData = Object.keys(clusterMap)
      .map((key) => {
        const cid = parseInt(key, 10)
        const style = getClusterStyle(cid)
        return {
          clusterId: cid,
          count: clusterMap[cid].count,
          workload: clusterMap[cid].workload,
          name: style.name,
          color: style.fill,
          accent: style.accent,
          badgeBg: style.badgeBg,
          badgeText: style.badgeText
        }
      })
      .sort((a, b) => {
        if (a.clusterId === -1) return 1
        if (b.clusterId === -1) return -1
        return a.clusterId - b.clusterId
      })

    return {
      totalTasks: totalTasksCount,
      totalWorkload: totalWorkloadHours,
      clustersData: sortedData
    }
  }, [tasks])

  // Donut chart calculations
  const R = 50
  const C = 2 * Math.PI * R
  let cumulativeOffset = 0

  const donutSegments = useMemo(() => {
    if (totalTasks === 0) return []
    return clustersData.map((d) => {
      const percentage = d.count / totalTasks
      const strokeLength = percentage * C
      const strokeOffset = cumulativeOffset
      cumulativeOffset += strokeLength

      return {
        ...d,
        percentage,
        strokeLength,
        strokeOffset: -strokeOffset
      }
    })
  }, [clustersData, totalTasks, C])

  const maxWorkload = useMemo(() => {
    if (clustersData.length === 0) return 0
    return Math.max(...clustersData.map((d) => d.workload), 1)
  }, [clustersData])

  const complexityData = useMemo(() => {
    let lowCount = 0
    let medCount = 0
    let highCount = 0

    tasks.forEach((t) => {
      const label = getComplexityLabel(t.complexity)
      if (label === 'Low') lowCount++
      else if (label === 'Medium') medCount++
      else if (label === 'High') highCount++
    })

    const total = lowCount + medCount + highCount
    return {
      total,
      low: { count: lowCount, pct: total > 0 ? (lowCount / total) * 100 : 0 },
      med: { count: medCount, pct: total > 0 ? (medCount / total) * 100 : 0 },
      high: { count: highCount, pct: total > 0 ? (highCount / total) * 100 : 0 }
    }
  }, [tasks])

  const clusterGroupings = useMemo(() => {
    const groupings: Record<'Low' | 'Medium' | 'High', { id: number; name: string; color: string; count: number; avgComplexity: number }[]> = {
      Low: [],
      Medium: [],
      High: []
    }

    const clusterMap: Record<number, Task[]> = {}
    tasks.forEach(t => {
      if (t.cluster_id !== undefined && t.cluster_id !== null) {
        const cid = t.cluster_id
        if (!clusterMap[cid]) {
          clusterMap[cid] = []
        }
        clusterMap[cid].push(t)
      }
    })

    Object.entries(clusterMap).forEach(([cidStr, cTasks]) => {
      const cid = Number(cidStr)
      const avg = cTasks.reduce((sum, t) => sum + t.complexity, 0) / cTasks.length
      const label = getComplexityLabel(avg)
      const style = getClusterStyle(cid)
      groupings[label].push({
        id: cid,
        name: style.name,
        color: style.fill,
        count: cTasks.length,
        avgComplexity: avg
      })
    })

    return groupings
  }, [tasks])

  if (totalTasks === 0) {
    return (
      <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl p-2 col-span-1 lg:col-span-12">
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300">
            <Brain size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-800">No Clustered Tasks</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              We couldn't find any clustered tasks. Retrain the model in ML Config to generate task clusters.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Donut Chart: Task Distribution */}
      <div className="lg:col-span-6">
        <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden h-full">
          <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Task Count Distribution</span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100/50">
              {totalTasks} Tasks Clustered
            </span>
          </div>
          <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-around gap-8">
            {/* SVG Donut Chart */}
            <div className="relative shrink-0 select-none">
              <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={R}
                  fill="transparent"
                  stroke="#f4f4f5"
                  strokeWidth="14"
                />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeDasharray={`${seg.strokeLength} ${C}`}
                    strokeDashoffset={seg.strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  />
                ))}
              </svg>
              {/* Inner details */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-zinc-900 leading-none">{totalTasks}</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 mt-1">Total Tasks</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="flex-1 space-y-3.5 w-full">
              {donutSegments.map((seg) => (
                <div key={seg.clusterId} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">
                      {seg.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-800">{seg.count} tasks</span>
                    <span className="text-[10px] text-zinc-400 font-bold bg-zinc-50 border border-zinc-100 rounded-md px-1.5 py-0.5 shrink-0">
                      {Math.round(seg.percentage * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Workload Distribution */}
      <div className="lg:col-span-6">
        <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden h-full">
          <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Workload distribution (hours)</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/50">
              {totalWorkload.toFixed(0)} Hrs Total
            </span>
          </div>
          <CardContent className="p-8 space-y-5">
            {clustersData.map((d) => {
              const workloadPercentage = totalWorkload > 0 ? (d.workload / totalWorkload) * 100 : 0
              const progressWidth = maxWorkload > 0 ? (d.workload / maxWorkload) * 100 : 0

              return (
                <div key={d.clusterId} className="space-y-2 group">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors">
                        {d.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-zinc-900">{d.workload.toFixed(1)} hrs</span>
                      <span className="text-[10px] font-bold text-zinc-400">({workloadPercentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-100/80 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${progressWidth}%`,
                        backgroundColor: d.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Stacked Row: Complexity Distribution */}
      <div className="lg:col-span-6">
        <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden h-full">
          <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-zinc-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Workload Complexity Profile</span>
            </div>
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200/50">
              Distribution
            </span>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>Low Complexity</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900">
                    <span>{complexityData.low.count} tasks</span>
                    <span className="text-zinc-400">({complexityData.low.pct.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${complexityData.low.pct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span>Medium Complexity</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900">
                    <span>{complexityData.med.count} tasks</span>
                    <span className="text-zinc-400">({complexityData.med.pct.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${complexityData.med.pct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span>High Complexity</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-900">
                    <span>{complexityData.high.count} tasks</span>
                    <span className="text-zinc-400">({complexityData.high.pct.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${complexityData.high.pct}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Groupings by Average Complexity */}
      <div className="lg:col-span-6">
        <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden h-full">
          <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Clusters by Complexity Category</span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100/50">
              Categorized
            </span>
          </div>
          <CardContent className="p-8">
            <div className="space-y-6">
              {(['Low', 'Medium', 'High'] as const).map((category) => {
                const clusters = clusterGroupings[category]
                const style = getComplexityStyle(category)
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-1.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", style.dot)} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900">
                        {category} Complexity Clusters
                      </span>
                    </div>
                    {clusters.length === 0 ? (
                      <p className="text-xs text-zinc-300 font-medium italic pl-4 py-1">No clusters classified here</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pl-4 py-1">
                        {clusters.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100/50 hover:border-zinc-200 hover:bg-white transition-all duration-300">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: c.color }} />
                              <span className="text-xs font-bold text-zinc-800 truncate">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-bold text-zinc-400 bg-white border border-zinc-150 px-1.5 py-0.5 rounded-md">
                                {c.count}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-zinc-500">
                                {c.avgComplexity.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

