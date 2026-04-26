import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Brain, ArrowRight } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight">WATOS</span>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl bg-white">
        <CardHeader className="space-y-1 text-center pt-8">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Access your intelligent performance dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-500 bg-rose-500/10 rounded-lg border border-rose-500/20 text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-50/50"
              />
            </div>
            <Button type="submit" className="w-full gap-2 h-11" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={16} />
            </Button>
          </form>
          
          <div className="text-center text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-zinc-900 hover:underline">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <div className="fixed bottom-8 text-zinc-400 text-xs uppercase tracking-widest font-medium">
        Intelligence & Governance Platform
      </div>
    </div>
  )
}

export default Login
