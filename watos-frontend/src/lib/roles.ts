/**
 * Role-based routing and navigation utilities for WATOS.
 */

export const getRoleHome = (role?: string): string => {
  const normalizedRole = (role || '').toLowerCase()
  switch (normalizedRole) {
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
  { label: 'Task Board', icon: 'LayoutGrid', path: '/member/board' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const OPERATOR_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'Home', path: '/operator' },
  { label: 'Task Board', icon: 'LayoutGrid', path: '/operator/board' },
  { label: 'Analytics', icon: 'BarChart3', path: '/operator/analytics' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'User Management', icon: 'UserCog', path: '/operator/users' },
  { label: 'Smart Assign', icon: 'Brain', path: '/operator/assign' },
  { label: 'Monthly Reports', icon: 'FileText', path: '/operator/reports' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: 'Home', path: '/admin' },
  { label: 'Monitor Workload', icon: 'Users', path: '/admin/workload' },
  { label: 'Task Board', icon: 'LayoutGrid', path: '/admin/board' },
  { label: 'Analytics', icon: 'BarChart3', path: '/admin/analytics' },
  { label: 'User Management', icon: 'UserCog', path: '/admin/users' },
  { label: 'Assign Members', icon: 'UserCheck', path: '/admin/assign-members' },
  { label: 'Report Inbox', icon: 'Inbox', path: '/admin/reports' },
  { label: 'ML Config', icon: 'Cpu', path: '/admin/ml' },
  { label: 'Org Settings', icon: 'Building', path: '/admin/org' },
  { label: 'Audit Log', icon: 'ScrollText', path: '/admin/audit' },
  { label: 'Projects', icon: 'FolderKanban', path: '/projects' },
  { label: 'Profile', icon: 'User', path: '/profile' },
]

export const getNavForRole = (role?: string): NavItem[] => {
  const normalizedRole = (role || '').toLowerCase()
  switch (normalizedRole) {
    case 'admin': return ADMIN_NAV
    case 'operator': return OPERATOR_NAV
    case 'member': return MEMBER_NAV
    default: return MEMBER_NAV
  }
}
