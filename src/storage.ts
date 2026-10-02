import type { Station } from './api'

const KEY = 'recentStations'
const MAX = 6

export function loadRecent(): Station[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as Station[]) : []
    return Array.isArray(list) ? list.filter((s) => s && s.id && s.name).slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecent(s: Station): void {
  try {
    const list = [{ id: s.id, name: s.name }, ...loadRecent().filter((r) => r.id !== s.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
