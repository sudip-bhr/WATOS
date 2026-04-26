import { useState, useEffect, type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Activity, Clock, User, Filter, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import client from '@/api/client'
import { format } from 'date-fns'

interface AuditLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  user_email: string
  created_at: string
  details: ReactNode
}

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    client.get('/org/audit-logs')
      .then(res => setLogs(res.data))
      .catch(err => {
        if (err.response?.status === 404) {
          setError(true) // Endpoint pending
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.user_email.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="shrink-0 mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">System Audit Log</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">Immutable record of all actions across the platform.</p>
      </div>

      {error ? (
        <Card className="border-amber-200 bg-amber-50 p-6 md:p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-amber-900">Backend API Missing</h2>
          <p className="text-xs md:text-sm text-amber-700 mt-2 max-w-md">
            The Audit reader API is pending.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search logs..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white border-zinc-200 h-11 rounded-xl shadow-sm text-sm"
              />
            </div>
            <button className="h-11 px-4 flex items-center justify-center gap-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50">
              <Filter size={16} /> <span className="sm:inline">Filters</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center h-full">
                  <Activity size={40} className="text-zinc-200 mb-4" />
                  <p className="text-sm font-medium">No audit logs match your search.</p>
                </div>
              ) : (
                <div className="min-w-[900px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-zinc-400 uppercase font-black tracking-widest bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Entity</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-500 text-[11px]">
                            <div className="flex items-center gap-2 font-medium">
                              <Clock size={12} className="text-zinc-300" />
                              {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-900 text-xs">
                            <div className="flex items-center gap-2">
                              <User size={12} className="text-zinc-400" />
                              {log.user_email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="font-black bg-white uppercase tracking-wider text-[9px] px-2 py-0.5 border-zinc-200 text-zinc-600">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-600 font-mono text-[10px]">
                            {log.entity_type} <span className="text-zinc-300">#{log.entity_id?.substring(0,8)}</span>
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-zinc-400 font-mono text-[9px]">
                            {JSON.stringify(log.details)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AuditLogPage
