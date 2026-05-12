export const APP_MODE = {
  SAAS:       'saas',
  CLIENT_VPS: 'client-vps',
} as const
export type AppMode = (typeof APP_MODE)[keyof typeof APP_MODE]

export interface AppConfig {
  mode:       AppMode
  setupDone:  boolean
}
