import React, { createContext, useContext, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, HelpCircle } from "lucide-react"

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return context
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolverRef.current) {
      resolverRef.current(false)
    }
  }

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolverRef.current) {
      resolverRef.current(true)
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel() }}>
        <DialogContent className="max-w-md p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-xl">
          <DialogHeader className="flex flex-row items-start space-x-4 space-y-0 text-left">
            <div className={`p-3 rounded-full shrink-0 ${
              options?.variant === "destructive"
                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400"
                : "bg-zinc-50 dark:bg-zinc-850/30 text-zinc-500 dark:text-zinc-400"
            }`}>
              {options?.variant === "destructive" ? (
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              ) : (
                <HelpCircle className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 font-outfit leading-tight mt-1">
                {options?.title}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 leading-relaxed">
                {options?.description}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto px-4 py-2 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg font-medium transition-all"
            >
              {options?.cancelText || "Cancel"}
            </Button>
            <Button
              variant={options?.variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-5 py-2 font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                options?.variant === "destructive"
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
                  : "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-900/10 dark:shadow-none"
              }`}
            >
              {options?.confirmText || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
