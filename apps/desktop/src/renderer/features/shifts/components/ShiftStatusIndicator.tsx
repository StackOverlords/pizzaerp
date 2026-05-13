import { useState, useEffect } from 'react'
import { Clock, ClockFading, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { eventBus } from '@/core/events/event-bus'
import { SIDEBAR_ICON_THRESHOLD, useSidebarWidthStore } from '@/core/sidebar/use-sidebar-resize'
import { useCurrentShift } from '../api'
import { SHIFT_STATUS } from '../schemas'
import { OpenShiftDialog } from './OpenShiftDialog'
import { CloseShiftDialog } from './CloseShiftDialog'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function ShiftStatusIndicator() {
  const { t } = useTranslation()
  const { data: shift, isLoading } = useCurrentShift()
  const width = useSidebarWidthStore((s) => s.width)
  const iconOnly = width < SIDEBAR_ICON_THRESHOLD

  const [isOpenDialogVisible, setIsOpenDialogVisible] = useState(false)
  const [isCloseDialogVisible, setIsCloseDialogVisible] = useState(false)

  useEffect(() => {
    const unsubOpen = eventBus.on('shifts.openDialog.requested', () => {
      setIsOpenDialogVisible(true)
    })
    const unsubClose = eventBus.on('shifts.closeDialog.requested', () => {
      setIsCloseDialogVisible(true)
    })
    return () => {
      unsubOpen()
      unsubClose()
    }
  }, [])

  const isOpen = shift?.status === SHIFT_STATUS.OPEN

  if (iconOnly) {
    return (
      <>
        <button
          onClick={() => isOpen ? setIsCloseDialogVisible(true) : setIsOpenDialogVisible(true)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
            'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            isOpen && 'text-green-600 hover:text-green-700',
          )}
          title={isLoading ? t('shifts.indicator.loading') : isOpen ? t('shifts.indicator.open', { time: shift ? formatTime(shift.openedAt) : '' }) : t('shifts.indicator.closed')}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isOpen ? (
            <Clock size={16} />
          ) : (
            <ClockFading size={16} />
          )}
        </button>

        <OpenShiftDialog open={isOpenDialogVisible} onOpenChange={setIsOpenDialogVisible} />
        <CloseShiftDialog open={isCloseDialogVisible} onOpenChange={setIsCloseDialogVisible} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => isOpen ? setIsCloseDialogVisible(true) : setIsOpenDialogVisible(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
          isOpen && 'text-green-600 hover:text-green-700',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 size={15} className="shrink-0 animate-spin" />
            <span className="truncate">{t('shifts.indicator.loading')}</span>
          </>
        ) : isOpen && shift ? (
          <>
            <Clock size={15} className="shrink-0" />
            <span className="truncate">
              {t('shifts.indicator.open', { time: formatTime(shift.openedAt) })}
            </span>
          </>
        ) : (
          <>
            <ClockFading size={15} className="shrink-0" />
            <span className="truncate">{t('shifts.indicator.closed')}</span>
          </>
        )}
      </button>

      <OpenShiftDialog open={isOpenDialogVisible} onOpenChange={setIsOpenDialogVisible} />
      <CloseShiftDialog open={isCloseDialogVisible} onOpenChange={setIsCloseDialogVisible} />
    </>
  )
}
