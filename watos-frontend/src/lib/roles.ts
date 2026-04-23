/**
 * Role-based routing and navigation utilities for WATOS.
 */

export const getRoleHome = (role?: string): string => {
  switch (role) {
    case 'admin': return '/admin'
    case 'operator': return '/operator'
    case 'member': return '/member'
    default: return '/'
  }
}

export type NavItem = {
  label: string
  icon: string  // lucide icon name
  path: string
}

export const MEMBER_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'Home', path: '/member' },
  { label: 'My Tasks', icon: 'CheckSquare', path: '/member/tasks' },
  { label: 'My Performance', icon: 'LineChart', path: '/member/performance' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const OPERATOR_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'Home', path: '/operator' },
  { label: 'Task Board', icon: 'LayoutGrid', path: '/operator/board' },
  { label: 'Team Workload', icon: 'Users', path: '/operator/workload' },
  { label: 'Analytics', icon: 'BarChart3', path: '/operator/analytics' },
  { label: 'Smart Assign', icon: 'Brain', path: '/operator/assign' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'Home', path: '/admin' },
  { label: 'Task Board', icon: 'LayoutGrid', path: '/admin/board' },
  { label: 'Team Workload', icon: 'Users', path: '/admin/workload' },
  { label: 'Analytics', icon: 'BarChart3', path: '/admin/analytics' },
  { label: 'User Management', icon: 'UserCog', path: '/admin/users' },
  { label: 'ML Config', icon: 'Cpu', path: '/admin/ml' },
  { label: 'Org Settings', icon: 'Building', path: '/admin/org' },
  { label: 'Audit Log', icon: 'ScrollText', path: '/admin/audit' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const getNavForRole = (role?: string): NavItem[] => {
  switch (role) {
    case 'admin': return ADMIN_NAV
    case 'operator': return OPERATOR_NAV
    case 'member': return MEMBER_NAV
    default: return MEMBER_NAV
  }
}
