import { useState, useEffect } from 'react'
import { AxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, UserPlus, Trash2, Edit2, Users, X, Save, Tag, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'
import type { User as UserType } from '@/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useConfirm } from '@/hooks/useConfirm'

interface EditState {
  full_name: string
  role: string
  capacity_hours: number
  skills: string[]
  is_active: boolean
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  operator: 'bg-amber-50 text-amber-700 border-amber-200',
  member: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const UserManagement = () => {
  const confirm = useConfirm()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  // For the new user form
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'member' })
  const [creating, setCreating] = useState(false)

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await client.get('/users/')
      setUsers(res.data)
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
        const res = await client.get('/users/')
        if (!ignore) setUsers(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
    if (currentUser?.role === 'operator') {
      return matchesSearch && u.role === 'member'
    }
    return matchesSearch
  })

  const openEdit = (u: UserType) => {
    setEditingUser(u)
    setEditState({
      full_name: u.full_name || '',
      role: u.role,
      capacity_hours: u.capacity_hours ?? 40,
      skills: [...(u.skills || [])],
      is_active: u.is_active,
    })
    setSkillInput('')
  }

  const addSkill = () => {
    const s = skillInput.trim()
    if (!s || !editState) return
    if (!editState.skills.includes(s)) {
      setEditState({ ...editState, skills: [...editState.skills, s] })
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    if (!editState) return
    setEditState({ ...editState, skills: editState.skills.filter(s => s !== skill) })
  }

  const handleSaveEdit = async () => {
    if (!editingUser || !editState) return
    setSaving(true)
    try {
      await client.patch(`/users/${editingUser.id}`, {
        full_name: editState.full_name,
        role: editState.role,
        capacity_hours: editState.capacity_hours,
        skills: editState.skills,
        is_active: editState.is_active,
      })
      toast({ title: 'User updated successfully' })
      setEditingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      toast({ title: 'Update failed', description: axiosError.response?.data?.detail || 'Could not update user.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: string) => {
    const ok = await confirm({
      title: "Deactivate User?",
      description: "Are you sure you want to deactivate this user? They will lose access to the platform.",
      confirmText: "Deactivate User",
      cancelText: "Cancel",
      variant: "destructive"
    })
    if (!ok) return
    try {
      await client.delete(`/users/${userId}`)
      toast({ title: 'User deactivated' })
      fetchUsers()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await client.post('/auth/register', {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
      })
      const res = await client.get('/users/')
      const created = res.data.find((u: UserType) => u.email === newUser.email)
      if (created && newUser.role !== 'member') {
        await client.patch(`/users/${created.id}`, { role: newUser.role })
      }
      toast({ title: 'User created successfully' })
      setShowAddForm(false)
      setNewUser({ email: '', full_name: '', password: '', role: 'member' })
      fetchUsers()
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      toast({ title: 'Failed to create user', description: axiosError.response?.data?.detail || 'Unknown error', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="shrink-0 mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">
            {currentUser?.role === 'operator'
              ? 'Manage your team members and their skills.'
              : 'Manage all accounts, roles, and platform access.'}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <Button onClick={() => setShowAddForm(true)} className="w-full sm:w-auto gap-2 bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 rounded-xl h-11 px-6">
            <UserPlus size={16} /> Add User
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-zinc-200 h-11 rounded-xl shadow-sm text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="min-w-[800px]">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase font-black tracking-widest text-zinc-400 bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Skills</th>
                    <th className="px-6 py-4">Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black shrink-0 text-xs">
                            {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 text-sm">{u.full_name || 'No Name'}</p>
                            <p className="text-[10px] text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border', ROLE_COLORS[u.role] || ROLE_COLORS.member)}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.skills?.length > 0 ? u.skills.slice(0, 2).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[8px] uppercase bg-zinc-100 text-zinc-500 font-bold px-1.5 py-0">
                              {skill}
                            </Badge>
                          )) : <span className="text-[10px] text-zinc-400 italic">None set</span>}
                          {u.skills?.length > 2 && <span className="text-[9px] text-zinc-400 font-black px-1">+{u.skills.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                          <Activity size={12} className="text-zinc-300" />
                          {u.capacity_hours ?? 40}h / week
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={cn('flex items-center gap-1.5 text-[11px] font-bold', u.is_active ? 'text-emerald-600' : 'text-zinc-400')}>
                          <div className={cn('h-2 w-2 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-zinc-300')} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900 border-zinc-200"
                            onClick={() => openEdit(u)}
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 border-zinc-200"
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500">
                        <Users size={40} className="text-zinc-200 mx-auto mb-4" />
                        <p className="font-medium text-sm">No users found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit User Modal ──────────────────────────────────────── */}
      {editingUser && editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white rounded-none sm:rounded-3xl shadow-2xl border-none sm:border border-zinc-100 p-6 md:p-8 w-full max-w-lg h-full sm:h-auto overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Edit2 size={18} className="text-zinc-400" /> Edit User
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="h-10 w-10 rounded-xl hover:bg-zinc-100 flex items-center justify-center">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</Label>
                <Input
                  value={editState.full_name}
                  onChange={e => setEditState({ ...editState, full_name: e.target.value })}
                  className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
                />
              </div>

              {currentUser?.role === 'admin' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Role</Label>
                  <select
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium outline-none"
                    value={editState.role}
                    onChange={e => setEditState({ ...editState, role: e.target.value })}
                  >
                    <option value="member">Member</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Weekly Capacity (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  value={editState.capacity_hours}
                  onChange={e => setEditState({ ...editState, capacity_hours: parseInt(e.target.value) || 40 })}
                  className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Skills</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Python, React…"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                    className="bg-zinc-50 border-zinc-200 h-11 rounded-xl text-sm"
                  />
                  <Button type="button" variant="outline" onClick={addSkill} className="shrink-0 rounded-xl border-zinc-200 h-11 px-4">
                    <Tag size={14} />
                  </Button>
                </div>
                {editState.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editState.skills.map(skill => (
                      <span key={skill} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="text-zinc-400 hover:text-rose-500">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {currentUser?.role === 'admin' && (
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <p className="text-sm font-bold text-zinc-700">Account Active</p>
                    <p className="text-[10px] text-zinc-400">Inactive users cannot log in.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditState({ ...editState, is_active: !editState.is_active })}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
                      editState.is_active ? 'bg-emerald-500' : 'bg-zinc-300'
                    )}
                  >
                    <div className={cn(
                      'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out',
                      editState.is_active ? 'translate-x-5' : 'translate-x-0'
                    )} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-8 mt-auto sm:mt-0">
              <Button type="button" variant="outline" className="order-2 sm:order-1 flex-1 rounded-xl h-12 font-bold text-sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="order-1 sm:order-2 flex-1 rounded-xl h-12 bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20 gap-2 text-sm"
              >
                <Save size={15} />
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add User Modal ──────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
          <div 
            onClick={e => e.stopPropagation()} 
            className="bg-white rounded-none sm:rounded-3xl shadow-2xl border-none sm:border border-zinc-100 p-6 md:p-8 w-full max-w-md h-full sm:h-auto overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <UserPlus size={20} className="text-zinc-400" /> New User
              </h2>
              <button onClick={() => setShowAddForm(false)} className="h-10 w-10 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors">
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</Label>
                <Input required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="bg-zinc-50 h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Email Address</Label>
                <Input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="bg-zinc-50 h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</Label>
                <Input required type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="bg-zinc-50 h-11 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Initial Role</Label>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-auto sm:mt-0">
                <Button type="button" variant="outline" className="order-2 sm:order-1 flex-1 rounded-xl h-12 font-bold text-sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} className="order-1 sm:order-2 flex-1 rounded-xl h-12 bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20 text-sm">
                  {creating ? 'Creating…' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
