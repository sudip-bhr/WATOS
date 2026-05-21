import { useState, useEffect } from 'react'
import { AxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, FileText, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useConfirm } from '@/hooks/useConfirm'

import type { MonthlyReport } from '@/types'

const MonthlyReports = () => {
  const confirm = useConfirm()
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<MonthlyReport | null>(null)

  const [form, setForm] = useState({
    achievements: '',
    challenges: '',
    support_needed: ''
  })

  const fetchReports = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await client.get('/monthly-reports/')
      setReports(res.data)
      const draft = res.data.find((r: MonthlyReport) => r.status === 'draft')
      if (draft) {
        setCurrentDraft(draft)
        setForm({
          achievements: draft.achievements || '',
          challenges: draft.challenges || '',
          support_needed: draft.support_needed || ''
        })
      }
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
        const res = await client.get('/monthly-reports/')
        if (!ignore) {
          setReports(res.data)
          const draft = res.data.find((r: MonthlyReport) => r.status === 'draft')
          if (draft) {
            setCurrentDraft(draft)
            setForm({
              achievements: draft.achievements || '',
              challenges: draft.challenges || '',
              support_needed: draft.support_needed || ''
            })
          }
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

  const handleStartDraft = async () => {
    try {
      const res = await client.post('/monthly-reports/', {
        achievements: '',
        challenges: '',
        support_needed: ''
      })
      setCurrentDraft(res.data)
      setComposing(true)
      fetchReports()
    } catch (err: unknown) {
      const axiosError = err as AxiosError
      if (axiosError.response?.status === 400) {
        toast({ title: 'A draft already exists for this month', variant: 'destructive' })
      } else {
        toast({ title: 'Failed to create draft', variant: 'destructive' })
      }
    }
  }

  const handleSaveDraft = async () => {
    if (!currentDraft) return
    try {
      await client.patch(`/monthly-reports/${currentDraft.id}`, form)
      toast({ title: 'Draft saved' })
      fetchReports()
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const handleSubmit = async () => {
    if (!currentDraft) return
    const ok = await confirm({
      title: 'Submit Monthly Report?',
      description: 'Are you sure you want to submit this report? It cannot be edited after submission.',
      confirmText: 'Submit Report',
      cancelText: 'Keep Editing'
    })
    if (!ok) return
    try {
      await client.patch(`/monthly-reports/${currentDraft.id}`, { ...form, status: 'submitted' })
      toast({ title: 'Report submitted successfully' })
      setComposing(false)
      setCurrentDraft(null)
      fetchReports()
    } catch {
      toast({ title: 'Failed to submit', variant: 'destructive' })
    }
  }

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="shrink-0 mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Reports</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Submit your team's monthly performance analysis.</p>
        </div>
        {!composing && (
          <Button 
            onClick={() => {
              if (currentDraft) setComposing(true)
              else handleStartDraft()
            }} 
            className="w-full sm:w-auto gap-2 bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 rounded-xl h-11 px-6"
          >
            <FileText size={16} />
            {currentDraft ? 'Resume Draft' : 'Start Monthly Report'}
          </Button>
        )}
      </div>

      {composing ? (
        <div className="flex-1 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 md:p-8 space-y-6 md:space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-6 gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-zinc-900">Report for {format(new Date(), 'MMMM yyyy')}</h2>
              <p className="text-xs md:text-sm text-zinc-500 mt-1">Status: Draft</p>
            </div>
            <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
              <Button variant="outline" onClick={() => setComposing(false)} className="rounded-xl h-10 text-xs md:text-sm">Cancel</Button>
              <Button variant="secondary" onClick={handleSaveDraft} className="rounded-xl h-10 gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs md:text-sm">
                <FileText size={14} className="hidden sm:block" /> Save
              </Button>
              <Button onClick={handleSubmit} className="col-span-2 md:col-auto rounded-xl h-10 gap-2 bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 text-xs md:text-sm">
                <Send size={14} className="hidden sm:block" /> Submit Report
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-bold text-zinc-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Key Achievements
              </Label>
              <Textarea 
                value={form.achievements} 
                onChange={e => setForm({...form, achievements: e.target.value})}
                placeholder="What was accomplished this month?"
                className="min-h-[100px] md:min-h-[120px] bg-zinc-50 border-zinc-200 resize-y text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-bold text-zinc-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Challenges
              </Label>
              <Textarea 
                value={form.challenges} 
                onChange={e => setForm({...form, challenges: e.target.value})}
                placeholder="What challenges delayed progress?"
                className="min-h-[100px] md:min-h-[120px] bg-zinc-50 border-zinc-200 resize-y text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs md:text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" /> Support Needed
              </Label>
              <Textarea 
                value={form.support_needed} 
                onChange={e => setForm({...form, support_needed: e.target.value})}
                placeholder="Any resources needed?"
                className="min-h-[80px] md:min-h-[100px] bg-zinc-50 border-zinc-200 resize-y text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-4">
          {loading ? (
             <div className="space-y-4">
               {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
             </div>
          ) : reports.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 bg-zinc-50/50 rounded-3xl border border-zinc-100 border-dashed">
               <FileText size={48} className="text-zinc-300 mb-4" />
               <p className="text-zinc-500 font-medium">No reports yet.</p>
             </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="p-5 md:p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center gap-4 md:gap-6 justify-between group hover:border-zinc-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base md:text-lg font-bold text-zinc-900 flex items-center gap-2">
                      <Calendar size={18} className="text-zinc-400" /> {report.month_year}
                    </h3>
                    <Badge variant="outline" className={`text-[9px] md:text-[10px] uppercase tracking-widest ${
                      report.status === 'draft' ? 'bg-zinc-100 text-zinc-600 border-transparent' :
                      report.status === 'submitted' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {report.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs font-medium text-zinc-500">
                     <span>Created: {format(new Date(report.created_at), 'MMM dd, yyyy')}</span>
                     {report.submitted_at && <span>Submitted: {format(new Date(report.submitted_at), 'MMM dd, yyyy')}</span>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {report.status === 'draft' ? (
                    <Button onClick={() => { setCurrentDraft(report); setComposing(true) }} className="w-full md:w-auto bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl h-10 px-6 text-xs md:text-sm">
                       Continue Draft
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full md:w-auto font-bold rounded-xl h-10 px-6 text-xs md:text-sm">
                       View Details
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default MonthlyReports
