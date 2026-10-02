import { useCallback, useEffect, useState } from 'react'
import type { Station } from './api'
import { useI18n } from './i18n'
import { pushRecent } from './storage'
import SearchTab from './components/SearchTab'
import NearbyTab from './components/NearbyTab'
import StationBoard from './components/StationBoard'

type Tab = 'search' | 'nearby'

// The open station lives in the URL hash (#/stop/<id>?n=<name>) so the
// browser back button and shared links work.
function stationFromHash(): Station | null {
  const m = location.hash.match(/^#\/stop\/([^?]+)(?:\?n=(.*))?$/)
  if (!m) return null
  const id = decodeURIComponent(m[1])
  const name = m[2] ? decodeURIComponent(m[2]) : id
  return { id, name }
}

function hashFor(s: Station): string {
  return `#/stop/${encodeURIComponent(s.id)}?n=${encodeURIComponent(s.name)}`
}

export default function App() {
  const { t, lang, setLang } = useI18n()
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return localStorage.getItem('tab') === 'nearby' ? 'nearby' : 'search'
    } catch {
      return 'search'
    }
  })
  const [station, setStation] = useState<Station | null>(stationFromHash)

  useEffect(() => {
    const onPop = () => setStation(stationFromHash())
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('tab', tab)
    } catch {
      /* storage unavailable */
    }
  }, [tab])

  const open = useCallback((s: Station) => {
    pushRecent(s)
    history.pushState({ inApp: true }, '', hashFor(s))
    setStation(s)
    window.scrollTo(0, 0)
  }, [])

  const close = useCallback(() => {
    if (history.state?.inApp) {
      history.back()
    } else {
      history.replaceState(null, '', location.pathname + location.search)
      setStation(null)
    }
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Genève
        </div>
        <div className="lang" role="group" aria-label="Language">
          {(['en', 'fr'] as const).map((l) => (
            <button
              key={l}
              className={lang === l ? 'active' : ''}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {station ? (
        <StationBoard station={station} onBack={close} />
      ) : (
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'search'}
            className={tab === 'search' ? 'active' : ''}
            onClick={() => setTab('search')}
          >
            <SearchIcon /> {t('tabSearch')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'nearby'}
            className={tab === 'nearby' ? 'active' : ''}
            onClick={() => setTab('nearby')}
          >
            <PinIcon /> {t('tabNearby')}
          </button>
        </nav>
      )}

      {/* Tabs stay mounted so the query / location survive opening a stop. */}
      <main hidden={!!station || tab !== 'search'}>
        <SearchTab onOpen={open} active={!station && tab === 'search'} />
      </main>
      <main hidden={!!station || tab !== 'nearby'}>
        <NearbyTab onOpen={open} active={!station && tab === 'nearby'} />
      </main>

      <footer className="foot">
        Data: <a href="https://transport.opendata.ch" target="_blank" rel="noreferrer">transport.opendata.ch</a>
      </footer>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}
