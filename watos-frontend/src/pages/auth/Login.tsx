import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { login as loginApi } from '@/api/auth'
import { getRoleHome } from '@/lib/roles'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await loginApi(email, password)
      login(data.access_token, data.refresh_token, data.user)
      navigate(getRoleHome(data.user.role))
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>
      setError(axiosError.response?.data?.detail || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center board-bg p-4 relative overflow-hidden">
      <div className="noise-texture" />
      
      {/* Background organic glow */}
      <div className="absolute top-1/4 -left-1/4 w-125 h-125 bg-indigo-50/30 rounded-full blur-[120px] -z-10 animate-float" />
      <div className="absolute bottom-1/4 -right-1/4 w-125 h-125 bg-zinc-100/50 rounded-full blur-[120px] -z-10 animate-float-delayed" />

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
          <CardTitle className="text-3xl font-bold tracking-tight text-gradient-subtle">Welcome back</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Access your intelligent performance dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 text-xs font-bold text-rose-500 bg-rose-500/5 rounded-xl border border-rose-500/10 text-center animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}
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
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Password</Label>
                <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Forgot?</a>
              </div>
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
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight size={18} className="ml-1" />
              </Button>
            </div>
          </form>
          
          <div className="text-center text-sm text-zinc-400 font-medium pt-2">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-zinc-900 hover:underline decoration-zinc-200 underline-offset-4 transition-all">
              Create one
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

export default Login
