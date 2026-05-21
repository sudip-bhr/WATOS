import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "../../hooks/use-toast"
import { CheckCircle2, AlertTriangle, XCircle, Info, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const getIcon = (variant: string | null | undefined) => {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
    case "destructive":
      return <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 animate-bounce-subtle" />
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
    case "info":
      return <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
    default:
      return <Bell className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
  }
}

const getProgressBarColor = (variant: string | null | undefined) => {
  switch (variant) {
    case "success":
      return "bg-emerald-500/80"
    case "destructive":
      return "bg-rose-500/80"
    case "warning":
      return "bg-amber-500/80"
    case "info":
      return "bg-indigo-500/80"
    default:
      return "bg-zinc-400/80"
  }
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant || "default"
        const duration = props.duration || 5000

        return (
          <Toast key={id} {...props} duration={duration}>
            <div className="flex items-start space-x-3 w-full pr-4">
              {getIcon(variant)}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle className="font-bold text-[14px] leading-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-zinc-500 dark:text-zinc-400 text-[13px] leading-snug">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
            <div
              className={cn("toast-progress-bar", getProgressBarColor(variant))}
              style={{ animationDuration: `${duration}ms` }}
            />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
