import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface RouteConfig {
  id: string
  path: string
  label: string
  icon?: LucideIcon
  element: ReactNode
  showInSidebar?: boolean
  permissions?: string[]
  roles?: string[]
  order?: number
  group?: string
  children?: RouteConfig[]
}
