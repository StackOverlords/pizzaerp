import type { ComponentType, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface TabConfig {
  singleton?: boolean
  closable?: boolean
  keepMounted?: boolean
  maxInstances?: number
}

export interface RouteConfig {
  id: string
  path: string
  label: string
  icon?: LucideIcon
  element: ReactNode
  component?: ComponentType
  showInSidebar?: boolean
  permissions?: string[]
  roles?: string[]
  order?: number
  group?: string
  children?: RouteConfig[]
  tabConfig?: TabConfig
}
