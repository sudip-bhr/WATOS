import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, UserPlus, Trash2, Edit2, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import client from '@/api/client'
import { toast } from '@/hooks/use-toast'
import type { User as UserType } from '@/types'
import { cn } from '@/lib/utils'

import { useAuthStore } from '@/store/authStore'

const UserManagement = () => {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  
  // For the new user form
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'member' })
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await client.get('/users/')
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
    
    if (currentUser?.role === 'operator') {
      return matchesSearch && u.role === 'member'
    }
    
    return matchesSearch
  })

  const handleRoleChange = async (userId: string, currentRole: string, newRole: string) => {
    if (currentRole === newRole) return
    try {
      await client.patch(`/users/${userId}`, { role: newRole })
      toast({ title: 'Role updated' })
      fetchUsers()
    } catch (err) {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await client.delete(`/users/${userId}`)
      toast({ title: 'User deleted' })
      fetchUsers()
    } catch (err) {
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
        // Wait, backend auth/register forces role='member'. So we create then patch if needed.
      })
      
      // We must fetch the new user by email to get the ID if we want to change their role immediately
      const res = await client.get('/users/')
      const created = res.data.find((u: any) => u.email === newUser.email)
      
      if (created && newUser.role !== 'member') {
        await client.patch(`/users/${created.id}`, { role: newUser.role })
      }
      
      toast({ title: 'User created' })
      setShowAddForm(false)
      setNewUser({ email: '', full_name: '', password: '', role: 'member' })
      fetchUsers()
    } catch (err) {
      toast({ title: 'Failed to create user', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="h-screen flex flex-col p-8 max-w-7xl mx-auto w-full">
      <div className="shrink-0 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-zinc-500 mt-1">Manage accounts, roles, and platform access.</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2 bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 rounded-xl h-11 px-6">
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      <div className="flex gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-zinc-200 h-11 rounded-xl shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-black tracking-widest text-zinc-400 bg-zinc-50 border-b border-zinc-100 sticky top-0">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Skills</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black">
                        {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{u.full_name || 'No Name'}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, u.role, e.target.value)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors appearance-none",
                        u.role === 'admin' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        u.role === 'operator' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-zinc-100 text-zinc-600 border-zinc-200"
                      )}
                    >
                      <option value="member">Member</option>
                      {currentUser?.role === 'admin' && (
                        <>
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </>
                      )}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {u.skills?.length > 0 ? u.skills.slice(0, 2).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] uppercase bg-zinc-100 text-zinc-500">
                          {skill}
                        </Badge>
                      )) : <span className="text-xs text-zinc-400 italic">None</span>}
                      {u.skills?.length > 2 && <span className="text-[10px] text-zinc-400 font-medium px-1">+{u.skills.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div> Active
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-900">
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(u.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500">
                    <Users size={48} className="text-zinc-200 mx-auto mb-4" />
                    No users found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 w-full max-w-md">
            <h2 className="text-xl font-black tracking-tight mb-6 flex items-center gap-2">
              <UserPlus size={20} className="text-zinc-400" /> Create New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="bg-zinc-50" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="bg-zinc-50" />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="bg-zinc-50" />
              </div>
              <div className="space-y-2">
                <Label>Initial Role</Label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-sm font-medium outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="member">Member</option>
                  {currentUser?.role === 'admin' && (
                    <>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 font-bold" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} className="flex-1 rounded-xl h-11 bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-900/20">
                  {creating ? 'Creating...' : 'Create User'}
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
