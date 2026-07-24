import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, Users, AlertCircle, ArrowRight, Zap, Bell, CheckCircle2, Loader2, MoveRight, UserMinus, UserPlus, Info } from 'lucide-react'
import client from '@/api/client'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ScrollArea } from '../../components/ui/scroll-area'
import type { Task } from '@/types'

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
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [suggestions, setSuggestions] = useState<RebalancingSuggestion[]>([])
  const [workloads, setWorkloads] = useState<UserWorkload[]>([])
  const [loading, setLoading] = useState(true)
  const [notifyingIds, setNotifyingIds] = useState<Set<string>>(new Set())
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set())

  // Manual rebalancing state
  const [selectedUser, setSelectedUser] = useState<UserWorkload | null>(null)
  const [userTasks, setUserTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string>('')

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
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
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const [sugRes, workRes] = await Promise.all([
          client.get('/workload/rebalancing'),
          client.get('/workload/utilization')
        ])
        if (!ignore) {
          setSuggestions(sugRes.data)
          setWorkloads(workRes.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const executeSuggestion = async (sug: RebalancingSuggestion) => {
    setExecutingIds(prev => new Set(prev).add(sug.task_id))
    try {
      await client.patch(`/tasks/${sug.task_id}`, {
        assignee_id: sug.suggested_assignee_id
      })
      toast({ title: 'Task reassigned', description: `"${sug.task_title}" → ${sug.suggested_assignee_name}` })
      fetchData()
    } catch {
      toast({ title: 'Reassignment failed', description: 'Could not reassign this task.', variant: 'destructive' })
    } finally {
      setExecutingIds(prev => { const s = new Set(prev); s.delete(sug.task_id); return s })
    }
  }

  const notifyOperatorAboutImbalance = async (sug: RebalancingSuggestion) => {
    setNotifyingIds(prev => new Set(prev).add(sug.task_id))
    try {
      await client.post('/notifications/', {
        type: 'overload',
        message: `Workload Alert: "${sug.task_title}" should be reassigned to ${sug.suggested_assignee_name}. Reason: ${sug.reason}. Expected risk reduction: ${Math.round(sug.risk_reduction * 100)}%.`,
        related_entity_id: sug.task_id,
        action_url: '/operator/board',
      })
      toast({ title: 'Operator notified', description: `Alert sent about "${sug.task_title}" rebalancing.` })
    } catch {
      toast({ title: 'Notification failed', description: 'Could not send alert. Try again.', variant: 'destructive' })
    } finally {
      setNotifyingIds(prev => { const s = new Set(prev); s.delete(sug.task_id); return s })
    }
  }

  const openRebalanceModal = async (u: UserWorkload) => {
    setSelectedUser(u)
    setIsModalOpen(true)
    setLoadingTasks(true)
    try {
      const res = await client.get('/tasks', {
        params: {
          assignee_id: u.user_id,
          status: 'todo,in_progress'
        }
      })
      setUserTasks(res.data)
    } catch {
      toast({ title: 'Fetch failed', description: 'Could not load member tasks.', variant: 'destructive' })
    } finally {
      setLoadingTasks(false)
    }
  }

  const manualReassign = async (taskId: string) => {
    if (!targetUserId) return
    setReassigningTaskId(taskId)
    try {
      await client.patch(`/tasks/${taskId}`, { assignee_id: targetUserId })
      const targetName = workloads.find(w => w.user_id === targetUserId)?.full_name
      toast({ title: 'Task shifted', description: `Successfully moved to ${targetName}` })

      // Update local state to reflect change immediately
      setUserTasks(prev => prev.filter(t => t.id !== taskId))
      fetchData()
    } catch {
      toast({ title: 'Shift failed', description: 'Manual reassignment encountered an error.', variant: 'destructive' })
    } finally {
      setReassigningTaskId(null)
    }
  }

  const overloadedCount = workloads.filter(w => w.utilization > 0.8).length
  const avgUtil = workloads.length ? Math.round(workloads.reduce((a, b) => a + b.utilization, 0) / workloads.length * 100) : 0

  return (
    <div className="p-4 md:p-8 space-y-10 md:space-y-12 max-w-7xl mx-auto pb-20">
      {/* Header with Visual Impact */}
      
        <div className="relative z-10 space-y-3">

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
            {isAdmin ? 'Workload Oversight' : 'Workload Optimization'}
          </h1>
        </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-4xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-3xl" />
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Avg Utilization */}
            <Card className="border-none bg-emerald-50 text-emerald-900 rounded-4xl shadow-sm overflow-hidden group h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[9px] border-emerald-200 text-emerald-700 font-black uppercase tracking-widest px-2"
                  >
                    Live Load
                  </Badge>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">
                    Avg Utilization
                  </p>

                  <div className="text-3xl font-black tracking-tight">
                    {avgUtil}%
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Overloaded Members */}
            <Card
              className={cn(
                "border-none rounded-4xl shadow-sm overflow-hidden transition-all duration-300 group h-full",
                overloadedCount > 0
                  ? "bg-amber-50 shadow-amber-900/5"
                  : "bg-white/80 backdrop-blur-md border border-zinc-200/50"
              )}
            >
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border",
                      overloadedCount > 0
                        ? "bg-amber-100 border-amber-200"
                        : "bg-zinc-100 border-zinc-200"
                    )}
                  >
                    <Users
                      className={cn(
                        "h-5 w-5",
                        overloadedCount > 0 ? "text-amber-600" : "text-zinc-500"
                      )}
                    />
                  </div>

                  {overloadedCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[9px] font-black uppercase tracking-widest px-2 bg-amber-500 text-white border-none"
                    >
                      Action Needed
                    </Badge>
                  )}
                </div>

                <div className="mt-6">
                  <p
                    className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
                      overloadedCount > 0 ? "text-amber-600/70" : "text-zinc-400"
                    )}
                  >
                    Overloaded Members
                  </p>

                  <div
                    className={cn(
                      "text-3xl font-black tracking-tight",
                      overloadedCount > 0 ? "text-amber-900" : "text-zinc-900"
                    )}
                  >
                    {overloadedCount}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ML Suggestions */}
            <Card className="border-none bg-sky-50 text-sky-900 rounded-4xl shadow-sm overflow-hidden group h-full">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-sky-600" />
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[9px] border-sky-200 bg-sky-100 text-sky-700 font-black uppercase tracking-widest px-2"
                  >
                    AI Assisted
                  </Badge>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 mb-1">
                    ML Suggestions
                  </p>

                  <div className="text-3xl font-black tracking-tight">
                    {suggestions.length}
                  </div>
                </div>
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
                  <div className="p-8 border-2 border-dashed rounded-3xl text-center space-y-2 border-zinc-100 bg-white">
                    <CheckCircle2 className="mx-auto text-emerald-400" size={24} />
                    <p className="text-zinc-500 font-medium">Team is well-balanced. No re-balancing needed.</p>
                  </div>
                ) : suggestions.map((sug) => (
                  <Card key={sug.task_id} className="group hover:border-zinc-900 transition-all overflow-hidden border-l-4 border-l-zinc-900 rounded-3xl">
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
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Reassign:</div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <div className="h-7 w-7 rounded bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">
                            {sug.suggested_assignee_name[0].toUpperCase()}
                          </div>
                          {sug.suggested_assignee_name}
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto" />
                      </div>

                      <p className="text-xs text-zinc-500 mt-4 leading-relaxed italic border-l-2 border-zinc-100 pl-4">
                        "{sug.reason}"
                      </p>

                      <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                        {/* Admin-only: Notify Operator */}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-widest h-9 px-5 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl"
                            onClick={() => notifyOperatorAboutImbalance(sug)}
                            disabled={notifyingIds.has(sug.task_id)}
                          >
                            {notifyingIds.has(sug.task_id) ? (
                              <><Loader2 size={12} className="animate-spin" /> Sending…</>
                            ) : (
                              <><Bell size={12} /> Notify Operator</>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="text-[10px] font-bold uppercase tracking-widest h-9 px-6 rounded-xl"
                          onClick={() => executeSuggestion(sug)}
                          disabled={executingIds.has(sug.task_id)}
                        >
                          {executingIds.has(sug.task_id) ? (
                            <><Loader2 size={12} className="animate-spin" /> Reassigning…</>
                          ) : 'Execute Shift'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Team Utilization Chart */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <Users size={18} className="text-zinc-400" /> Member Capacity
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-3 py-1 bg-zinc-100 rounded-full">
                  Real-time Load
                </span>
              </div>

              <div className="space-y-4">
                {workloads.map((u) => (
                  <Card key={u.user_id} className="border-none shadow-2xl shadow-zinc-200/40 bg-white rounded-4xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center text-xs font-bold text-white shadow-lg",
                              u.utilization > 0.8 ? "bg-rose-500 shadow-rose-500/20" :
                                u.utilization > 0.5 ? "bg-amber-500 shadow-amber-500/20" :
                                  "bg-emerald-500 shadow-emerald-500/20"
                            )}>
                              {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                {u.full_name}
                                {u.utilization > 0.8 && (
                                  <Badge variant="destructive" className="h-4 text-[8px] font-bold uppercase px-1.5 rounded-md">Critical</Badge>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                                {u.assigned_tasks} Parallel Tasks
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-lg font-bold",
                              u.utilization > 0.8 ? "text-rose-600" : "text-zinc-900"
                            )}>
                              {Math.round(u.utilization * 100)}%
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg"
                              onClick={() => openRebalanceModal(u)}
                            >
                              <MoveRight size={12} className="mr-1.5" /> Rebalance
                            </Button>
                          </div>
                        </div>

                        <div className="relative h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 transition-all duration-1000",
                              u.utilization > 0.8 ? "bg-rose-500" : u.utilization > 0.5 ? "bg-amber-400" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(u.utilization * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ── System Intelligence: Optimization Core ── */}
              <Card className="border border-zinc-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100">
                      <Brain size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">System Intelligence</div>
                      <div className="text-sm font-bold text-zinc-900">Optimization Engine</div>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm text-zinc-600 leading-relaxed font-medium">
                    <p>
                      WATOS dynamically calculates utilization by weight-matching task complexity against member skill proficiency.
                    </p>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-500">
                        Rebalancing suggestions prioritize minimal context-switch overhead and are refined through historical velocity patterns.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Manual Rebalancing Modal ── */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-125 rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
              <div className="bg-zinc-900 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <UserMinus size={60} />
                </div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
                    Rebalance Load
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 font-medium">
                    Move tasks from <strong className="text-white">{selectedUser?.full_name}</strong> to stabilize capacity.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">1. Select Target Member</h4>
                  <Select value={targetUserId || undefined} onValueChange={setTargetUserId}>
                    <SelectTrigger className="h-12 rounded-2xl border-zinc-100 bg-zinc-50 font-bold text-zinc-900">
                      <SelectValue placeholder="Choose recipient..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-100 shadow-2xl bg-white">
                      {workloads.filter(w => w.user_id !== selectedUser?.user_id).map(w => (
                        <SelectItem key={w.user_id} value={w.user_id} className="rounded-xl font-medium focus:bg-zinc-50">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{w.full_name}</span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                              w.utilization > 0.8 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {Math.round(w.utilization * 100)}% Load
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">2. Select Task to Shift</h4>
                  <ScrollArea className="h-75 pr-4 -mr-4">
                    {loadingTasks ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                      </div>
                    ) : userTasks.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400 text-sm">No active tasks to move.</div>
                    ) : (
                      <div className="space-y-3">
                        {userTasks.map(task => (
                          <div key={task.id} className="p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between group transition-all hover:bg-white hover:border-zinc-200">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="text-sm font-bold text-zinc-900 truncate">{task.title}</div>
                              <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Priority: {task.priority_score}</div>
                            </div>
                            <Button
                              size="sm"
                              className={cn(
                                "shrink-0 h-9 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 transition-all duration-200 border",
                                !targetUserId || reassigningTaskId === task.id
                                  ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-60"
                                  : "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 active:scale-95 cursor-pointer"
                              )}
                              onClick={() => manualReassign(task.id)}
                              disabled={!targetUserId || reassigningTaskId === task.id}
                            >
                              {reassigningTaskId === task.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <><UserPlus size={12} /> Move</>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default TeamWorkload
