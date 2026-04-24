import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
