import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 gap-5 text-center', className)}>
      <div className="h-20 w-20 rounded-3xl bg-zinc-100 flex items-center justify-center">
        <Icon size={36} className="text-zinc-300" />
      </div>
      <div>
        <p className="text-lg font-black text-zinc-300 uppercase tracking-widest">{title}</p>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2 mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
