import { useCallback, useEffect, useRef, useState } from 'react'
import { departures, shortName, type Departure, type Station } from '../api'
import { useI18n } from '../i18n'
import { Skeleton } from './SearchTab'
import { RefreshIcon } from './NearbyTab'

const REFRESH_MS = 30_000

interface Props {
  station: Station
  onBack: () => void
}

export default function StationBoard({ station, onBack }: Props) {
  const { t, lang } = useI18n()
  const [list, setList] = useState<Departure[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const ctrl = useRef<AbortController | null>(null)

  const load = useCallback(() => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setLoading(true)
    departures(station.id, c.signal)
      .then((d) => {
        setList(d)
        setError(false)
        setUpdated(Date.now())
        setNow(Date.now())
      })
      .catch(() => {
        if (!c.signal.aborted) setError(true)
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
  }, [station.id])

  // Fetch on open, then every 30 s while the page is visible.
  useEffect(() => {
    setList(null)
    setError(false)
    load()
    let timer = window.setInterval(load, REFRESH_MS)
    const onVis = () => {
      window.clearInterval(timer)
      if (document.visibilityState === 'visible') {
        load()
        timer = window.setInterval(load, REFRESH_MS)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
      ctrl.current?.abort()
    }
  }, [load])

  // Tick the countdowns between fetches.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(id)
  }, [])

  const clock = (ms: number) =>
    new Date(ms).toLocaleTimeString(lang === 'fr' ? 'fr-CH' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

  // Hide departures that left more than a minute ago.
  const upcoming = list?.filter((d) => d.time - now > -60_000) ?? null
  const short = shortName(station.name)

  return (
    <section className="board">
      <div className="board-head">
        <button className="back" onClick={onBack} aria-label={t('back')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <div className="board-title">
          <h1>{short}</h1>
          {short.toLowerCase() !== station.name.toLowerCase() && <p>{station.name.slice(0, station.name.length - short.length).replace(/,\s*$/, '')}</p>}
        </div>
        <button className="icon-btn refresh" onClick={load} disabled={loading} aria-label={t('refresh')}>
          <RefreshIcon spinning={loading} />
        </button>
      </div>

      {upcoming == null ? (
        error ? (
          <div className="message">
            <p>{t('error')}</p>
            <button className="btn" onClick={load}>{t('retry')}</button>
          </div>
        ) : (
          <Skeleton rows={7} />
        )
      ) : upcoming.length === 0 ? (
        <p className="hint">{t('noDepartures')}</p>
      ) : (
        <ul className="list departures">
          {upcoming.map((d) => {
            const mins = Math.floor((d.time - now) / 60_000)
            return (
              <li key={d.key} className="row dep">
                <span className={`badge ${d.kind}`} title={t(d.kind)}>
                  {d.line}
                </span>
                <span className="dest">
                  <span className="dest-name">{shortName(d.destination)}</span>
                  <span className="dest-sub">
                    {t(d.kind)} · {clock(d.time)}
                    {d.delay > 0 && <span className="late"> · +{d.delay} {t('min')} {t('late')}</span>}
                  </span>
                </span>
                <span className={`eta ${mins <= 0 ? 'now' : ''}`}>
                  {mins <= 0 ? (
                    t('now')
                  ) : mins < 60 ? (
                    <>
                      {mins}
                      <small> {t('min')}</small>
                    </>
                  ) : (
                    clock(d.time)
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {updated != null && (
        <p className={`updated ${error ? 'stale' : ''}`}>
          {error ? `${t('error')} · ` : ''}
          {t('updated')} {clock(updated)}
        </p>
      )}
    </section>
  )
}
