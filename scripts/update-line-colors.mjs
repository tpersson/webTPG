// Regenerates src/lineColors.json from the official TPG line list.
// Source: https://www.tpg.ch/fr/lignes embeds `lignes={...}` with each line's
// badge colour and a "blanc"/"noir" class for the text colour.
// Usage: node scripts/update-line-colors.mjs
import { writeFileSync } from 'node:fs'

const SOURCE = 'https://www.tpg.ch/fr/lignes'
const html = await (await fetch(SOURCE)).text()
const start = html.indexOf('lignes={')
if (start < 0) throw new Error('Could not find `lignes={` on ' + SOURCE)

// Walk to the matching closing brace (no braces appear inside the strings).
const i = start + 'lignes='.length
let depth = 0
let end = i
for (; end < html.length; end++) {
  if (html[end] === '{') depth++
  else if (html[end] === '}' && --depth === 0) break
}
const lignes = JSON.parse(html.slice(i, end + 1))

const out = {}
for (const [line, info] of Object.entries(lignes)) {
  const color = info?.couleur?.color
  if (!color) continue
  const classes = (info.couleur.classes ?? '').split(/\s+/)
  out[line.toUpperCase()] = {
    bg: color.toUpperCase(),
    fg: classes.includes('noir') ? '#000000' : '#FFFFFF',
  }
}

const sorted = Object.fromEntries(
  Object.entries(out).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })),
)
writeFileSync(new URL('../src/lineColors.json', import.meta.url), JSON.stringify(sorted, null, 2) + '\n')
console.log(`Wrote ${Object.keys(sorted).length} line colours`)
