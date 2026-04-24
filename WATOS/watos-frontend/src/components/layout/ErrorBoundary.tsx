import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-rose-100 blur-2xl rounded-full scale-150 opacity-50" />
                <div className="h-24 w-24 bg-white shadow-xl shadow-rose-900/5 rounded-4xl border border-zinc-100 flex items-center justify-center relative z-10">
                  <AlertTriangle size={40} className="text-rose-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900">Something went wrong</h1>
              <p className="text-zinc-500 font-medium text-sm">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {this.state.error && (
                <p className="text-xs text-zinc-400 font-mono bg-zinc-100 rounded-xl p-3 mt-4 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-8 h-12 rounded-2xl bg-zinc-900 text-white font-bold shadow-lg shadow-zinc-900/20 hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
