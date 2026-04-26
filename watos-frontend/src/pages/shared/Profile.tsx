import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { User, Shield, Clock, Zap, Plus, X, Check, AlertCircle } from 'lucide-react'
import client from '@/api/client'
import type { User as UserType } from '@/types'

const Profile = () => {
  const { user, setUser } = useAuthStore()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [capacityHours, setCapacityHours] = useState(user?.capacity_hours || 40)
  const [skills, setSkills] = useState<string[]>(user?.skills || [])
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addSkill = () => {
    const val = skillInput.trim().toLowerCase()
    if (val && !skills.includes(val)) {
      setSkills(prev => [...prev, val])
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setSkills(prev => prev.filter(s => s !== skill))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { data } = await client.patch<UserType>('/users/me', {
        full_name: fullName,
        capacity_hours: capacityHours,
        skills,
      })
      setUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      const axiosError = e as AxiosError<{ detail?: string }>
      setError(axiosError?.response?.data?.detail || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const utilisationPct = Math.min(
    ((user?.skills?.length || 0) / 10) * 100,
    100
  )

  const roleConfig = {
    admin: { color: 'bg-zinc-900 text-white', label: 'Administrator' },
    operator: { color: 'bg-zinc-700 text-white', label: 'Operator' },
    member: { color: 'bg-zinc-100 text-zinc-700', label: 'Team Member' },
  }

  const role = user?.role as keyof typeof roleConfig || 'member'

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-xs md:text-sm text-zinc-500 mt-1">Manage your identity, competencies, and capacity.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">

        {/* Banner */}
        <div className="h-20 md:h-24 bg-zinc-900 relative">
          <div className="absolute bottom-0 translate-y-1/2 left-6 md:left-8">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-3xl bg-white border-4 border-white shadow-xl flex items-center justify-center text-xl md:text-2xl font-black text-zinc-900 shadow-zinc-200">
              {fullName?.[0]?.toUpperCase() || <User size={24} />}
            </div>
          </div>
        </div>

        <div className="pt-10 md:pt-14 px-5 md:px-8 pb-6 md:pb-8 space-y-6 md:space-y-8">
          {/* Role Badge */}
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest', roleConfig[role].color)}>
              {roleConfig[role].label}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-zinc-400 font-medium">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-5 md:space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-zinc-400">Email Address</Label>
              <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs md:text-sm text-zinc-500 font-medium truncate">
                <Shield size={14} className="text-zinc-300 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-zinc-400">
                Display Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="rounded-2xl border-zinc-200 h-11 md:h-12 font-medium text-sm"
              />
            </div>

            {/* Capacity Hours Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Clock size={11} /> Weekly Capacity
                </Label>
                <span className="text-sm font-black text-zinc-900">{capacityHours}h</span>
              </div>
              <input
                type="range"
                min={8}
                max={60}
                step={4}
                value={capacityHours}
                onChange={e => setCapacityHours(Number(e.target.value))}
                className="w-full accent-zinc-900 cursor-pointer h-1.5 bg-zinc-100 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[8px] md:text-[9px] text-zinc-300 font-medium uppercase tracking-wider">
                <span>8h min</span>
                <span>40h standard</span>
                <span>60h max</span>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <Label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Zap size={11} /> Competencies
              </Label>

              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder="e.g. python, react…"
                  className="rounded-2xl border-zinc-200 flex-1 font-medium text-sm h-11"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addSkill}
                  disabled={!skillInput.trim()}
                  className="rounded-2xl border-zinc-200 h-11 w-11 shrink-0"
                >
                  <Plus size={15} />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-8">
                {skills.length === 0 ? (
                  <p className="text-[10px] md:text-xs text-zinc-300 italic">No skills added yet.</p>
                ) : skills.map(skill => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="pl-3 pr-1.5 py-1 flex items-center gap-1.5 rounded-xl bg-zinc-100 text-zinc-700 border-none font-bold text-[9px] md:text-[10px] uppercase tracking-wider"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="h-4 w-4 rounded-full hover:bg-zinc-300 flex items-center justify-center transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Profile Completeness</span>
                  <span>{Math.min(skills.length, 10)}/10</span>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                    style={{ width: `${utilisationPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save / Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-zinc-900 text-white font-bold px-8 rounded-2xl shadow-xl shadow-zinc-900/20 hover:bg-zinc-800 h-12"
            >
              {saving ? 'Saving…' : saved ? <span className="flex items-center gap-2"><Check size={14} /> Saved!</span> : 'Save Profile'}
            </Button>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-500 font-medium">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            {saved && !error && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <Check size={13} /> Updated successfully.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
