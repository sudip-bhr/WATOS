import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'

import type { MonthlyReport } from '@/types'

const ReportInbox = () => {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      // Admins fetch all reports for their organization
      const res = await client.get('/monthly-reports/')
      // Filter out drafts from inbox, admins should only see submitted/reviewed
      setReports(res.data.filter((r: MonthlyReport) => r.status !== 'draft'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await client.get('/monthly-reports/')
        if (!ignore) {
          setReports(res.data.filter((r: MonthlyReport) => r.status !== 'draft'))
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

  const handleMarkReviewed = async (reportId: string) => {
    try {
      await client.patch(`/monthly-reports/${reportId}`, { status: 'reviewed' })
      toast({ title: 'Report marked as reviewed' })
      fetchReports()
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full overflow-hidden">
      <div className="shrink-0 mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Report Inbox</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Review operator performance submissions.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 md:space-y-6 custom-scrollbar pb-10">
        {loading ? (
           <div className="space-y-4">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-3xl" />)}
           </div>
        ) : reports.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 bg-zinc-50/50 rounded-3xl border border-zinc-100 border-dashed">
             <Inbox size={40} className="text-zinc-300 mb-4" />
             <p className="text-zinc-500 text-sm font-medium">Inbox is empty. No reports.</p>
           </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="p-5 md:p-8 rounded-3xl border border-zinc-200 bg-white shadow-sm space-y-5 md:space-y-6 hover:border-zinc-300 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg md:text-xl font-black text-zinc-900 flex items-center gap-2">
                      <FileText size={18} className="text-zinc-400" /> {report.month_year}
                    </h3>
                    <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-2 ${
                      report.status === 'submitted' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] md:text-sm text-zinc-500 font-medium">
                    By Operator {report.operator_id.substring(0, 8)} • {format(new Date(report.submitted_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                
                {report.status === 'submitted' ? (
                  <Button 
                    onClick={() => handleMarkReviewed(report.id)} 
                    className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl h-10 px-6 gap-2"
                  >
                     <CheckCircle2 size={14} /> Mark Reviewed
                  </Button>
                ) : (
                  <div className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 rounded-xl">
                    <CheckCircle2 size={14} /> Reviewed
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100/50">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5">Achievements</h4>
                  <p className="text-xs md:text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{report.achievements || 'None reported.'}</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100/50">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2.5">Challenges</h4>
                  <p className="text-xs md:text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{report.challenges || 'None reported.'}</p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2.5">Support Needed</h4>
                  <p className="text-xs md:text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{report.support_needed || 'None reported.'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ReportInbox
