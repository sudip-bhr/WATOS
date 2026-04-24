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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-100 blur-2xl rounded-full scale-150 opacity-50" />
            <div className="h-24 w-24 bg-white shadow-xl shadow-amber-900/5 rounded-4xl border border-zinc-100 flex items-center justify-center relative z-10">
              <ShieldOff size={40} className="text-amber-500" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">403</h1>
          <h2 className="text-xl font-bold text-zinc-700 tracking-tight">Access Denied</h2>
          <p className="text-zinc-500 font-medium text-sm">
            You don't have permission to view this page. Contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3 items-center">
          <Button
            onClick={() => navigate(getRoleHome(user?.role))}
            className="gap-2 px-8 h-12 rounded-2xl shadow-lg shadow-zinc-900/20 font-bold"
          >
            <ArrowLeft size={16} />
            Go to My Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
