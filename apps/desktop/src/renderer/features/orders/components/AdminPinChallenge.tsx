import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, FieldPath, FieldValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

interface AdminPinChallengeProps<TForm extends FieldValues> {
  control: Control<TForm>
  errors: FieldErrors<TForm>
  usernameFieldName: FieldPath<TForm>
  pinFieldName: FieldPath<TForm>
  pinLength?: number
  disabled?: boolean
}

export function AdminPinChallenge<TForm extends FieldValues>({
  control,
  errors,
  usernameFieldName,
  pinFieldName,
  pinLength = 6,
  disabled = false,
}: AdminPinChallengeProps<TForm>) {
  const usernameError = errors[usernameFieldName]
  const pinError = errors[pinFieldName]

  return (
    <div className="space-y-4">
      {/* Admin username */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Usuario administrador</label>
        <Controller
          control={control}
          name={usernameFieldName}
          render={({ field }) => (
            <Input
              {...field}
              type="text"
              placeholder="Usuario"
              disabled={disabled}
              autoComplete="off"
            />
          )}
        />
        {usernameError && (
          <p className="text-sm text-destructive">
            {String(usernameError.message ?? 'Requerido')}
          </p>
        )}
      </div>

      {/* Admin PIN */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">PIN ({pinLength} dígitos)</label>
        <Controller
          control={control}
          name={pinFieldName}
          render={({ field }) => (
            <InputOTP
              maxLength={pinLength}
              pattern={REGEXP_ONLY_DIGITS}
              value={field.value ?? ''}
              onChange={field.onChange}
              disabled={disabled}
            >
              <InputOTPGroup>
                {Array.from({ length: pinLength }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Ingresá el PIN de {pinLength} dígitos del administrador
        </p>
        {pinError && (
          <p className="text-sm text-destructive">
            {String(pinError.message ?? 'PIN inválido')}
          </p>
        )}
      </div>
    </div>
  )
}
