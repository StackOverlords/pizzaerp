import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { useTranslation } from 'react-i18next'
import { LogOut, ShieldCheck, User, Wrench } from 'lucide-react'
import { useAuthStore } from '@/core/auth/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { extractApiMessage } from '@/core/http/error'
import { notify } from '@/core/notify'
import { useSetPin, useTenantSettings, useUpdateTenantSetting, useMigrateTenantSchema } from '../../api'
import { setPinSchema, type SetPinInput } from '../../schemas'

function SetPinForm() {
  const mutation = useSetPin()
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetPinInput>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: '', confirmPin: '' },
  })

  async function onSubmit(data: SetPinInput) {
    setApiError(null)
    try {
      await mutation.mutateAsync(data.pin)
      notify('PIN configurado correctamente.', { type: 'success' })
      reset()
    } catch (err) {
      setApiError(extractApiMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nuevo PIN</label>
          <Controller
            control={control}
            name="pin"
            render={({ field }) => (
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={field.value} onChange={field.onChange} disabled={isSubmitting}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {errors.pin && <p className="text-xs text-destructive">{errors.pin.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Confirmar PIN</label>
          <Controller
            control={control}
            name="confirmPin"
            render={({ field }) => (
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={field.value} onChange={field.onChange} disabled={isSubmitting}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {errors.confirmPin && <p className="text-xs text-destructive">{errors.confirmPin.message}</p>}
        </div>
      </div>

      {apiError && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{apiError}</p>
      )}

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Guardar PIN'}
      </Button>
    </form>
  )
}

function PinToggles() {
  const { data: settings, isLoading } = useTenantSettings()
  const updateSetting = useUpdateTenantSetting()

  async function toggle(key: string, value: boolean) {
    try {
      await updateSetting.mutateAsync({ key, value })
    } catch {
      notify('Error al actualizar la configuración.', { type: 'error' })
    }
  }

  if (isLoading) return <p className="text-xs text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm">Requerir PIN para cancelar</p>
          <p className="text-xs text-muted-foreground">El cajero debe ingresar el PIN para cancelar una orden</p>
        </div>
        <Switch
          checked={settings?.requirePinForCancel ?? true}
          onCheckedChange={(v) => toggle('require_pin_for_cancel', v)}
          disabled={updateSetting.isPending}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm">Requerir PIN para descuentos</p>
          <p className="text-xs text-muted-foreground">El cajero debe ingresar el PIN para aplicar un descuento</p>
        </div>
        <Switch
          checked={settings?.requirePinForDiscount ?? true}
          onCheckedChange={(v) => toggle('require_pin_for_discount', v)}
          disabled={updateSetting.isPending}
        />
      </div>
    </div>
  )
}

function MaintenanceSection() {
  const migrate = useMigrateTenantSchema()

  async function handleMigrate() {
    try {
      await migrate.mutateAsync()
      notify('Esquema actualizado correctamente.', { type: 'success' })
    } catch {
      notify('Error al actualizar el esquema.', { type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench size={15} className="text-muted-foreground" />
        <p className="text-sm font-medium">Mantenimiento</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm">Actualizar esquema de base de datos</p>
          <p className="text-xs text-muted-foreground">
            Crea tablas nuevas y aplica migraciones pendientes. Seguro de ejecutar múltiples veces.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMigrate}
          disabled={migrate.isPending}
          className="shrink-0 ml-4"
        >
          {migrate.isPending ? 'Actualizando...' : 'Ejecutar'}
        </Button>
      </div>
    </div>
  )
}

export function AccountSection() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium">{t('settings.account.title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('settings.account.description')}</p>
      </div>

      <Separator />

      {/* User info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{user?.username ?? '—'}</p>
          {user?.role && <Badge variant="secondary" className="mt-1 text-xs">{user.role}</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-destructive hover:text-destructive">
          <LogOut size={14} />
          {t('settings.account.logout')}
        </Button>
      </div>

      {isAdmin && (
        <>
          <Separator />

          {/* PIN setup */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-muted-foreground" />
              <p className="text-sm font-medium">PIN de autorización</p>
            </div>
            <p className="text-xs text-muted-foreground">
              PIN de 6 dígitos que el cajero ingresa para autorizar cancelaciones y descuentos desde caja.
            </p>
            <SetPinForm />
          </div>

          <Separator />

          {/* PIN toggles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User size={15} className="text-muted-foreground" />
              <p className="text-sm font-medium">Autorización en caja</p>
            </div>
            <PinToggles />
          </div>

          <Separator />

          {/* Maintenance */}
          <MaintenanceSection />
        </>
      )}
    </div>
  )
}
