import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = {
  ES: 'es',
  EN: 'en',
} as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES]

const LANGUAGE_VALUES = Object.values(SUPPORTED_LANGUAGES) as string[]

export async function initI18n(savedLang?: string | null) {
  const detected = navigator.language.startsWith('es') ? 'es' : 'en'
  const lng = savedLang && LANGUAGE_VALUES.includes(savedLang) ? savedLang : detected

  await i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })
}

export { i18n }
