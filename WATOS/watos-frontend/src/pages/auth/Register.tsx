import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Brain, ArrowRight } from 'lucide-react'
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
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
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Enter your details to join the intelligent workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-500 bg-rose-500/10 rounded-lg border border-rose-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                placeholder="John Doe" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-zinc-50/50"
              />
            </div>
            
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
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-50/50"
              />
            </div>

            <Button type="submit" className="w-full gap-2 h-11" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
              <ArrowRight size={16} />
            </Button>
          </form>
          
          <div className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-zinc-900 hover:underline">
              Sign in
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

export default Register
