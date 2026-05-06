const PALETTES = [
  { bg1: '#1a0f2e', bg2: '#0a0618', title: '#f0e0c8', author: '#b89870', accent: '#7050a8' },
  { bg1: '#0a1a28', bg2: '#050c18', title: '#d8ecf8', author: '#88aec8', accent: '#3878a8' },
  { bg1: '#1c0808', bg2: '#0f0303', title: '#f8dcc8', author: '#c09080', accent: '#a03838' },
  { bg1: '#081c08', bg2: '#040f03', title: '#d0ead0', author: '#78b078', accent: '#286828' },
  { bg1: '#1c1408', bg2: '#0f0a00', title: '#f0eac0', author: '#c8a850', accent: '#906820' },
  { bg1: '#1a0814', bg2: '#0f0508', title: '#f8d0e0', author: '#c08090', accent: '#a82858' },
  { bg1: '#081820', bg2: '#040b10', title: '#c8e8ec', author: '#70a8b0', accent: '#187888' },
  { bg1: '#181808', bg2: '#0c0c04', title: '#e8e8c0', author: '#a8a860', accent: '#606820' },
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 4)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateCoverSvg(title: string, author: string): string {
  const p = PALETTES[hashStr(title || ' ') % PALETTES.length]
  const titleLines = wrapText(title || 'Sem título', 13)
  const fs = titleLines.length === 1 ? 22 : titleLines.length === 2 ? 19 : 15
  const lh = fs * 1.3
  const blockH = titleLines.length * lh
  const cy = 150 - blockH / 2 + fs
  const authorLines = wrapText(author || '', 24).slice(0, 2)
  const divY = cy + (titleLines.length - 1) * lh + 18
  const authorY = divY + 15

  const titleSvg = titleLines
    .map(
      (l, i) =>
        `<text x="100" y="${cy + i * lh}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${fs}" font-weight="bold" fill="${p.title}">${esc(l)}</text>`
    )
    .join('')

  const authorSvg = authorLines
    .map(
      (l, i) =>
        `<text x="100" y="${authorY + i * 13}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="10" fill="${p.author}">${esc(l)}</text>`
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><defs><linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/></linearGradient></defs><rect width="200" height="300" fill="url(#bg)"/><rect x="14" y="18" width="172" height="0.8" fill="${p.accent}" opacity="0.65"/><rect x="14" y="21.5" width="88" height="0.5" fill="${p.accent}" opacity="0.28"/><rect x="14" y="275" width="172" height="0.8" fill="${p.accent}" opacity="0.45"/><rect x="112" y="278" width="74" height="0.5" fill="${p.accent}" opacity="0.2"/>${titleSvg}<line x1="88" y1="${divY}" x2="112" y2="${divY}" stroke="${p.accent}" stroke-width="0.8" opacity="0.85"/>${authorSvg}</svg>`
}

export function coverToDataUri(title: string, author: string): string {
  return `data:image/svg+xml,${encodeURIComponent(generateCoverSvg(title, author))}`
}
