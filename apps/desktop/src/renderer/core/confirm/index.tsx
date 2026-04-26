import { create } from 'zustand'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  resolve: ((value: boolean) => void) | null
  _show: (options: ConfirmOptions, resolve: (value: boolean) => void) => void
  _settle: (value: boolean) => void
}

const useConfirmStore = create<ConfirmState>()((set, get) => ({
  open: false,
  options: {},
  resolve: null,
  _show: (options, resolve) => set({ open: true, options, resolve }),
  _settle: (value) => {
    get().resolve?.(value)
    set({ open: false, resolve: null })
  },
}))

export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState()._show(options, resolve)
  })
}

export function ConfirmDialog() {
  const { t } = useTranslation()
  const { open, options, _settle } = useConfirmStore()
  const {
    title = t('confirm.title'),
    description,
    confirmLabel = t('confirm.confirm'),
    cancelLabel = t('confirm.cancel'),
    variant = 'default',
  } = options

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) _settle(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => _settle(false)}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => _settle(true)}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
