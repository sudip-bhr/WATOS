import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const getRoleHome = (role?: string) => {
  switch (role) {
    case 'admin': return '/admin'
    case 'operator': return '/operator'
    case 'member': return '/member'
    default: return '/'
  }
}

const Unauthorized = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center board-bg px-4 relative overflow-hidden">
      <div className="noise-texture" />
      
      <div className="text-center space-y-8 max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-100 blur-3xl rounded-full scale-150 opacity-40 animate-pulse" />
            <div className="h-28 w-28 bg-white/70 backdrop-blur-xl shadow-2xl shadow-rose-900/5 rounded-[2rem] border border-white flex items-center justify-center relative z-10 animate-float">
              <ShieldOff size={48} className="text-rose-500" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-7xl font-bold tracking-tighter text-gradient-subtle">403</h1>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Access Denied</h2>
          <p className="text-zinc-500 font-medium text-base leading-relaxed">
            You don't have permission to view this page. Contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="pt-6 flex flex-col gap-4 items-center">
          <Button
            onClick={() => navigate(getRoleHome(user?.role))}
            className="btn-premium gap-2 px-10 h-14 rounded-xl shadow-xl font-bold text-sm"
          >
            <ArrowLeft size={18} />
            Go to My Dashboard
          </Button>
        </div>
      </div>
    </div>

  )
}

export default Unauthorized
