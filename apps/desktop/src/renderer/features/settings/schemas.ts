import { z } from 'zod'

export const THEME_SOURCE = {
  SYSTEM: 'system',
  LIGHT:  'light',
  DARK:   'dark',
} as const
export type ThemeSource = (typeof THEME_SOURCE)[keyof typeof THEME_SOURCE]

export const SETTINGS_SECTION = {
  GENERAL:     'general',
  APPEARANCE:  'appearance',
  WORKBENCH:   'workbench',
  ACCOUNT:     'account',
  KEYBINDINGS: 'keybindings',
} as const
export type SettingsSection = (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION]

export const generalSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  showMenubar: z.boolean(),
})
export type GeneralSettings = z.infer<typeof generalSettingsSchema>
