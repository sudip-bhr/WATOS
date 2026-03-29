import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?: 'default' | 'dark' | 'success' | 'warning' | 'danger'
  className?: string
}

const variantStyles = {
  default: 'border-zinc-100 bg-white',
  dark: 'bg-zinc-900 text-white border-none shadow-xl shadow-zinc-900/10',
  success: 'border-emerald-100 bg-emerald-50/30',
  warning: 'border-amber-100 bg-amber-50/30',
  danger: 'border-rose-100 bg-rose-50/30',
}

const titleVariants = {
  default: 'text-zinc-500',
  dark: 'text-white/60',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
}

const valueVariants = {
  default: 'text-zinc-900',
  dark: 'text-white',
  success: 'text-emerald-950',
  warning: 'text-amber-950',
  danger: 'text-rose-950',
}

const StatCard = ({ title, value, subtitle, icon: Icon, variant = 'default', className }: StatCardProps) => {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn(
          'text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2',
          titleVariants[variant]
        )}>
          {Icon && <Icon size={14} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-black', valueVariants[variant])}>
          {value}
        </div>
        {subtitle && (
          <p className={cn(
            'text-[10px] uppercase font-bold mt-1',
            variant === 'dark' ? 'opacity-50' : 'text-zinc-400'
          )}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
