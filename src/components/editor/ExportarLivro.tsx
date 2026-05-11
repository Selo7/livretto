'use client'

import { useState } from 'react'
import { useEditorStore } from '@/lib/store/editorStore'
import { getFontById } from '@/lib/fonts'
import { BookFormat, Chapter } from '@/types/book'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileDown, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mesmas constantes do PagePreview (scale=1)
const FORMAT_DIMS: Record<BookFormat, { w: number; h: number; wCm: string; hCm: string }> = {
  '14x21':  { w: 530,  h: 794,  wCm: '14cm',   hCm: '21cm' },
  '15x23':  { w: 567,  h: 870,  wCm: '15cm',   hCm: '23cm' },
  'a5':     { w: 559,  h: 794,  wCm: '14.8cm', hCm: '21cm' },
  'pocket': { w: 416,  h: 680,  wCm: '11cm',   hCm: '18cm' },
  'abnt':   { w: 756,  h: 1071, wCm: '21cm',   hCm: '29.7cm' },
}
const FORMAT_MARGINS: Record<BookFormat, { top: number; right: number; bottom: number; left: number }> = {
  '14x21':  { top: 96, right: 70, bottom: 60, left: 96 },
  '15x23':  { top: 96, right: 70, bottom: 60, left: 96 },
  'a5':     { top: 96, right: 70, bottom: 60, left: 96 },
  'pocket': { top: 80, right: 56, bottom: 48, left: 80 },
  'abnt':   { top: 132, right: 76, bottom: 60, left: 113 },
}
// px → cm (96 dpi)
const px2cm = (px: number) => `${(px / 37.795).toFixed(3)}cm`

function getChapterNum(chapters: Chapter[], idx: number): number {
  let n = 0
  for (let i = 0; i <= idx; i++) if (chapters[i].numbered !== false) n++
  return n
}

// ---------------------------------------------------------------------------
// Intercapa como HTML puro (inserida como página de tamanho fixo)
// ---------------------------------------------------------------------------
function intercapaPageHtml(chapter: Chapter, chNum: number, fontCss: string, wCm: string, hCm: string): string {
  const style = chapter.opening_style
  if (!style || style === 'nenhum') return ''
  const numLabel = chapter.chapter_num?.trim()
    ? `CAPÍTULO ${chapter.chapter_num.trim()}`
    : chapter.numbered !== false ? `CAPÍTULO ${chNum}` : ''
  const dark = style === 'pagina-inteira'
  const bg = dark ? '#1a1a1a' : '#faf8f0'
  const base = `width:${wCm};height:${hCm};box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;font-family:${fontCss};background:${bg};break-after:page`

  if (style === 'simples') return `<div style="${base}">
  <div style="width:50px;height:1px;background:#c8b89a;margin-bottom:12px"></div>
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:#999;text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:16pt;color:#1a1a1a;line-height:1.3;margin:0">${chapter.title}</p>
  <div style="width:50px;height:1px;background:#c8b89a;margin-top:12px"></div>
</div>`

  if (style === 'epigrafe') return `<div style="${base}">
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:#999;text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:16pt;color:#1a1a1a;margin:0 0 24px">${chapter.title}</p>
  ${chapter.opening_epigraph ? `<div style="border-left:2px solid #c8b89a;padding-left:12px;text-align:left;max-width:280px">
    <p style="font-size:9pt;color:#555;font-style:italic;line-height:1.6;margin:0 0 4px">&ldquo;${chapter.opening_epigraph}&rdquo;</p>
    ${chapter.opening_epigraph_author ? `<p style="font-size:8pt;color:#888;text-align:right;margin:0">— ${chapter.opening_epigraph_author}</p>` : ''}
  </div>` : ''}
</div>`

  return `<div style="${base}">
  ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:${dark ? '#888' : '#999'};text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
  <p style="font-size:18pt;color:${dark ? '#f0ece0' : '#1a1a1a'};line-height:1.3;margin:0">${chapter.title}</p>
</div>`
}

// ---------------------------------------------------------------------------
// Paginator para export — mesma lógica do PagePreview, scale=1
// ---------------------------------------------------------------------------
async function paginarParaExport(
  chapters: Chapter[],
  format: BookFormat,
  fontCss: string,
): Promise<Array<{ html: string; kind: 'content' | 'intercapa'; chapterIdx: number }>> {
  const dims    = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const larguraUtil = dims.w - margins.left - margins.right
  const alturaUtil  = dims.h - margins.top  - margins.bottom
  const SAFETY     = 38
  const pageLimit  = alturaUtil - SAFETY

  await document.fonts.ready

  // Medidor oculto com a mesma classe CSS das páginas reais
  const medidor = document.createElement('div')
  medidor.className = 'book-page-content'
  Object.assign(medidor.style, {
    position: 'fixed', left: '-9999px', top: '0',
    width: `${larguraUtil}px`,
    fontSize: '11px', lineHeight: '1.8', fontFamily: fontCss,
    visibility: 'hidden',
  })
  document.body.appendChild(medidor)

  const pages: Array<{ html: string; kind: 'content' | 'intercapa'; chapterIdx: number }> = []

  for (let ci = 0; ci < chapters.length; ci++) {
    const chapter = chapters[ci]

    // Intercapa como página dedicada
    if (chapter.opening_style && chapter.opening_style !== 'nenhum') {
      const chNum = getChapterNum(chapters, ci)
      pages.push({ kind: 'intercapa', chapterIdx: ci,
        html: intercapaPageHtml(chapter, chNum, fontCss, dims.wCm, dims.hCm) })
    }

    // Paginar conteúdo do capítulo
    const tmp = document.createElement('div')
    tmp.innerHTML = chapter.content_html || ''
    const nodes = Array.from(tmp.children) as HTMLElement[]
    medidor.innerHTML = ''

    let htmlAtual = ''
    let lastElHtml = ''
    let lastElTag = ''

    const fecharPagina = (html: string) => {
      if (html.trim()) pages.push({ kind: 'content', chapterIdx: ci, html })
    }

    for (const el of nodes) {
      if (el.tagName === 'HR') {
        fecharPagina(htmlAtual); htmlAtual = ''; medidor.innerHTML = ''; lastElHtml = ''; lastElTag = ''
        continue
      }

      const clone = el.cloneNode(true) as HTMLElement
      medidor.appendChild(clone)

      if (medidor.scrollHeight > pageLimit && htmlAtual) {
        medidor.removeChild(clone)
        const isShortPage = medidor.scrollHeight < 11 * 1.8 * 4

        if (/^H[1-3]$/.test(lastElTag) && htmlAtual.length > lastElHtml.length) {
          fecharPagina(htmlAtual.slice(0, -lastElHtml.length))
          htmlAtual = lastElHtml + el.outerHTML
        } else if (/^H[1-3]$/.test(lastElTag) || isShortPage) {
          htmlAtual += el.outerHTML
          fecharPagina(htmlAtual); htmlAtual = ''
        } else {
          fecharPagina(htmlAtual); htmlAtual = el.outerHTML
        }
        medidor.innerHTML = htmlAtual
        lastElHtml = el.outerHTML; lastElTag = el.tagName
      } else {
        htmlAtual += el.outerHTML; lastElHtml = el.outerHTML; lastElTag = el.tagName
      }
    }
    fecharPagina(htmlAtual)
    medidor.innerHTML = ''
  }

  document.body.removeChild(medidor)
  return pages
}

// ---------------------------------------------------------------------------
// Monta o HTML completo para impressão com páginas de tamanho fixo
// ---------------------------------------------------------------------------
function buildPrintHtml(
  pages: Array<{ html: string; kind: 'content' | 'intercapa'; chapterIdx: number }>,
  bookTitle: string,
  format: BookFormat,
  fontId: string | undefined,
  customFonts: { name: string; dataUrl: string }[],
  isPublished: boolean,
  coverUrl?: string,
  backCoverUrl?: string,
): string {
  const dims    = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const font    = getFontById(fontId)

  const mTop  = px2cm(margins.top)
  const mRight= px2cm(margins.right)
  const mBott = px2cm(margins.bottom)
  const mLeft = px2cm(margins.left)

  const googleImport = font.google
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&display=swap">`
    : ''
  const customFontFaces = customFonts
    .map(f => `@font-face{font-family:'${f.name}';src:url('${f.dataUrl}')}`)
    .join('\n')
  const watermarkCss = !isPublished
    ? `body::before{content:'RASCUNHO';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80pt;font-weight:900;color:rgba(0,0,0,0.04);white-space:nowrap;pointer-events:none;z-index:0}`
    : ''

  const coverHtml = coverUrl
    ? `<div style="page:cover-page;break-after:page;width:${dims.wCm};height:${dims.hCm};overflow:hidden;background:#000"><img src="${coverUrl}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/></div>`
    : ''
  const backCoverHtml = backCoverUrl
    ? `<div style="page:cover-page;break-after:page;width:${dims.wCm};height:${dims.hCm};overflow:hidden;background:#000"><img src="${backCoverUrl}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/></div>`
    : ''

  const pagesHtml = pages.map(p => {
    if (p.kind === 'intercapa') return p.html   // já tem break-after:page
    return `<div class="page">${p.html}</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${bookTitle}</title>
${googleImport}
<style>
${customFontFaces}
@page{size:${dims.wCm} ${dims.hCm};margin:0}
@page cover-page{size:${dims.wCm} ${dims.hCm};margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:${font.css};font-size:11pt;line-height:1.8;color:#1a1a1a}
.page{
  width:${dims.wCm};height:${dims.hCm};
  padding:${mTop} ${mRight} ${mBott} ${mLeft};
  break-after:page;overflow:hidden;position:relative;
}
.page p{margin-bottom:.45em;text-indent:1.5em}
.page p:first-child,.page h1+p,.page h2+p,.page h3+p{text-indent:0}
.page h1{font-size:18pt;font-weight:700;padding-top:1em;padding-bottom:.5em;text-indent:0}
.page h2{font-size:14pt;font-weight:600;padding-top:1.2em;padding-bottom:.4em;text-indent:0}
.page h3{font-size:12pt;font-weight:600;padding-top:.8em;padding-bottom:.3em;text-indent:0}
.page :is(h1,h2,h3):first-child{padding-top:.3em}
.page blockquote{margin:.7em 1.2em;padding-left:.75em;border-left:2px solid #c8b89a;font-style:italic;color:#555}
.page ul,.page ol{margin:.5em 0 .5em 1.5em}
.page strong{font-weight:700}
.page em{font-style:italic}
${watermarkCss}
</style>
</head>
<body>
${coverHtml}${pagesHtml}${backCoverHtml}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),400))</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Geração de EPUB
// ---------------------------------------------------------------------------
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
p{margin:0 0 .4em;text-indent:1.5em}h1+p,h2+p,h3+p,p:first-child{text-indent:0}
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

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
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
      const font = getFontById(activeBook!.body_font)
      const pages = await paginarParaExport(chapters, activeBook!.format, font.css)
      const html = buildPrintHtml(
        pages,
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
        chapters, activeBook!.title, activeBook!.author,
        activeBook!.id, font.css, isPublished,
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
              {loading === 'pdf' ? 'Paginando...' : 'Exportar PDF'}
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
