import { useState, useEffect } from 'react'
import { AxiosError } from 'axios'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Building, Save, ShieldAlert, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'
import type { User } from '@/types'

interface OrgSettings {
  name: string
  domain: string
  max_users: number
  require_mfa: boolean
  session_timeout_minutes: number
  allow_public_registration: boolean
}

interface OrgStats {
  total: number
  admins: number
  operators: number
  members: number
}

const OrgSettingsPage = () => {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [settingsRes, usersRes] = await Promise.all([
          client.get('/org/settings'),
          client.get('/users/').catch(() => ({ data: [] })),
        ])
        const data = settingsRes.data
        setSettings({
          name: data.name || '',
          domain: data.domain || '',
          max_users: data.max_users || 100,
          require_mfa: !!data.require_mfa,
          session_timeout_minutes: data.session_timeout_minutes || 60,
          allow_public_registration: !!data.allow_public_registration,
        })
        const users: User[] = usersRes.data
        setStats({
          total: users.length,
          admins: users.filter(u => u.role === 'admin').length,
          operators: users.filter(u => u.role === 'operator').length,
          members: users.filter(u => u.role === 'member').length,
        })
      } catch (err) {
        console.error('Failed to fetch org settings:', err)
        setError('Failed to load organization settings. Check your permissions.')
        toast({ title: 'Error', description: 'Failed to load organization settings.', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      await client.put('/org/settings', settings)
      toast({ title: 'Settings saved', description: 'Organization settings updated successfully.' })
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      toast({
        title: 'Save failed',
        description: axiosError.response?.data?.detail || 'Could not update settings.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Configuration…</p>
      </div>
    </div>
  )

  if (error || !settings) return (
    <div className="flex items-center justify-center h-screen bg-zinc-50">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-zinc-100 shadow-xl text-center">
        <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building className="text-rose-500" size={32} />
        </div>
        <h2 className="text-xl font-black tracking-tight mb-2">Access Denied</h2>
        <p className="text-sm text-zinc-500 mb-8">{error || 'Unable to load settings.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
        >
          Retry Connection
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">
          Configure global policies and registration rules.
        </p>
      </div>

      {/* Org Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Users', value: stats.total, color: 'bg-zinc-900 text-white' },
            { label: 'Admins', value: stats.admins, color: 'bg-emerald-50 text-emerald-900 border border-emerald-100' },
            { label: 'Operators', value: stats.operators, color: 'bg-amber-50 text-amber-900 border border-amber-100' },
            { label: 'Members', value: stats.members, color: 'bg-blue-50 text-blue-900 border border-blue-100' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-3 md:p-4 ${s.color}`}>
              <div className="text-xl md:text-2xl font-black">{s.value}</div>
              <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8">

        {/* General */}
        <Card className="border-zinc-200">
          <CardContent className="p-5 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <Building className="text-zinc-400 shrink-0" size={20} />
              <div>
                <h2 className="text-base md:text-lg font-bold text-zinc-900">General Profile</h2>
                <p className="text-[10px] md:text-xs text-zinc-400 font-medium">Basic identity for your organization.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Organization Name</Label>
                <Input
                  value={settings.name}
                  onChange={e => setSettings({ ...settings, name: e.target.value })}
                  className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
                />
                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Displayed in the header and reports.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Primary Domain</Label>
                <Input
                  value={settings.domain}
                  onChange={e => setSettings({ ...settings, domain: e.target.value })}
                  className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
                  placeholder="e.g. company.com"
                />
                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">Restricts self-registration to this domain.</p>
              </div>
            </div>

            <div className="space-y-2 md:w-1/2">
              <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Maximum Users</Label>
              <Input
                type="number"
                value={settings.max_users}
                onChange={e => setSettings({ ...settings, max_users: parseInt(e.target.value) || 100 })}
                className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
              />
              <p className="text-[10px] text-zinc-400 font-medium">Account limit (Currently {stats?.total ?? 0}).</p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-rose-100 bg-rose-50/10">
          <CardContent className="p-5 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-4">
              <ShieldAlert className="text-rose-500 shrink-0" size={20} />
              <div>
                <h2 className="text-base md:text-lg font-bold text-rose-900">Security Policies</h2>
                <p className="text-[10px] md:text-xs text-rose-400 font-medium">Control authentication behavior.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-bold text-zinc-900">Require MFA</Label>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Force multi-factor setup on next login.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[9px] text-amber-600 font-black uppercase tracking-widest">
                    <Info size={10} />
                    Enterprise feature
                  </div>
                </div>
                <Switch
                  checked={settings.require_mfa}
                  onCheckedChange={(c: boolean) => setSettings({ ...settings, require_mfa: c })}
                  className="scale-90 md:scale-100"
                />
              </div>

              <div className="flex items-start justify-between gap-4 pt-4 border-t border-rose-100/50">
                <div className="flex-1">
                  <Label className="text-sm md:text-base font-bold text-zinc-900">Public Registration</Label>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Allow matching domain emails to self-register as members.
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Domain: <span className="font-bold text-zinc-600">{settings.domain || 'Not set'}</span>
                  </p>
                </div>
                <Switch
                  checked={settings.allow_public_registration}
                  onCheckedChange={(c: boolean) => setSettings({ ...settings, allow_public_registration: c })}
                  className="scale-90 md:scale-100"
                />
              </div>

              <div className="pt-4 border-t border-rose-100/50 md:w-1/2">
                <Label className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">Session Timeout (Minutes)</Label>
                <Input
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={e => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })}
                  className="bg-white border-zinc-200 h-11 rounded-xl text-sm mt-2"
                />
                <p className="text-[10px] text-zinc-400 mt-1 font-medium">Inactive session limit (Default: 60m).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row items-center gap-4 justify-between pt-4 pb-10">
          <p className="text-[10px] text-zinc-400 font-medium text-center sm:text-left">Changes apply to all users immediately.</p>
          <Button 
            type="submit" 
            disabled={saving} 
            className="w-full sm:w-auto bg-zinc-900 text-white font-black uppercase tracking-widest text-[11px] h-12 px-10 rounded-2xl shadow-xl shadow-zinc-900/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {saving ? 'Saving…' : <><Save size={14} className="mr-2" /> Save Settings</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OrgSettingsPage
