'use client'

import { useState } from 'react'
import { useEditorStore } from '@/lib/store/editorStore'
import { getFontById } from '@/lib/fonts'
import { BookFormat, Chapter } from '@/types/book'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileDown, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dimensões de página e margens em cm (base: 96 dpi, 1px = 0.02646cm)
const FORMAT: Record<BookFormat, { size: string; margin: string; contentH: string }> = {
  '14x21':  { size: '14cm 21cm',    margin: '2.54cm 1.85cm 1.59cm 2.54cm', contentH: '16.87cm' },
  '15x23':  { size: '15cm 23cm',    margin: '2.54cm 1.85cm 1.59cm 2.54cm', contentH: '18.87cm' },
  'a5':     { size: '14.8cm 21cm',  margin: '2.54cm 1.85cm 1.59cm 2.54cm', contentH: '16.87cm' },
  'pocket': { size: '11cm 18cm',    margin: '2.12cm 1.48cm 1.27cm 2.12cm', contentH: '14.61cm' },
  'abnt':   { size: '21cm 29.7cm',  margin: '3.49cm 2.01cm 1.59cm 2.99cm', contentH: '24.62cm' },
}

function getChapterNum(chapters: Chapter[], idx: number): number {
  let n = 0
  for (let i = 0; i <= idx; i++) {
    if (chapters[i].numbered !== false) n++
  }
  return n
}

function intercapaHtml(chapter: Chapter, num: number, fontCss: string, contentH: string): string {
  const style = chapter.opening_style
  if (!style || style === 'nenhum') return ''

  const numLabel = chapter.chapter_num?.trim()
    ? `CAPÍTULO ${chapter.chapter_num.trim()}`
    : chapter.numbered !== false ? `CAPÍTULO ${num}` : ''

  const base = `min-height:${contentH};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;font-family:${fontCss};break-after:page`

  if (style === 'simples') {
    return `<div style="${base};background:#faf8f0">
  <div style="width:50px;height:1px;background:#c8b89a;margin-bottom:12px"></div>
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:#999;text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:16pt;color:#1a1a1a;line-height:1.3;margin:0">${chapter.title}</p>
  <div style="width:50px;height:1px;background:#c8b89a;margin-top:12px"></div>
</div>`
  }

  if (style === 'epigrafe') {
    return `<div style="${base};background:#faf8f0">
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:#999;text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:16pt;color:#1a1a1a;margin:0 0 24px">${chapter.title}</p>
  ${chapter.opening_epigraph ? `<div style="border-left:2px solid #c8b89a;padding-left:12px;text-align:left;max-width:280px">
    <p style="font-size:9pt;color:#555;font-style:italic;line-height:1.6;margin:0 0 4px">&ldquo;${chapter.opening_epigraph}&rdquo;</p>
    ${chapter.opening_epigraph_author ? `<p style="font-size:8pt;color:#888;text-align:right;margin:0">— ${chapter.opening_epigraph_author}</p>` : ''}
  </div>` : ''}
</div>`
  }

  // ilustrado / pagina-inteira — fallback sem imagem
  const dark = style === 'pagina-inteira'
  return `<div style="${base};background:${dark ? '#1a1a1a' : '#faf8f0'}">
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:${dark ? '#888' : '#999'};text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:18pt;color:${dark ? '#f0ece0' : '#1a1a1a'};line-height:1.3;margin:0">${chapter.title}</p>
</div>`
}

function coverPageHtml(src: string, w: string, h: string): string {
  return `<div class="cover-page" style="width:${w};height:${h}">
  <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/>
</div>`
}

function buildPdfHtml(
  chapters: Chapter[],
  bookTitle: string,
  format: BookFormat,
  fontId: string | undefined,
  customFonts: { name: string; dataUrl: string }[],
  isPublished: boolean,
  coverUrl?: string,
  backCoverUrl?: string,
): string {
  const fmt = FORMAT[format] ?? FORMAT['14x21']
  const font = getFontById(fontId)

  const googleImport = font.google
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&display=swap">`
    : ''

  const customFontFaces = customFonts
    .map(f => `@font-face{font-family:'${f.name}';src:url('${f.dataUrl}')}`)
    .join('\n')

  const watermarkCss = !isPublished
    ? `body::before{content:'RASCUNHO';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80pt;font-weight:900;color:rgba(0,0,0,0.04);white-space:nowrap;pointer-events:none;z-index:0}`
    : ''

  const chaptersHtml = chapters.map((ch, i) => {
    const chNum = getChapterNum(chapters, i)
    const intercapa = intercapaHtml(ch, chNum, font.css, fmt.contentH)
    const content = ch.content_html || ''
    const firstPage = i === 0 && !intercapa && !coverUrl

    return `${intercapa}<div class="chapter-content${firstPage ? '' : ' pb'}">${content}</div>`
  }).join('\n')

  const [pgW, pgH] = fmt.size.split(' ')
  const capa = coverUrl ? coverPageHtml(coverUrl, pgW, pgH) : ''
  const contracapa = backCoverUrl ? coverPageHtml(backCoverUrl, pgW, pgH) : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${bookTitle}</title>
${googleImport}
<style>
${customFontFaces}
@page{size:${fmt.size};margin:${fmt.margin}}
@page cover-page{size:${fmt.size};margin:0}
*{box-sizing:border-box}
body{margin:0;padding:0;font-family:${font.css};font-size:11pt;line-height:1.8;color:#1a1a1a;background:#fff}
.cover-page{page:cover-page;break-after:page;overflow:hidden;background:#000}
.pb{break-before:page}
.chapter-content p{margin:0 0 .4em;text-indent:1.5em}
.chapter-content p:first-child,.chapter-content h1+p,.chapter-content h2+p,.chapter-content h3+p{text-indent:0}
.chapter-content h1{font-size:18pt;font-weight:700;margin:.8em 0 .5em;text-indent:0}
.chapter-content h2{font-size:14pt;font-weight:600;margin:.7em 0 .4em;text-indent:0}
.chapter-content h3{font-size:12pt;font-weight:600;margin:.6em 0 .3em;text-indent:0}
.chapter-content blockquote{margin:.7em 1.5em;border-left:2px solid #c8b89a;padding-left:.75em;font-style:italic}
.chapter-content ul,.chapter-content ol{margin:.5em 0 .5em 1.5em}
.chapter-content hr{break-after:page;border:none;margin:0}
${watermarkCss}
</style>
</head>
<body>
${capa}${chaptersHtml}${contracapa}
<script>window.addEventListener('load',()=>window.print())</script>
</body>
</html>`
}

async function buildEpub(
  chapters: Chapter[],
  bookTitle: string,
  author: string,
  bookId: string,
  fontCss: string,
  isPublished: boolean,
): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.folder('META-INF')!.file('container.xml',
    `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)

  const oebps = zip.folder('OEBPS')!

  oebps.file('style.css', `body{font-family:${fontCss};font-size:1em;line-height:1.8;color:#1a1a1a;margin:1em 1.5em}
p{margin:0 0 .4em;text-indent:1.5em}
h1+p,h2+p,h3+p,p:first-child{text-indent:0}
h1{font-size:1.5em;font-weight:700;margin:.8em 0 .5em}
h2{font-size:1.25em;font-weight:600;margin:.7em 0 .4em}
h3{font-size:1.1em;font-weight:600;margin:.6em 0 .3em}
blockquote{margin:.7em 1.5em;border-left:2px solid #c8b89a;padding-left:.75em;font-style:italic}
.draft-banner{background:#fff3cd;padding:.5em;margin-bottom:2em;font-weight:700;text-align:center;border:1px solid #ffc107}`)

  const manifest: string[] = []
  const spine: string[] = []

  chapters.forEach((ch, i) => {
    const id = `ch${String(i + 1).padStart(2, '0')}`
    const file = `${id}.xhtml`
    const clean = (ch.content_html || '').replace(/<hr[^>]*>/gi, '')
    const banner = !isPublished && i === 0
      ? `<p class="draft-banner">⚠ RASCUNHO — versão em edição, não publicada</p>`
      : ''

    oebps.file(file, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR"><head><meta charset="utf-8"/><title>${ch.title}</title><link rel="stylesheet" href="style.css"/></head><body>${banner}<h1>${ch.title}</h1>${clean}</body></html>`)

    manifest.push(`<item id="${id}" href="${file}" media-type="application/xhtml+xml"/>`)
    spine.push(`<itemref idref="${id}"/>`)
  })

  const navItems = chapters.map((ch, i) =>
    `<li><a href="ch${String(i + 1).padStart(2, '0')}.xhtml">${ch.title}</a></li>`).join('')

  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR"><head><meta charset="utf-8"/><title>Índice</title></head><body><nav epub:type="toc"><ol>${navItems}</ol></nav></body></html>`)

  const now = new Date().toISOString().slice(0, 19) + 'Z'
  oebps.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?><package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:${bookId}</dc:identifier><dc:title>${bookTitle}</dc:title><dc:creator>${author}</dc:creator><dc:language>pt-BR</dc:language><meta property="dcterms:modified">${now}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`)

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}

export function ExportarLivro() {
  const { activeBook, chapters } = useEditorStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState<'pdf' | 'epub' | null>(null)

  if (!activeBook) return null

  const isPublished = activeBook.status === 'publicado'

  async function handlePdf() {
    setMenuOpen(false)
    setLoading('pdf')
    try {
      const html = buildPdfHtml(
        chapters,
        activeBook!.title,
        activeBook!.format,
        activeBook!.body_font,
        activeBook!.custom_fonts ?? [],
        isPublished,
        activeBook!.cover_url,
        activeBook!.back_cover_url,
      )
      const win = window.open('', '_blank')
      if (!win) { alert('Permita pop-ups para exportar o PDF.'); return }
      win.document.write(html)
      win.document.close()
    } finally {
      setLoading(null)
    }
  }

  async function handleEpub() {
    setMenuOpen(false)
    setLoading('epub')
    try {
      const font = getFontById(activeBook!.body_font)
      const blob = await buildEpub(
        chapters,
        activeBook!.title,
        activeBook!.author,
        activeBook!.id,
        font.css,
        isPublished,
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeBook!.title.replace(/[^a-z0-9çãõáéíóúâêîôûàüñ]/gi, '-')}.epub`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs font-medium"
        onClick={() => setMenuOpen(v => !v)}
      >
        <Download size={13} />
        Exportar
        <ChevronDown size={11} className={cn('transition-transform', menuOpen && 'rotate-180')} />
      </Button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-background border border-border rounded-xl shadow-xl py-1 w-52 overflow-hidden">
            {!isPublished && (
              <p className="px-3 py-1.5 text-[10px] text-amber-600 dark:text-amber-400 border-b border-border">
                Livro não finalizado — exporta com marca d&apos;água
              </p>
            )}
            <button
              onClick={handlePdf}
              disabled={!!loading}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors w-full text-left disabled:opacity-50"
            >
              <FileText size={14} className="text-muted-foreground shrink-0" />
              {loading === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
            </button>
            <button
              onClick={handleEpub}
              disabled={!!loading}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors w-full text-left disabled:opacity-50"
            >
              <FileDown size={14} className="text-muted-foreground shrink-0" />
              {loading === 'epub' ? 'Gerando...' : 'Exportar EPUB'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
