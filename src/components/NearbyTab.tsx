import { useCallback, useEffect, useRef, useState } from 'react'
import { nearbyStations, type Station } from '../api'
import { useI18n, type Key } from '../i18n'
import StationList from './StationList'
import { Skeleton } from './SearchTab'

interface Props {
  onOpen: (s: Station) => void
  active: boolean
}

type State =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'loading' }
  | { status: 'done'; stations: Station[] }
  | { status: 'error'; message: Key }

export default function NearbyTab({ onOpen, active }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ status: 'idle' })
  const ctrl = useRef<AbortController | null>(null)
  const autoTried = useRef(false)

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'locationUnsupported' })
      return
    }
    ctrl.current?.abort()
    setState({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = new AbortController()
        ctrl.current = c
        setState({ status: 'loading' })
        nearbyStations(pos.coords.latitude, pos.coords.longitude, c.signal)
          .then((stations) => setState({ status: 'done', stations }))
          .catch(() => {
            if (!c.signal.aborted) setState({ status: 'error', message: 'error' })
          })
      },
      (err) => {
        setState({
          status: 'error',
          message: err.code === err.PERMISSION_DENIED ? 'locationDenied' : 'locationUnavailable',
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  // The first time the tab is shown, locate straight away if the user has
  // already granted permission; otherwise wait for them to tap the button.
  useEffect(() => {
    if (!active || autoTried.current) return
    autoTried.current = true
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') locate()
      })
      .catch(() => {})
  }, [active, locate])

  useEffect(() => () => ctrl.current?.abort(), [])

  const busy = state.status === 'locating' || state.status === 'loading'

  return (
    <section>
      {state.status === 'idle' ? (
        <div className="message hero">
          <div className="hero-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </div>
          <p>{t('nearbyHint')}</p>
          <button className="btn primary" onClick={locate}>{t('locate')}</button>
        </div>
      ) : (
        <>
          <div className="section-head">
            <span>{busy ? (state.status === 'locating' ? t('locating') : t('loading')) : t('tabNearby')}</span>
            <button className="link-btn" onClick={locate} disabled={busy}>
              <RefreshIcon spinning={busy} /> {t('refresh')}
            </button>
          </div>
          {busy ? (
            <Skeleton rows={6} />
          ) : state.status === 'error' ? (
            <div className="message">
              <p>{t(state.message)}</p>
              <button className="btn" onClick={locate}>{t('retry')}</button>
            </div>
          ) : state.status === 'done' && state.stations.length === 0 ? (
            <p className="hint">{t('noNearby')}</p>
          ) : state.status === 'done' ? (
            <StationList stations={state.stations} onOpen={onOpen} />
          ) : null}
        </>
      )}
    </section>
  )
}

export function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg className={spinning ? 'spin' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}
