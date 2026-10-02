// Thin client for https://transport.opendata.ch (Swiss public transport API).
// Docs: https://transport.opendata.ch/docs.html
// Note: in this API, coordinate.x is latitude and coordinate.y is longitude.

const BASE = 'https://transport.opendata.ch/v1'

export interface Station {
  id: string
  name: string
  lat?: number
  lon?: number
  /** Distance in metres, only set for coordinate searches. */
  distance?: number
}

export type Kind = 'tram' | 'bus'

export interface Departure {
  key: string
  line: string
  kind: Kind
  destination: string
  /** Expected departure (realtime if available), epoch ms. */
  time: number
  /** Delay in minutes, 0 if on time or unknown. */
  delay: number
}

interface RawStation {
  id: string | null
  name: string | null
  coordinate?: { x: number | null; y: number | null } | null
  distance?: number | null
}

interface RawJourney {
  name?: string | null
  category?: string | null
  number?: string | null
  to?: string | null
  stop: {
    departure?: string | null
    departureTimestamp?: number | null
    delay?: number | null
    prognosis?: { departure?: string | null } | null
  }
}

// Rough bounding box of the canton of Geneva (plus a small margin).
const GENEVA = { minLat: 46.11, maxLat: 46.38, minLon: 5.93, maxLon: 6.33 }

export function inGeneva(s: Station): boolean {
  if (s.lat == null || s.lon == null) return false
  return (
    s.lat >= GENEVA.minLat && s.lat <= GENEVA.maxLat &&
    s.lon >= GENEVA.minLon && s.lon <= GENEVA.maxLon
  )
}

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(BASE + path, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function toStation(r: RawStation): Station | null {
  if (!r.id || !r.name) return null
  return {
    id: r.id,
    name: r.name,
    lat: r.coordinate?.x ?? undefined,
    lon: r.coordinate?.y ?? undefined,
    distance: r.distance ?? undefined,
  }
}

function dedupe(list: Station[]): Station[] {
  const seen = new Set<string>()
  return list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
}

/** Search stations by name, keeping only stops inside the Geneva area. */
export async function searchStations(query: string, signal?: AbortSignal): Promise<Station[]> {
  const q = query.trim()
  // The API caps results, so a bare query like "Bel-Air" can be crowded out by
  // stops elsewhere in Switzerland. Also ask for "Genève <query>" and merge.
  const queries = /^gen[eè]v/i.test(q) ? [q] : [q, `Genève ${q}`]
  const settled = await Promise.allSettled(
    queries.map((text) =>
      getJSON<{ stations?: RawStation[] }>(
        `/locations?type=station&query=${encodeURIComponent(text)}`,
        signal,
      ),
    ),
  )
  const ok = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value.stations ?? []] : []))
  if (ok.length === 0) throw (settled[0] as PromiseRejectedResult).reason
  const all = dedupe(ok.flat().map(toStation).filter((s): s is Station => !!s))
  const lower = q.toLowerCase()
  return all
    .filter(inGeneva)
    .sort((a, b) => rank(a.name, lower) - rank(b.name, lower))
}

// Prefer names whose stop part starts with the query, then ones containing it.
function rank(name: string, q: string): number {
  const n = shortName(name).toLowerCase()
  if (n.startsWith(q)) return 0
  if (n.includes(q)) return 1
  return 2
}

/** Stations closest to a coordinate, sorted by distance. */
export async function nearbyStations(lat: number, lon: number, signal?: AbortSignal): Promise<Station[]> {
  const data = await getJSON<{ stations?: RawStation[] }>(
    `/locations?type=station&x=${lat}&y=${lon}`,
    signal,
  )
  const list = dedupe((data.stations ?? []).map(toStation).filter((s): s is Station => !!s))
  for (const s of list) {
    if (s.distance == null && s.lat != null && s.lon != null) {
      s.distance = haversine(lat, lon, s.lat, s.lon)
    }
  }
  return list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
}

function classify(j: RawJourney): Kind | null {
  const c = (j.category ?? '').toUpperCase()
  if (c === 'T' || c === 'NFT' || c === 'TRAM' || c.startsWith('TRAM')) return 'tram'
  if (c === 'B' || c === 'NFB' || c === 'BUS' || c === 'EXB' || c === 'KB' || c.startsWith('BUS')) return 'bus'
  return null
}

// The API returns "+0200" style offsets, which Safari's Date parser rejects.
function parseTime(s?: string | null): number | null {
  if (!s) return null
  const t = Date.parse(s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))
  return Number.isNaN(t) ? null : t
}

/** Upcoming tram and bus departures from a station. */
export async function departures(stationId: string, signal?: AbortSignal): Promise<Departure[]> {
  const data = await getJSON<{ stationboard?: RawJourney[] }>(
    `/stationboard?id=${encodeURIComponent(stationId)}&limit=40` +
      `&transportations[]=tram&transportations[]=bus`,
    signal,
  )
  const out: Departure[] = []
  for (const j of data.stationboard ?? []) {
    const kind = classify(j)
    if (!kind) continue
    const delay = j.stop.delay ?? 0
    const scheduled =
      j.stop.departureTimestamp != null
        ? j.stop.departureTimestamp * 1000
        : parseTime(j.stop.departure)
    const expected = parseTime(j.stop.prognosis?.departure) ?? (scheduled != null ? scheduled + delay * 60_000 : null)
    if (expected == null) continue
    const line = (j.number || j.name || '?').trim()
    out.push({
      key: `${line}|${j.to}|${scheduled}`,
      line,
      kind,
      destination: j.to ?? '',
      time: expected,
      delay: Math.max(0, delay),
    })
  }
  return out.sort((a, b) => a.time - b.time)
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** "Genève, Plainpalais" -> "Plainpalais"; other towns keep their prefix. */
export function shortName(name: string): string {
  return name.replace(/^Gen[eè]ve,\s*/i, '')
}
