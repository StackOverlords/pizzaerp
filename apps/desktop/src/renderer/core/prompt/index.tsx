import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { create } from 'zustand'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PROMPT_FIELD_TYPE = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number',
  URL: 'url',
} as const
type PromptFieldType = (typeof PROMPT_FIELD_TYPE)[keyof typeof PROMPT_FIELD_TYPE]

export interface PromptField {
  id: string
  label: string
  type?: PromptFieldType
  placeholder?: string
  required?: boolean
  defaultValue?: string
}

export interface PromptOptions {
  title?: string
  description?: string
  fields: PromptField[]
  confirmLabel?: string
  cancelLabel?: string
}

export type PromptResult = Record<string, string> | null

interface PromptState {
  open: boolean
  options: PromptOptions
  resolve: ((value: PromptResult) => void) | null
  _show: (options: PromptOptions, resolve: (value: PromptResult) => void) => void
  _settle: (value: PromptResult) => void
}

const usePromptStore = create<PromptState>()((set, get) => ({
  open: false,
  options: { fields: [] },
  resolve: null,
  _show: (options, resolve) => set({ open: true, options, resolve }),
  _settle: (value) => {
    get().resolve?.(value)
    set({ open: false, resolve: null })
  },
}))

export function prompt(options: PromptOptions): Promise<PromptResult> {
  return new Promise((resolve) => {
    usePromptStore.getState()._show(options, resolve)
  })
}

export function PromptDialog() {
  const { t } = useTranslation()
  const { open, options, _settle } = usePromptStore()
  const { fields, title, description, confirmLabel, cancelLabel } = options

  const { register, handleSubmit, reset } = useForm<Record<string, string>>()

  useEffect(() => {
    if (open) {
      reset(Object.fromEntries(fields.map((f) => [f.id, f.defaultValue ?? ''])))
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) _settle(null) }}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={handleSubmit((data) => _settle(data))}>
          <DialogHeader>
            <DialogTitle>{title ?? t('prompt.title')}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <FieldGroup className="py-4">
            {fields.map((field) => (
              <Field key={field.id}>
                <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
                <Input
                  id={field.id}
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  {...register(field.id, { required: field.required })}
                />
              </Field>
            ))}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => _settle(null)}>
              {cancelLabel ?? t('confirm.cancel')}
            </Button>
            <Button type="submit">
              {confirmLabel ?? t('confirm.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
