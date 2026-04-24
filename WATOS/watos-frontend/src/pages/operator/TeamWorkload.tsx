import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, Users, AlertCircle, ArrowRight, Zap } from 'lucide-react'
import client from '@/api/client'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface RebalancingSuggestion {
  task_id: string
  task_title: string
  current_assignee_id: string
  suggested_assignee_id: string
  suggested_assignee_name: string
  reason: string
  risk_reduction: number
}

interface UserWorkload {
  user_id: string
  full_name: string
  utilization: number
  assigned_tasks: number
  skills: string[]
}

const TeamWorkload = () => {
  const [suggestions, setSuggestions] = useState<RebalancingSuggestion[]>([])
  const [workloads, setWorkloads] = useState<UserWorkload[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sugRes, workRes] = await Promise.all([
        client.get('/workload/rebalancing'),
        client.get('/workload/utilization')
      ])
      setSuggestions(sugRes.data)
      setWorkloads(workRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const executeSuggestion = async (sug: RebalancingSuggestion) => {
    try {
      await client.patch(`/tasks/${sug.task_id}`, { 
        assignee_id: sug.suggested_assignee_id 
      })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Workload</h1>
          <p className="text-zinc-500 mt-1">Cross-team capacity analysis and ML-driven re-balancing.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-zinc-900 text-white border-none shadow-xl shadow-zinc-900/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest opacity-70">Avg Utilization</CardTitle>
                <TrendingUp className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {workloads.length ? Math.round(workloads.reduce((a, b) => a + b.utilization, 0) / workloads.length * 100) : 0}%
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "border-none shadow-xl",
              workloads.filter(w => w.utilization > 0.8).length > 0 ? "bg-amber-50" : "bg-white border-zinc-200"
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className={cn(
                  "text-xs font-black uppercase tracking-widest",
                  workloads.filter(w => w.utilization > 0.8).length > 0 ? "text-amber-600" : "text-zinc-500"
                )}>Overloaded Members</CardTitle>
                <Users className={cn("h-4 w-4", workloads.filter(w => w.utilization > 0.8).length > 0 ? "text-amber-600" : "text-zinc-400")} />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  workloads.filter(w => w.utilization > 0.8).length > 0 ? "text-amber-900" : "text-zinc-900"
                )}>
                  {workloads.filter(w => w.utilization > 0.8).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">ML Suggestions</CardTitle>
                <Brain className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-zinc-900">{suggestions.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Re-balancing Suggestions */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-zinc-900 fill-current" />
                <h2 className="text-lg font-bold tracking-tight">Proactive Re-balancing</h2>
              </div>
              
              <div className="space-y-4">
                {suggestions.length === 0 ? (
                  <div className="p-8 border-2 border-dashed rounded-2xl text-center text-zinc-400 border-zinc-100 bg-white">
                    Team is currently well-balanced. No critical re-balancing needed.
                  </div>
                ) : suggestions.map((sug) => (
                  <Card key={sug.task_id} className="group hover:border-zinc-900 transition-all overflow-hidden border-l-4 border-l-zinc-900">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-zinc-900 transition-colors">{sug.task_title}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            <AlertCircle size={12} />
                            Delay Risk Intervention
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-zinc-900 text-white border-none px-3">
                          -{Math.round(sug.risk_reduction * 100)}% Risk
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Reassign:</div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <div className="h-7 w-7 rounded bg-zinc-900 text-white flex items-center justify-center text-[10px] font-black">
                            {sug.suggested_assignee_name[0].toUpperCase()}
                          </div>
                          {sug.suggested_assignee_name}
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto" />
                      </div>

                      <p className="text-xs text-zinc-500 mt-4 leading-relaxed italic border-l-2 border-zinc-100 pl-4">
                        "{sug.reason}"
                      </p>
                      
                      <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-end">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="text-[10px] font-black uppercase tracking-widest h-9 px-6"
                          onClick={() => executeSuggestion(sug)}
                        >
                          Execute Shift
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Team Utilization Chart */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold tracking-tight">Workload Distribution</h2>
              <Card className="p-8 border-zinc-200 bg-white">
                <div className="space-y-8">
                  {workloads.map((user) => (
                    <div key={user.user_id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <div className="text-sm font-bold">{user.full_name}</div>
                          <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{user.assigned_tasks} active tasks</div>
                        </div>
                        <div className="text-xs font-black">
                          {Math.round(user.utilization * 100)}%
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            user.utilization > 0.8 ? "bg-rose-500" : user.utilization > 0.5 ? "bg-amber-400" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(user.utilization * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              <div className="p-6 rounded-2xl bg-zinc-900 text-white space-y-3">
                <h5 className="font-black text-xs uppercase tracking-[0.2em] opacity-70">Engine Awareness</h5>
                <p className="text-[11px] leading-relaxed opacity-80 font-medium">
                  WATOS AI tracks cross-skill availability. If a specialized task becomes at-risk, the engine will only suggest re-balancing to members with high skill similarity (Cosine Similarity &gt; 0.7).
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TeamWorkload
