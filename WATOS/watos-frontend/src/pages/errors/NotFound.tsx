import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-rose-100 blur-2xl rounded-full scale-150 opacity-50" />
            <div className="h-24 w-24 bg-white shadow-xl shadow-rose-900/5 rounded-4xl border border-zinc-100 flex items-center justify-center relative z-10 rotate-12 transition-transform hover:rotate-0">
              <FileQuestion size={40} className="text-rose-500" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">404</h1>
          <h2 className="text-xl font-bold text-zinc-700 tracking-tight">Page not found</h2>
          <p className="text-zinc-500 font-medium text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="pt-4">
          <Button onClick={() => navigate('/')} className="gap-2 px-8 h-12 rounded-2xl shadow-lg shadow-zinc-900/20 font-bold">
            <Home size={16} />
            Return Home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
