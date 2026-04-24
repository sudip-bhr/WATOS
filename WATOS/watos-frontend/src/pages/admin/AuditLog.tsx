import { useState, useEffect } from 'react'
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
  details: any
}

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    client.get('/audit-logs')
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
    <div className="h-screen flex flex-col p-8 max-w-7xl mx-auto w-full">
      <div className="shrink-0 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">System Audit Log</h1>
        <p className="text-zinc-500 mt-1">Immutable record of all state-changing actions across the platform.</p>
      </div>

      {error ? (
        <Card className="border-amber-200 bg-amber-50 p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-amber-900">Backend API Missing</h2>
          <p className="text-sm text-amber-700 mt-2 max-w-md">
            The <code>GET /api/v1/audit-logs</code> endpoint has not been implemented yet.
            The AuditLogMiddleware is writing to the DB, but the reader API is pending.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 mb-6 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search by action, user, or entity type..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white border-zinc-200 h-11 rounded-xl shadow-sm"
              />
            </div>
            <button className="h-11 px-4 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50">
              <Filter size={16} /> Filters
            </button>
          </div>

          <div className="flex-1 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center h-full">
                <Activity size={48} className="text-zinc-200 mb-4" />
                No audit logs match your search.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 font-bold tracking-wider">User</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Action</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Entity</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-900">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-zinc-400" />
                          {log.user_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="font-bold bg-white uppercase tracking-wider text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-600 font-mono text-xs">
                        {log.entity_type} <span className="opacity-50">#{log.entity_id?.substring(0,8)}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-zinc-500 font-mono text-[10px]">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AuditLogPage
