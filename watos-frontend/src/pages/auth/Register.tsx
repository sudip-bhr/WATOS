import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'
import client from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { getRoleHome } from '@/lib/roles'

const Register = () => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await client.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role: 'member'
      })
      
      const { access_token, refresh_token } = res.data

      // Fetch the actual user profile (not a fake object)
      const { data: user } = await client.get('/users/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      
      login(access_token, refresh_token, user)
      navigate(getRoleHome(user.role))
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      setError(axiosError.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center board-bg p-4 relative overflow-hidden">
      <div className="noise-texture" />
      
      {/* Background organic glow */}
      <div className="absolute top-1/4 -right-1/4 w-[500px] h-[500px] bg-indigo-50/30 rounded-full blur-[120px] -z-10 animate-float" />
      <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-zinc-100/50 rounded-full blur-[120px] -z-10 animate-float-delayed" />

      <div className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => navigate('/')}>
        <div className="h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-zinc-900/5">
          <img
            src="/logo2.png"
            alt="WATOS Logo"
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-bold text-2xl tracking-tighter text-zinc-900">WATOS</span>
      </div>

      <Card className="w-full max-w-md border border-white/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white/70 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-2 text-center pt-10 pb-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-gradient-subtle">Create an account</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Enter your details to join the intelligent workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-4 text-xs font-bold text-rose-500 bg-rose-500/5 rounded-xl border border-rose-500/10 text-center animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}
            
            <div className="space-y-2.5">
              <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Full Name</Label>
              <Input 
                id="fullName" 
                placeholder="John Doe" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-white/50 border-zinc-200/50 focus:border-zinc-900 focus:ring-0 transition-all rounded-xl px-4"
              />
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white/50 border-zinc-200/50 focus:border-zinc-900 focus:ring-0 transition-all rounded-xl px-4"
              />
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white/50 border-zinc-200/50 focus:border-zinc-900 focus:ring-0 transition-all rounded-xl px-4"
              />
            </div>

            <div className="flex justify-center pt-2">
              <Button type="submit" className="btn-premium h-11 px-12 rounded-2xl font-bold text-sm shadow-xl" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
                <ArrowRight size={18} className="ml-1" />
              </Button>
            </div>
          </form>
          
          <div className="text-center text-sm text-zinc-400 font-medium pt-2">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-zinc-900 hover:underline decoration-zinc-200 underline-offset-4 transition-all">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="fixed bottom-8 text-zinc-300 text-[10px] uppercase tracking-[0.4em] font-bold">
        Intelligence & Governance Platform
      </div>
    </div>

  )
}

export default Register
