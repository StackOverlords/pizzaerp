import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BootGate } from '../BootGate'

// Mutable state for per-test control — must use vi.hoisted so these run
// before the vi.mock factory closures are captured.
const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: false },
  config: {
    data: undefined as { mode: string; setupDone: boolean } | undefined,
    isLoading: true,
    isError: false,
    refetch: () => {},
  },
}))

vi.mock('@/core/auth/store', () => ({
  useAuthStore: (selector: (s: typeof mocks.auth) => unknown) => selector(mocks.auth),
}))

vi.mock('@/features/config/api', () => ({
  useAppConfig: () => mocks.config,
}))

// Stub components to avoid deep dependency trees (lucide-react LucideProvider requirement, etc.)
vi.mock('@/components/boot/BootSplash', () => ({
  BootSplash: () => <div data-testid="boot-splash">Cargando…</div>,
}))
vi.mock('@/pages/Login', () => ({ default: () => <div data-testid="login-page">LoginPage</div> }))
vi.mock('@/pages/Setup', () => ({ default: () => <div data-testid="setup-page">SetupPage</div> }))

beforeEach(() => {
  mocks.auth.isAuthenticated = false
  mocks.auth.isLoading = false
  mocks.config.data = undefined
  mocks.config.isLoading = true
  mocks.config.isError = false
})

describe('BootGate', () => {
  // CO-05
  it('CO-05: muestra BootSplash mientras carga config', () => {
    mocks.config.isLoading = true
    render(<BootGate>App</BootGate>)
    expect(screen.getByTestId('boot-splash')).toBeInTheDocument()
  })

  it('CO-05: muestra BootSplash mientras el auth SDK inicializa', () => {
    mocks.config.isLoading = false
    mocks.config.data = { mode: 'client-vps', setupDone: true }
    mocks.auth.isLoading = true
    render(<BootGate>App</BootGate>)
    expect(screen.getByTestId('boot-splash')).toBeInTheDocument()
  })

  // CO-06
  it('CO-06: error de red → pantalla de conexión con botón reintentar', () => {
    mocks.config.isLoading = false
    mocks.config.isError = true
    render(<BootGate>App</BootGate>)
    expect(screen.getByText('Sin conexión al servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  // CO-07
  it('CO-07: modo saas sin setup → pantalla de sistema mal configurado', () => {
    mocks.config.isLoading = false
    mocks.config.data = { mode: 'saas', setupDone: false }
    render(<BootGate>App</BootGate>)
    expect(screen.getByText('Sistema mal configurado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
  })

  // CO-08
  it('CO-08: client-vps sin setup → SetupPage', () => {
    mocks.config.isLoading = false
    mocks.config.data = { mode: 'client-vps', setupDone: false }
    render(<BootGate>App</BootGate>)
    expect(screen.getByTestId('setup-page')).toBeInTheDocument()
  })

  // CO-09
  it('CO-09: setup done pero no autenticado → LoginPage', () => {
    mocks.config.isLoading = false
    mocks.config.data = { mode: 'client-vps', setupDone: true }
    mocks.auth.isAuthenticated = false
    render(<BootGate>App</BootGate>)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  // CO-10
  it('CO-10: setup done y autenticado → renderiza children', () => {
    mocks.config.isLoading = false
    mocks.config.data = { mode: 'client-vps', setupDone: true }
    mocks.auth.isAuthenticated = true
    render(<BootGate><div data-testid="app-shell">Shell</div></BootGate>)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })
})
