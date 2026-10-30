import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'pt' | 'en'
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void } | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem('ko-language') === 'en' ? 'en' : 'pt')
  const setLanguage = (value: Language) => {
    localStorage.setItem('ko-language', value)
    setLanguageState(value)
  }
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({ language, setLanguage }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage deve ser usado dentro de LanguageProvider.')
  return value
}

export function LanguageSelect({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="sr-only">Language / Idioma</span>
      <select aria-label="Language / Idioma" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="rounded-md border border-line bg-white px-2 py-1.5 text-navy">
        <option value="pt">Português</option>
        <option value="en">English</option>
      </select>
    </label>
  )
}

export function languageText(language: Language, portuguese: string, english: string) {
  return language === 'en' ? english : portuguese
}
