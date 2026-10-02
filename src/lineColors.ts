import colors from './lineColors.json'

// Official TPG line colours (regenerate with `npm run colors`).
const table: Record<string, { bg: string; fg: string }> = colors

/** Badge colours for a line, or undefined to fall back to the tram/bus style. */
export function lineColor(line: string): { background: string; color: string } | undefined {
  const c = table[line.trim().toUpperCase()]
  return c && { background: c.bg, color: c.fg }
}
