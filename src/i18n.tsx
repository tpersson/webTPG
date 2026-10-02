import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'fr'

const dict = {
  en: {
    tabSearch: 'Search',
    tabNearby: 'Near me',
    searchPlaceholder: 'Search a stop, e.g. Plainpalais',
    recent: 'Recent',
    noResults: 'No stops found in Geneva',
    searchHint: 'Type the name of a tram or bus stop',
    locating: 'Finding your location…',
    locate: 'Use my location',
    locationDenied: 'Location access was denied. Allow it in your browser settings to see nearby stops.',
    locationUnavailable: 'Your location is not available right now.',
    locationUnsupported: 'Your browser does not support location.',
    nearbyHint: 'Show the stops closest to you',
    noNearby: 'No stops found nearby',
    back: 'Back',
    now: 'now',
    min: 'min',
    noDepartures: 'No upcoming trams or buses',
    error: 'Could not load data. Check your connection and try again.',
    retry: 'Retry',
    updated: 'Updated',
    tram: 'Tram',
    bus: 'Bus',
    late: 'late',
    loading: 'Loading…',
    clear: 'Clear',
    refresh: 'Refresh',
  },
  fr: {
    tabSearch: 'Rechercher',
    tabNearby: 'À proximité',
    searchPlaceholder: 'Chercher un arrêt, ex. Plainpalais',
    recent: 'Récents',
    noResults: 'Aucun arrêt trouvé à Genève',
    searchHint: 'Tapez le nom d’un arrêt de tram ou de bus',
    locating: 'Localisation en cours…',
    locate: 'Utiliser ma position',
    locationDenied: 'L’accès à la position a été refusé. Autorisez-le dans les réglages du navigateur pour voir les arrêts proches.',
    locationUnavailable: 'Votre position n’est pas disponible pour le moment.',
    locationUnsupported: 'Votre navigateur ne prend pas en charge la localisation.',
    nearbyHint: 'Afficher les arrêts les plus proches',
    noNearby: 'Aucun arrêt trouvé à proximité',
    back: 'Retour',
    now: 'départ',
    min: 'min',
    noDepartures: 'Aucun tram ni bus à venir',
    error: 'Impossible de charger les données. Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer',
    updated: 'Mis à jour',
    tram: 'Tram',
    bus: 'Bus',
    late: 'de retard',
    loading: 'Chargement…',
    clear: 'Effacer',
    refresh: 'Actualiser',
  },
} satisfies Record<Lang, Record<string, string>>

export type Key = keyof typeof dict.en

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: Key) => string
}

const I18n = createContext<Ctx | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'fr') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])
  return <I18n.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</I18n.Provider>
}

export function useI18n(): Ctx {
  const ctx = useContext(I18n)
  if (!ctx) throw new Error('useI18n outside provider')
  return ctx
}
