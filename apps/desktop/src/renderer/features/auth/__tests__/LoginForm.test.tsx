import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginForm } from '../components/LoginForm'

const mocks = vi.hoisted(() => ({
  mode: undefined as string | undefined,
  login: vi.fn(),
}))

vi.mock('@/features/config/store', () => ({
  useAppConfigStore: (selector: (s: { config: { mode: string } | null }) => unknown) =>
    selector(mocks.mode !== undefined ? { config: { mode: mocks.mode } } : { config: null }),
}))

vi.mock('@/core/auth/store', () => ({
  useAuthStore: (selector: (s: { login: typeof mocks.login }) => unknown) =>
    selector({ login: mocks.login }),
}))

vi.mock('@/core/notify', () => ({
  notify: vi.fn(),
}))

// @base-ui/react (used by Input) uses ESM React that creates a separate module
// instance from CJS react-dom in the test environment. Replace with native input.
vi.mock('@/components/ui/input', () => ({
  Input: ({ id, ...props }: { id?: string; [k: string]: unknown }) => (
    <input id={id} {...(props as Record<string, unknown>)} />
  ),
}))

// react-hook-form uses React internals (useRef/useEffect) that conflict with
// vitest's module isolation in happy-dom. Mock the minimal API we need.
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: (name: string) => ({ id: name, name }),
    handleSubmit: (onValid: unknown) => (e: Event) => {
      e?.preventDefault?.()
      if (typeof onValid === 'function') onValid({})
    },
    formState: { errors: {}, isSubmitting: false },
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => undefined,
}))

beforeEach(() => {
  mocks.mode = undefined
  mocks.login.mockReset()
})

describe('LoginForm', () => {
  // CO-11
  it('CO-11: en modo client-vps NO muestra campo slug', () => {
    mocks.mode = 'client-vps'
    render(<LoginForm />)
    expect(screen.queryByLabelText(/slug/i)).not.toBeInTheDocument()
  })

  // CO-12
  it('CO-12: en modo saas SÍ muestra campo slug', () => {
    mocks.mode = 'saas'
    render(<LoginForm />)
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument()
  })

  // CO-13
  it('CO-13: sin config (modo undefined) NO muestra campo slug', () => {
    mocks.mode = undefined
    render(<LoginForm />)
    expect(screen.queryByLabelText(/slug/i)).not.toBeInTheDocument()
  })

  // CO-14
  it('CO-14: siempre muestra campos usuario y contraseña', () => {
    mocks.mode = 'client-vps'
    render(<LoginForm />)
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })
})
