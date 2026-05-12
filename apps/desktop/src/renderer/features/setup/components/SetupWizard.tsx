import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify } from '@/core/notify'
import { useSetup } from '../api'
import { setupSchema } from '../schemas'
import type { SetupPayload } from '../schemas'

export function SetupWizard() {
  const { mutateAsync, isPending } = useSetup()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupPayload>({
    resolver: zodResolver(setupSchema),
  })

  const onSubmit = async (data: SetupPayload) => {
    try {
      await mutateAsync(data)
      // No navegar — BootGate detecta setupDone: true y redirige automáticamente
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al configurar la aplicación'
      notify(message, { type: 'error' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tenantName">Nombre del negocio</Label>
        <Input
          id="tenantName"
          autoComplete="organization"
          {...register('tenantName')}
        />
        {errors.tenantName && (
          <p className="text-xs text-destructive">{errors.tenantName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          autoComplete="off"
          placeholder="mi-negocio"
          {...register('slug')}
        />
        {errors.slug && (
          <p className="text-xs text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">Usuario administrador</Label>
        <Input
          id="username"
          autoComplete="username"
          {...register('username')}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Configurando…' : 'Iniciar instalación'}
      </Button>
    </form>
  )
}
