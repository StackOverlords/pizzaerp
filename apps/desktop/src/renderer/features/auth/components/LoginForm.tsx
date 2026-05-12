import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/core/auth/store'
import { useAppConfigStore } from '@/features/config/store'
import { notify } from '@/core/notify'
import { storage } from '@/lib/storage/adapter'
import { StorageKeys } from '@/lib/storage/keys'
import { loginSchema } from '../schemas'
import type { LoginPayload } from '../schemas'

export function LoginForm() {
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)
  const mode  = useAppConfigStore((s) => s.config?.mode)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (mode !== 'saas') return
    storage.get<string>(StorageKeys.auth.tenantSlug).then((saved) => {
      if (saved) setValue('slug', saved)
    })
  }, [mode, setValue])

  const onSubmit = async (data: LoginPayload) => {
    try {
      await login({
        username: data.username,
        password: data.password,
        slug:     data.slug,
      })
      if (mode === 'saas' && data.slug) {
        await storage.set(StorageKeys.auth.tenantSlug, data.slug)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.login.error')
      notify(message, { type: 'error' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">{t('auth.login.username')}</Label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          {...register('username')}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t('auth.login.password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-9"
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 h-full w-9 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </Button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {mode === 'saas' && (
        <div className="space-y-1.5">
          <Label htmlFor="slug">{t('auth.login.slug')}</Label>
          <Input
            id="slug"
            autoComplete="off"
            {...register('slug')}
          />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
      </Button>
    </form>
  )
}
