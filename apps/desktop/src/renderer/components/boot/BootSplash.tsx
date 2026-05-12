import { Spinner } from '@/components/ui/spinner'

export function BootSplash() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  )
}
