import type { ReactNode } from 'react'
import { useAppConfig } from '@/features/config/api'
import { useAuthStore } from '@/core/auth/store'
import { APP_MODE } from '@/features/config/schemas'
import { BootSplash } from './BootSplash'
import { BootErrorScreen } from './BootErrorScreen'
import { MinimalTitleBar } from './MinimalTitleBar'
import LoginPage from '@/pages/Login'
import SetupPage from '@/pages/Setup'

interface BootGateProps {
  children: ReactNode
}

function OuterShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <MinimalTitleBar />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

export function BootGate({ children }: BootGateProps) {
  const { data: config, isLoading: configLoading, isError, refetch } = useAppConfig()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authLoading = useAuthStore((s) => s.isLoading)

  // 1. Still loading config or auth SDK initializing
  if (configLoading || authLoading) {
    return <OuterShell><BootSplash /></OuterShell>
  }

  // 2. Network error fetching config
  if (isError || !config) {
    return <OuterShell><BootErrorScreen variant="connection" onRetry={() => void refetch()} /></OuterShell>
  }

  // 3. SaaS mode but no setup done → misconfigured (not the operator's job to fix)
  if (config.mode === APP_MODE.SAAS && !config.setupDone) {
    return <OuterShell><BootErrorScreen variant="misconfigured" /></OuterShell>
  }

  // 4. Client-VPS first install
  if (!config.setupDone) {
    return <OuterShell><SetupPage /></OuterShell>
  }

  // 5. Setup done but no session
  if (!isAuthenticated) {
    return <OuterShell><LoginPage /></OuterShell>
  }

  // 6. All good — render shell
  return <>{children}</>
}
