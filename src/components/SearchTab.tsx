import { useEffect, useRef, useState } from 'react'
import { searchStations, type Station } from '../api'
import { useI18n } from '../i18n'
import { clearRecent, loadRecent } from '../storage'
import StationList from './StationList'

interface Props {
  onOpen: (s: Station) => void
  active: boolean
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: Station[]; stale?: boolean }
  | { status: 'error' }

export default function SearchTab({ onOpen, active }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  const [recent, setRecent] = useState<Station[]>(loadRecent)
  const [attempt, setAttempt] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  // Refresh the recent list whenever the tab comes back into view.
  useEffect(() => {
    if (active) setRecent(loadRecent())
  }, [active])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ status: 'idle' })
      return
    }
    const ctrl = new AbortController()
    // Keep previous results on screen (dimmed) instead of flashing a skeleton.
    setState((s) => (s.status === 'done' ? { ...s, stale: true } : { status: 'loading' }))
    const timer = setTimeout(() => {
      searchStations(q, ctrl.signal)
        .then((results) => setState({ status: 'done', results }))
        .catch((e) => {
          if (!ctrl.signal.aborted) setState({ status: 'error' })
          if (e?.name !== 'AbortError') console.warn(e)
        })
    }, 280)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, attempt])

  const showRecent = query.trim().length < 2

  return (
    <section>
      <div className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && state.status === 'done' && !state.stale && state.results[0]) onOpen(state.results[0])
          }}
        />
        {query && (
          <button
            className="icon-btn"
            aria-label={t('clear')}
            onClick={() => {
              setQuery('')
              input.current?.focus()
            }}
          >
            ×
          </button>
        )}
      </div>

      {showRecent ? (
        recent.length > 0 ? (
          <>
            <div className="section-head">
              <span>{t('recent')}</span>
              <button
                className="link-btn"
                onClick={() => {
                  clearRecent()
                  setRecent([])
                }}
              >
                {t('clear')}
              </button>
            </div>
            <StationList stations={recent} onOpen={onOpen} />
          </>
        ) : (
          <p className="hint">{t('searchHint')}</p>
        )
      ) : state.status === 'loading' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <div className="message">
          <p>{t('error')}</p>
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button>
        </div>
      ) : state.status === 'done' && state.results.length === 0 ? (
        <p className={`hint ${state.stale ? 'stale' : ''}`}>{t('noResults')}</p>
      ) : state.status === 'done' ? (
        <div className={state.stale ? 'stale' : ''}>
          <StationList stations={state.results} onOpen={onOpen} />
        </div>
      ) : null}
    </section>
  )
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="list" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="row skeleton">
          <span className="sk sk-badge" />
          <span className="sk sk-text" style={{ width: `${45 + ((i * 17) % 35)}%` }} />
        </li>
      ))}
    </ul>
  )
}
