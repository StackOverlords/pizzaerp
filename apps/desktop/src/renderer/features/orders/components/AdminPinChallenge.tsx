import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, FieldPath, FieldValues } from 'react-hook-form'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

interface AdminPinChallengeProps<TForm extends FieldValues> {
  control: Control<TForm>
  errors: FieldErrors<TForm>
  pinFieldName: FieldPath<TForm>
  pinLength?: number
  disabled?: boolean
}

export function AdminPinChallenge<TForm extends FieldValues>({
  control,
  errors,
  pinFieldName,
  pinLength = 6,
  disabled = false,
}: AdminPinChallengeProps<TForm>) {
  const pinError = errors[pinFieldName]

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">PIN de administrador</label>
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
      {pinError && (
        <p className="text-sm text-destructive">
          {String(pinError.message ?? 'PIN inválido')}
        </p>
      )}
    </div>
  )
}
