import { useTranslation } from 'react-i18next'
import { ShiftHistoryTable } from '@/features/shifts/components/ShiftHistoryTable'

export default function ShiftsHistoryPage() {
  const { t } = useTranslation()

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">{t('shifts.history.title')}</h1>
      <ShiftHistoryTable />
    </div>
  )
}
