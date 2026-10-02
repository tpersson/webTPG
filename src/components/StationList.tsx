import type { Station } from '../api'
import { shortName } from '../api'

interface Props {
  stations: Station[]
  onOpen: (s: Station) => void
}

export default function StationList({ stations, onOpen }: Props) {
  return (
    <ul className="list">
      {stations.map((s) => {
        const short = shortName(s.name)
        return (
          <li key={s.id}>
            <button className="row station-row" onClick={() => onOpen(s)}>
              <span className="station-text">
                <span className="station-name">{short}</span>
                {short.toLowerCase() !== s.name.toLowerCase() && <span className="station-sub">{s.name.slice(0, s.name.length - short.length).replace(/,\s*$/, '')}</span>}
              </span>
              {s.distance != null && <span className="distance">{formatDistance(s.distance)}</span>}
              <Chevron />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`
}

function Chevron() {
  return (
    <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
