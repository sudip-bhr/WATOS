export interface ClusterStyle {
  border: string
  bg: string
  text: string
  badgeBg: string
  badgeText: string
  accent: string
  fill: string // hex color for charts/SVGs
  name: string
}

export const getClusterStyle = (clusterId?: number | null): ClusterStyle => {
  if (clusterId === undefined || clusterId === null) {
    return {
      border: 'border-zinc-200 hover:border-zinc-300',
      bg: 'bg-white/70',
      text: 'text-zinc-500',
      badgeBg: 'bg-zinc-100',
      badgeText: 'text-zinc-600',
      accent: 'bg-zinc-300',
      fill: '#a1a1aa',
      name: 'Unclustered'
    }
  }

  switch (clusterId) {
   case 0:
     return {
        border: 'border-sky-300/60 hover:border-sky-400',
        bg: 'bg-sky-50/40 backdrop-blur-md hover:bg-sky-100/50',
        text: 'text-sky-700',
        badgeBg: 'bg-sky-100/60 border border-sky-200/60',
        badgeText: 'text-sky-700',
        accent: 'bg-sky-500',
        fill: '#2563eb',
        name: 'Core Tasks'
     }
    case 1:
      return {
        border: 'border-emerald-100/80 hover:border-emerald-200/90',
        bg: 'bg-emerald-50/20 backdrop-blur-md',
        text: 'text-emerald-700',
        badgeBg: 'bg-emerald-50/50 border border-emerald-100/50',
        badgeText: 'text-emerald-700',
        accent: 'bg-emerald-400',
        fill: '#10b981',
        name: 'Heavy Workload'
      }
    case 2:
      return {
        border: 'border-amber-100/80 hover:border-amber-200/90',
        bg: 'bg-amber-50/20 backdrop-blur-md',
        text: 'text-amber-700',
        badgeBg: 'bg-amber-50/50 border border-amber-100/50',
        badgeText: 'text-amber-700',
        accent: 'bg-amber-400',
        fill: '#f59e0b',
        name: 'Balanced Tasks'
      }
    case 3:
      return {
        border: 'border-violet-100/80 hover:border-violet-200/90',
        bg: 'bg-violet-50/20 backdrop-blur-md',
        text: 'text-violet-700',
        badgeBg: 'bg-violet-50/50 border border-violet-100/50',
        badgeText: 'text-violet-700',
        accent: 'bg-violet-400',
        fill: '#8b5cf6',
        name: 'Support Tasks'
      }
    case 4:
      return {
        border: 'border-rose-100/80 hover:border-rose-200/90',
        bg: 'bg-rose-50/20 backdrop-blur-md',
        text: 'text-rose-700',
        badgeBg: 'bg-rose-50/50 border border-rose-100/50',
        badgeText: 'text-rose-700',
        accent: 'bg-rose-400',
        fill: '#f43f5e',
        name: 'Cluster 4'
      }
    case -1:
    default:
      return {
        border: 'border-zinc-200 hover:border-zinc-300',
        bg: 'bg-zinc-50/30 backdrop-blur-md',
        text: 'text-zinc-600',
        badgeBg: 'bg-zinc-100/80 border border-zinc-200/50',
        badgeText: 'text-zinc-700',
        accent: 'bg-zinc-400',
        fill: '#71717a',
        name: clusterId === -1 ? 'Noise (Outliers)' : `Cluster ${clusterId}`
      }
  }
}

export type ComplexityLabel = 'Low' | 'Medium' | 'High'

export const getComplexityLabel = (val: number): ComplexityLabel => {
  if (val <= 2.5) return 'Low'
  if (val <= 3.5) return 'Medium'
  return 'High'
}

export interface ComplexityStyle {
  badge: string
  dot: string
  fill: string
}

export const getComplexityStyle = (label: ComplexityLabel): ComplexityStyle => {
  switch (label) {
    case 'Low':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100/80',
        dot: 'bg-emerald-500',
        fill: '#10b981'
      }
    case 'Medium':
      return {
        badge: 'bg-amber-50 text-amber-700 border border-amber-100/80',
        dot: 'bg-amber-500',
        fill: '#f59e0b'
      }
    case 'High':
      return {
        badge: 'bg-rose-50 text-rose-700 border border-rose-100/80',
        dot: 'bg-rose-500',
        fill: '#f43f5e'
      }
  }
}

export const getClusterComplexityCategory = (clusterTasks: { complexity: number }[]): string => {
  if (clusterTasks.length === 0) return 'Unknown Complexity'
  const avg = clusterTasks.reduce((sum, t) => sum + t.complexity, 0) / clusterTasks.length
  return `${getComplexityLabel(avg)} Complexity`
}

