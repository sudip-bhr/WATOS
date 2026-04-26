import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Brain, Menu } from 'lucide-react'
import ErrorBoundary from './components/layout/ErrorBoundary'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Sidebar from './components/layout/Sidebar'
import { Toaster } from './components/ui/toaster'
import { useWebSockets } from './hooks/useWebSockets'
import { useAuthStore } from './store/authStore'
import { getCurrentUser } from './api/auth'

// Public & Auth
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Landing from '@/pages/public/Landing'

// Errors
import NotFound from '@/pages/errors/NotFound'
import Unauthorized from '@/pages/errors/Unauthorized'

// Shared (all authenticated roles)
import Profile from '@/pages/shared/Profile'
import Projects from '@/pages/shared/Projects'
import ProjectDetails from '@/pages/shared/ProjectDetails'

// Member pages
import MemberHome from '@/pages/member/MemberHome'

// Operator pages
import OperatorHome from '@/pages/operator/OperatorHome'
import TaskBoard from '@/pages/operator/TaskBoard'
import TeamWorkload from '@/pages/operator/TeamWorkload'
import TeamAnalytics from '@/pages/operator/TeamAnalytics'
import TaskAssignment from '@/pages/operator/TaskAssignment'
import MonthlyReports from '@/pages/operator/MonthlyReports'

// Admin pages
import AdminHome from './pages/admin/AdminHome'
import UserManagement from './pages/admin/UserManagement'
import MemberAssignment from '@/pages/admin/MemberAssignment'
import MLConfig from '@/pages/admin/MLConfig'
import OrgSettings from '@/pages/admin/OrgSettings'
import AuditLog from '@/pages/admin/AuditLog'
import ReportInbox from '@/pages/admin/ReportInbox'

import { useState } from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
  useWebSockets()
  const [mobileOpen, setMobileOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden relative">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-6 bg-white border-b border-zinc-100 shrink-0">
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase italic">WATOS</span>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

const queryClient = new QueryClient()

function App() {
  const { token, user, setUser, logout } = useAuthStore()
  const hasRefreshed = useRef(false)

  useEffect(() => {
    const refreshUserData = async () => {
      if (token && user && !hasRefreshed.current) {
        hasRefreshed.current = true
        try {
          const freshUser = await getCurrentUser()
          setUser(freshUser)
        } catch (error) {
          console.error('Failed to refresh user data:', error)
          // If token is invalid, logout
          logout()
        }
      }
    }
    refreshUserData()
  }, [token, user, setUser, logout])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* ─── Public ─── */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* ─── Shared (all authenticated) ─── */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><Profile /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Layout><Projects /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <Layout><ProjectDetails /></Layout>
              </ProtectedRoute>
            } />

            {/* ─── Member ─── */}
            <Route path="/member" element={
              <ProtectedRoute roles={['member']}>
                <Layout><MemberHome /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/member/board" element={
              <ProtectedRoute roles={['member']}>
                <Layout><TaskBoard /></Layout>
              </ProtectedRoute>
            } />
            {/* ─── Operator ─── */}
            <Route path="/operator" element={
              <ProtectedRoute roles={['operator']}>
                <Layout><OperatorHome /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/board" element={
              <ProtectedRoute roles={['operator']}>
                <Layout><TaskBoard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/analytics" element={
              <ProtectedRoute roles={['operator']}>
                <Layout><TeamAnalytics /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/users" element={
              <ProtectedRoute roles={['operator']}>
                <Layout><UserManagement /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/operator/org" element={
              <ProtectedRoute roles={['admin', 'operator']}>
                <Layout><OrgSettings /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/audit" element={
              <ProtectedRoute roles={['admin', 'operator']}>
                <Layout><AuditLog /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/assign" element={
              <ProtectedRoute roles={['admin', 'operator']}>
                <Layout><TaskAssignment /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/operator/reports" element={
              <ProtectedRoute roles={['operator']}>
                <Layout><MonthlyReports /></Layout>
              </ProtectedRoute>
            } />

            {/* ─── Admin ─── */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout><AdminHome /></Layout></ProtectedRoute>} />
            <Route path="/admin/board" element={<ProtectedRoute roles={['admin']}><Layout><TaskBoard /></Layout></ProtectedRoute>} />
            <Route path="/admin/workload" element={<ProtectedRoute roles={['admin']}><Layout><TeamWorkload /></Layout></ProtectedRoute>} />
            <Route path="/admin/ml" element={
              <ProtectedRoute roles={['admin']}>
                <Layout><MLConfig /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><Layout><TeamAnalytics /></Layout></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Layout><UserManagement /></Layout></ProtectedRoute>} />
            <Route path="/admin/assign-members" element={<ProtectedRoute roles={['admin']}><Layout><MemberAssignment /></Layout></ProtectedRoute>} />
            <Route path="/admin/org" element={<ProtectedRoute roles={['admin']}><Layout><OrgSettings /></Layout></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Layout><ReportInbox /></Layout></ProtectedRoute>} />
            <Route path="/admin/audit" element={
              <ProtectedRoute roles={['admin']}>
                <Layout><AuditLog /></Layout>
              </ProtectedRoute>
            } />

            {/* ─── Legacy redirect support ─── */}
            <Route path="/tasks" element={
              <ProtectedRoute roles={['operator', 'admin']}>
                <Layout><TaskBoard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute roles={['operator', 'admin']}>
                <Layout><TeamWorkload /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute roles={['operator', 'admin']}>
                <Layout><TeamAnalytics /></Layout>
              </ProtectedRoute>
            } />

            {/* ─── Fallback ─── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
