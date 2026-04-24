import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Building, Save, ShieldAlert } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'

interface OrgSettings {
  name: string
  domain: string
  max_users: number
  require_mfa: boolean
  session_timeout_minutes: number
  allow_public_registration: boolean
}

const OrgSettingsPage = () => {
  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Stub implementation until backend endpoint exists
    client.get('/org/settings')
      .then(res => setSettings(res.data))
      .catch((err) => {
        // Fallback stub for now
        if (err.response?.status === 404) {
          setSettings({
            name: 'Acme Corp',
            domain: 'acme.com',
            max_users: 100,
            require_mfa: false,
            session_timeout_minutes: 60,
            allow_public_registration: true,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.put('/org/settings', settings)
      toast({ title: 'Settings saved', description: 'Organization settings updated successfully.' })
    } catch (err) {
      toast({ title: 'Save failed', description: 'Backend endpoint /org/settings not yet implemented.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-zinc-500 mt-1">Manage global preferences and security policies.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* General */}
        <Card className="border-zinc-200">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
              <Building className="text-zinc-400" />
              <h2 className="text-lg font-bold">General Profile</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input 
                  value={settings.name} 
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="bg-zinc-50 border-zinc-200 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Domain</Label>
                <Input 
                  value={settings.domain} 
                  onChange={e => setSettings({...settings, domain: e.target.value})}
                  className="bg-zinc-50 border-zinc-200 h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-rose-100 bg-rose-50/10">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-4">
              <ShieldAlert className="text-rose-500" />
              <h2 className="text-lg font-bold text-rose-900">Security Policies</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require Multi-Factor Authentication</Label>
                  <p className="text-sm text-zinc-500">Force all users to set up MFA on next login.</p>
                </div>
                <Switch 
                  checked={settings.require_mfa} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, require_mfa: c})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Allow Public Registration</Label>
                  <p className="text-sm text-zinc-500">Anyone with the domain can create a member account.</p>
                </div>
                <Switch 
                  checked={settings.allow_public_registration} 
                  onCheckedChange={(c: boolean) => setSettings({...settings, allow_public_registration: c})}
                />
              </div>

              <div className="pt-4 border-t border-rose-100 w-1/2">
                <Label>Session Timeout (Minutes)</Label>
                <Input 
                  type="number"
                  value={settings.session_timeout_minutes} 
                  onChange={e => setSettings({...settings, session_timeout_minutes: parseInt(e.target.value) || 60})}
                  className="bg-white border-zinc-200 mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="submit" disabled={saving} className="bg-zinc-900 text-white gap-2 h-11 px-8 rounded-xl shadow-xl shadow-zinc-900/20">
            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OrgSettingsPage
