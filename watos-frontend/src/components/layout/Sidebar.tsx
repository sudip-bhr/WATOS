import { useAuthStore } from '../../store/authStore'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Home, CheckSquare, BarChart3, LogOut, LineChart, Brain, Bell, X, Menu,
  FolderKanban, User, CheckCheck, LayoutGrid, Users, UserCog, Cpu,
  Building, ScrollText, UserCheck, FileText, Inbox
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useState } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { getNavForRole, getRoleHome } from '@/lib/roles'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map icon name strings to Lucide components
const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Home, CheckSquare, BarChart3, LineChart, Brain, FolderKanban, User,
  LayoutGrid, Users, UserCog, Cpu, Building, ScrollText, UserCheck, FileText, Inbox,
}

const notifTypeStyles: Record<string, { dot: string; label: string }> = {
  delay_risk: { dot: 'bg-amber-500', label: 'Delay Risk' },
  overload: { dot: 'bg-rose-500', label: 'Overload' },
  deadline: { dot: 'bg-zinc-900', label: 'Deadline' },
  comment: { dot: 'bg-emerald-500', label: 'Comment' },
  mention: { dot: 'bg-indigo-500', label: 'Mention' },
  sla_breach: { dot: 'bg-rose-600', label: 'SLA Breach' },
  task_assigned: { dot: 'bg-blue-500', label: 'Task Assigned' },
  new_member: { dot: 'bg-fuchsia-500', label: 'New Member' },
  member_assigned: { dot: 'bg-emerald-400', label: 'Team Assignment' },
  task_rejected: { dot: 'bg-rose-500', label: 'Task Rejected' },
  task_approved: { dot: 'bg-emerald-500', label: 'Task Approved' },
  task_review: { dot: 'bg-blue-500', label: 'Task Review' },
}

const roleSectionLabels: Record<string, string> = {
  admin: 'Admin Control',
  operator: 'Operator Hub',
  member: 'My Workspace',
}

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [notifOpen, setNotifOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = getNavForRole(user?.role)
  const sectionLabel = roleSectionLabels[user?.role || 'member'] || 'Navigation'

  // Determine if a nav item is active (also match sub-paths)
  const isActive = (path: string) => {
    if (path === '/member' || path === '/operator' || path === '/admin') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-zinc-50 border-r border-zinc-100/80 z-20 shadow-[10px_0_40px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header: Logo, Notifications & Toggle */}
      <div className={cn(
        "flex transition-all duration-300",
        isCollapsed ? "flex-col items-center py-6 gap-4" : "flex-row items-center justify-between h-20 px-6"
      )}>
        {!isCollapsed ? (
          <>
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => { navigate(user ? getRoleHome(user.role) : '/'); onClose?.(); }}
            >
              <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/20 group-hover:scale-110 transition-transform shrink-0">
                <Brain size={18} className="text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic whitespace-nowrap">WATOS</span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative flex items-center justify-center h-9 w-9 rounded-2xl hover:bg-zinc-200/60 transition-colors"
                id="notification-bell"
                aria-label="Notifications"
              >
                <Bell size={17} className="text-zinc-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-full bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex items-center justify-center h-9 w-9 rounded-2xl hover:bg-zinc-200/60 transition-colors text-zinc-500"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <Menu size={18} />
              </button>

              {/* Mobile Close Button */}
              {onClose && (
                <button 
                  onClick={onClose} 
                  className="lg:hidden p-2 text-zinc-400 hover:text-zinc-900"
                  aria-label="Close Sidebar"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 hover:scale-110 transition-transform"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <Brain size={20} />
            </button>

            {/* Notification Bell (Collapsed) */}
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative flex items-center justify-center h-10 w-10 rounded-2xl bg-zinc-100 hover:bg-zinc-200/60 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-zinc-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-zinc-50 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </>
        )}
        

      </div>

      {/* Nav */}
      <div className={cn("flex-1 overflow-y-auto py-8 transition-all duration-300", isCollapsed ? "px-3" : "px-6")}>
        {!isCollapsed && (
          <div className="mb-6 px-2">
            <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">{sectionLabel}</h5>
          </div>
        )}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = IconMap[item.icon]
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center rounded-2xl transition-all duration-300 group',
                  isCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'px-4 py-3.5',
                  active
                    ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                    : 'text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-500',
                      !isCollapsed && 'mr-4',
                      active ? 'scale-110 rotate-3' : 'opacity-60 group-hover:opacity-100 group-hover:rotate-12'
                    )}
                  />
                )}
                {!isCollapsed && <span className="text-xs font-black uppercase tracking-widest truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className={cn("border-t border-zinc-100 transition-all duration-300", isCollapsed ? "p-3 space-y-4" : "p-6 space-y-6")}>
        <Link
          to="/profile"
          onClick={onClose}
          className={cn(
            "flex items-center bg-white/40 rounded-3xl border border-white shadow-sm hover:bg-white/70 transition-all group",
            isCollapsed ? "h-12 w-12 justify-center mx-auto" : "p-4 gap-4"
          )}
          title={isCollapsed ? user?.full_name : undefined}
        >
          <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-zinc-900/10 group-hover:scale-105 transition-transform shrink-0">
            {user?.full_name?.[0]?.toUpperCase() || <User size={16} />}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-black text-zinc-900 truncate tracking-tight">{user?.full_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-400">{user?.role}</p>
              </div>
            </div>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group",
            isCollapsed ? "h-12 w-12 justify-center mx-auto" : "w-full px-5 py-3"
          )}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className={cn("h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity", !isCollapsed && "mr-4")} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-20" : "w-72"
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-45 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Panel Overlay */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60"
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-white border-l border-zinc-100 shadow-2xl z-70 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-black tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-zinc-400 font-medium">{unreadCount} unread</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors px-3 py-1.5 rounded-xl hover:bg-zinc-100"
                    >
                      <CheckCheck size={12} /> All Read
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="h-8 w-8 rounded-xl hover:bg-zinc-100 flex items-center justify-center transition-colors"
                  >
                    <X size={15} className="text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                    <div className="h-16 w-16 rounded-3xl bg-zinc-100 flex items-center justify-center">
                      <Bell size={28} className="text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-300 uppercase tracking-widest">All Clear</p>
                      <p className="text-xs text-zinc-400 mt-1">No notifications yet.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {notifications.map(notif => {
                      const style = notifTypeStyles[notif.type] || { dot: 'bg-zinc-400', label: notif.type }
                      return (
                        <div
                          key={notif.id}
                          onClick={() => !notif.is_read && markRead(notif.id)}
                          className={cn(
                            'px-6 py-4 flex gap-3 cursor-pointer transition-colors',
                            notif.is_read ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50 hover:bg-zinc-100'
                          )}
                        >
                          <div className="shrink-0 pt-1">
                            <div className={cn('h-2 w-2 rounded-full mt-0.5', notif.is_read ? 'bg-zinc-200' : style.dot)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={cn(
                                'text-[9px] font-black uppercase tracking-widest',
                                notif.is_read ? 'text-zinc-300' : 'text-zinc-900'
                              )}>
                                {style.label}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-medium shrink-0">
                                {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <p className={cn(
                              'text-xs leading-relaxed',
                              notif.is_read ? 'text-zinc-400' : 'text-zinc-700 font-medium'
                            )}>
                              {notif.message}
                            </p>
                            {(notif.action_url || notif.action_type) && (
                              <div className="mt-3 flex items-center gap-2">
                                {notif.action_url && (
                                  <Link
                                    to={notif.action_url}
                                    onClick={(e) => { e.stopPropagation(); markRead(notif.id); setNotifOpen(false) }}
                                    className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-800 transition-colors"
                                  >
                                    View Task
                                  </Link>
                                )}
                                {notif.action_type && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); markRead(notif.id) }}
                                    className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-zinc-200 hover:bg-zinc-200 transition-colors"
                                  >
                                    {notif.action_type}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Sidebar
