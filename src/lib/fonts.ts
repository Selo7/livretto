export interface BookFont {
  id: string        // valor persistido em book.body_font
  name: string      // nome exibido na UI
  css: string       // CSS font-family value
  google?: string   // query param do Google Fonts CSS2 API (se aplicável)
}

export interface CustomFont {
  name: string
  dataUrl: string   // arquivo encoded em base64 (data:font/...)
}

export const BOOK_FONTS: BookFont[] = [
  {
    id: 'Georgia',
    name: 'Georgia',
    css: 'Georgia, serif',
  },
  {
    id: 'Times New Roman',
    name: 'Times New Roman',
    css: '"Times New Roman", Times, serif',
  },
  {
    id: 'EB Garamond',
    name: 'Garamond',
    css: '"EB Garamond", serif',
    google: 'EB+Garamond:ital,wght@0,400;0,700;1,400',
  },
  {
    id: 'Libre Baskerville',
    name: 'Baskerville',
    css: '"Libre Baskerville", serif',
    google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  },
  {
    id: 'Libre Caslon Text',
    name: 'Caslon',
    css: '"Libre Caslon Text", serif',
    google: 'Libre+Caslon+Text:ital,wght@0,400;0,700;1,400',
  },
]

export function getFontById(id?: string): BookFont {
  return BOOK_FONTS.find((f) => f.id === id) ?? BOOK_FONTS[0]
}

/** Injeta <link> do Google Fonts no <head> se ainda não estiver lá. */
export function loadGoogleFont(fontId: string): void {
  if (typeof window === 'undefined') return
  const font = BOOK_FONTS.find((f) => f.id === fontId)
  if (!font?.google) return
  const linkId = `gfont-${fontId.replace(/\s+/g, '-')}`
  if (document.getElementById(linkId)) return
  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
  document.head.appendChild(link)
}

/** Carrega todas as Google Fonts predefinidas de uma só vez. */
export function loadAllBookFonts(): void {
  BOOK_FONTS.forEach((f) => { if (f.google) loadGoogleFont(f.id) })
}

/** Registra uma fonte customizada via FontFace API e a torna disponível. */
export async function registerCustomFont(name: string, dataUrl: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const face = new FontFace(name, `url(${dataUrl})`)
    await face.load()
    document.fonts.add(face)
  } catch {
    // arquivo inválido ou formato não suportado
  }
}
