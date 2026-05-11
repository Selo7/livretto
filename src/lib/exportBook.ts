import { getFontById } from '@/lib/fonts'
import { BookFormat, Chapter } from '@/types/book'

// ---------------------------------------------------------------------------
// Dimensões e margens (px a 96 dpi)
// ---------------------------------------------------------------------------
export const FORMAT_DIMS: Record<BookFormat, { w: number; h: number; wCm: string; hCm: string }> = {
  '14x21':  { w: 530,  h: 794,  wCm: '14cm',   hCm: '21cm' },
  '15x23':  { w: 567,  h: 870,  wCm: '15cm',   hCm: '23cm' },
  'a5':     { w: 559,  h: 794,  wCm: '14.8cm', hCm: '21cm' },
  'pocket': { w: 416,  h: 680,  wCm: '11cm',   hCm: '18cm' },
  'abnt':   { w: 756,  h: 1071, wCm: '21cm',   hCm: '29.7cm' },
}
export const FORMAT_MARGINS: Record<BookFormat, { top: number; right: number; bottom: number; left: number }> = {
  '14x21':  { top: 96, right: 70, bottom: 60, left: 96 },
  '15x23':  { top: 96, right: 70, bottom: 60, left: 96 },
  'a5':     { top: 96, right: 70, bottom: 60, left: 96 },
  'pocket': { top: 80, right: 56, bottom: 48, left: 80 },
  'abnt':   { top: 132, right: 76, bottom: 60, left: 113 },
}

const px2cm = (px: number) => `${(px / 37.795).toFixed(3)}cm`

function findCitations(html: string): number[] {
  return [...new Set([...html.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1])))]
}

function getChapterNum(chapters: Chapter[], idx: number): number {
  let n = 0
  for (let i = 0; i <= idx; i++) if (chapters[i].numbered !== false) n++
  return n
}

// ---------------------------------------------------------------------------
// Intercapa como HTML puro
// ---------------------------------------------------------------------------
function intercapaPageHtml(chapter: Chapter, chNum: number, fontCss: string, wCm: string, hCm: string): string {
  const style = chapter.opening_style
  if (!style || style === 'nenhum') return ''
  const numLabel = chapter.chapter_num?.trim()
    ? `CAPÍTULO ${chapter.chapter_num.trim()}`
    : chapter.numbered !== false ? `CAPÍTULO ${chNum}` : ''
  const dark = style === 'pagina-inteira'
  const bg = dark ? '#1a1a1a' : '#faf8f0'
  const base = `width:${wCm};height:${hCm};box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;font-family:${fontCss};background:${bg};break-after:page;position:relative;overflow:hidden`

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

  if (style === 'ilustrado') {
    const imgSection = chapter.opening_image
      ? `<img src="${chapter.opening_image}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/>`
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#e8e0d0,#d0c4a8);display:flex;align-items:center;justify-content:center"><p style="font-size:8pt;color:#b0a080;font-style:italic;font-family:${fontCss}">Imagem do capítulo</p></div>`
    return `<div style="${base};flex-direction:column;justify-content:flex-start;padding:0">
  <div style="height:55%;overflow:hidden">${imgSection}</div>
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:20px">
    ${numLabel ? `<p style="font-size:8pt;letter-spacing:.12em;color:#999;text-transform:uppercase;margin:0">${numLabel}</p>` : ''}
    <p style="font-size:16pt;color:#1a1a1a;margin:0;font-family:${fontCss}">${chapter.title}</p>
  </div>
</div>`
  }

  // pagina-inteira
  const imgSection = chapter.opening_image
    ? `<img src="${chapter.opening_image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.85" alt=""/>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#3a3530,#1a1510)"></div>`
  return `<div style="${base}">
  ${imgSection}
  <div style="position:absolute;bottom:0;left:0;right:0;padding:20px 30px;background:linear-gradient(to top,rgba(0,0,0,.75),transparent)">
    ${numLabel ? `<p style="font-size:8pt;letter-spacing:.15em;color:rgba(255,255,255,.6);text-transform:uppercase;margin:0 0 4px">${numLabel}</p>` : ''}
    <p style="font-size:18pt;color:#fff;line-height:1.2;margin:0;font-family:${fontCss}">${chapter.title}</p>
  </div>
</div>`
}

// ---------------------------------------------------------------------------
// Tipos da saída do paginador
// ---------------------------------------------------------------------------
export interface ExportPage {
  kind: 'content' | 'intercapa'
  html: string
  chapterIdx: number
  pageNum?: number
  footnotes?: Array<{ num: number; html: string }>
}

// ---------------------------------------------------------------------------
// Paginador para export — mesma lógica do VisualizadorFlip, scale=1
// ---------------------------------------------------------------------------
export async function paginarParaExport(
  chapters: Chapter[],
  format: BookFormat,
  fontCss: string,
): Promise<ExportPage[]> {
  const dims    = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const larguraUtil = dims.w - margins.left - margins.right
  const alturaUtil  = dims.h - margins.top  - margins.bottom
  const SAFETY      = 100
  const pageLimit   = alturaUtil - SAFETY

  // Mapa de notas de rodapé globais
  const footnoteMap = new Map<number, string>()
  for (const c of chapters) {
    for (const f of (c.footnotes ?? [])) footnoteMap.set(f.num, f.content)
  }

  await document.fonts.ready

  const medidor = document.createElement('div')
  medidor.className = 'book-page-content'
  Object.assign(medidor.style, {
    position: 'fixed', left: '-9999px', top: '0',
    width: `${larguraUtil}px`,
    fontSize: '11px', lineHeight: '1.8', fontFamily: fontCss,
    visibility: 'hidden',
  })
  document.body.appendChild(medidor)

  const pages: ExportPage[] = []
  let contentPageNum = 1

  const fecharPagina = (html: string, chapterIdx: number) => {
    if (!html.trim()) return
    const cits = findCitations(html)
    const footnotes = cits
      .filter(n => footnoteMap.has(n))
      .map(n => ({ num: n, html: footnoteMap.get(n)! }))
    pages.push({ kind: 'content', chapterIdx, html, pageNum: contentPageNum++, footnotes })
  }

  for (let ci = 0; ci < chapters.length; ci++) {
    const chapter = chapters[ci]

    if (chapter.opening_style && chapter.opening_style !== 'nenhum') {
      const chNum = getChapterNum(chapters, ci)
      pages.push({ kind: 'intercapa', chapterIdx: ci,
        html: intercapaPageHtml(chapter, chNum, fontCss, dims.wCm, dims.hCm) })
    }

    const tmp = document.createElement('div')
    tmp.innerHTML = chapter.content_html || ''
    const nodes = Array.from(tmp.children) as HTMLElement[]
    medidor.innerHTML = ''

    let htmlAtual = ''
    let lastElHtml = ''
    let lastElTag = ''

    for (const el of nodes) {
      if (el.tagName === 'HR') {
        fecharPagina(htmlAtual, ci); htmlAtual = ''; medidor.innerHTML = ''; lastElHtml = ''; lastElTag = ''
        continue
      }
      const clone = el.cloneNode(true) as HTMLElement
      medidor.appendChild(clone)

      if (medidor.scrollHeight > pageLimit && htmlAtual) {
        medidor.removeChild(clone)
        const isShortPage = medidor.scrollHeight < 11 * 1.8 * 4
        if (/^H[1-3]$/.test(lastElTag) && htmlAtual.length > lastElHtml.length) {
          fecharPagina(htmlAtual.slice(0, -lastElHtml.length), ci)
          htmlAtual = lastElHtml + el.outerHTML
        } else if (/^H[1-3]$/.test(lastElTag) || isShortPage) {
          htmlAtual += el.outerHTML
          fecharPagina(htmlAtual, ci); htmlAtual = ''
        } else {
          fecharPagina(htmlAtual, ci); htmlAtual = el.outerHTML
        }
        medidor.innerHTML = htmlAtual
        lastElHtml = el.outerHTML; lastElTag = el.tagName
      } else {
        htmlAtual += el.outerHTML; lastElHtml = el.outerHTML; lastElTag = el.tagName
      }
    }
    fecharPagina(htmlAtual, ci)
    medidor.innerHTML = ''
  }

  document.body.removeChild(medidor)
  return pages
}

// ---------------------------------------------------------------------------
// PDF de revisão — A4 fluente, com aviso e marca d'água
// ---------------------------------------------------------------------------
export function buildReviewHtml(
  chapters: Chapter[],
  bookTitle: string,
  author: string,
  fontId: string | undefined,
  customFonts: { name: string; dataUrl: string }[],
  coverUrl?: string,
  backCoverUrl?: string,
): string {
  const font = getFontById(fontId)
  const googleImport = font.google
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.google)}&display=swap">`
    : ''
  const customFontFaces = customFonts.map(f => `@font-face{font-family:'${f.name}';src:url('${f.dataUrl}')}`).join('\n')

  const coverHtml = coverUrl
    ? `<div class="cover-page"><img src="${coverUrl}" alt="Capa"/></div>` : ''
  const backCoverHtml = backCoverUrl
    ? `<div class="cover-page"><img src="${backCoverUrl}" alt="Contracapa"/></div>` : ''

  const chaptersHtml = chapters.map((ch, i) => {
    const content = (ch.content_html || '').replace(/<hr[^>]*>/gi, '<div class="page-break-hint">✂ quebra de página</div>')
    return `<div class="chapter${i > 0 ? ' chapter-break' : ''}">
  <h1 class="ch-title">${ch.title || 'Sem título'}</h1>
  ${content}
</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>[REVISÃO] ${bookTitle}</title>${googleImport}
<style>
${customFontFaces}
@page{size:A4;margin:2.5cm 3cm}@page cover{size:A4;margin:0}
*{box-sizing:border-box}
body{font-family:${font.css};font-size:11pt;line-height:1.8;color:#1a1a1a}
.cover-page{page:cover;break-after:page;width:210mm;height:297mm;margin:0;overflow:hidden}
.cover-page img{width:100%;height:100%;object-fit:cover;display:block}
.review-notice{background:#fffbeb;border:1.5px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:2em;font-family:system-ui,sans-serif;font-size:9pt;color:#92400e}
.review-notice strong{font-size:10pt;display:block;margin-bottom:3px}
.book-header{margin-bottom:2.5em;padding-bottom:1em;border-bottom:1px solid #ddd}
.book-header h2{font-size:20pt;font-weight:700;margin:0 0 4px}.book-header p{font-size:10pt;color:#666;margin:0}
.chapter{margin-bottom:2em}.chapter-break{break-before:page}
.ch-title{font-size:16pt;font-weight:700;margin:0 0 1em;padding-bottom:.4em;border-bottom:1px solid #e5e5e5}
p{margin:0 0 .4em;text-indent:1.5em}h1+p,h2+p,h3+p,p:first-child{text-indent:0}
h2{font-size:13pt;font-weight:600;margin:1em 0 .4em}h3{font-size:11pt;font-weight:600;margin:.8em 0 .3em}
blockquote{margin:.7em 1.5em;border-left:2px solid #c8b89a;padding-left:.75em;font-style:italic;color:#555}
ul,ol{margin:.5em 0 .5em 1.5em}strong{font-weight:700}em{font-style:italic}
.page-break-hint{color:#bbb;font-size:8pt;text-align:center;margin:.5em 0}
body::before{content:'RASCUNHO';position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80pt;font-weight:900;color:rgba(0,0,0,0.04);white-space:nowrap;pointer-events:none;z-index:0}
</style></head><body>
${coverHtml}
<div class="review-notice"><strong>⚠ Versão de revisão — não é o layout final do livro</strong>
Este PDF foi gerado para facilitar a revisão do conteúdo. A diagramação real estará disponível ao publicar o livro.</div>
<div class="book-header"><h2>${bookTitle}</h2>${author ? `<p>${author}</p>` : ''}</div>
${chaptersHtml}${backCoverHtml}
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),400))</script>
</body></html>`
}

// ---------------------------------------------------------------------------
// PDF final — mesma abordagem do visualizador (páginas de tamanho fixo)
// Recebe ExportPage[] do paginador, idêntico ao que o visualizador renderiza
// ---------------------------------------------------------------------------
export function buildPrintHtml(
  pages: ExportPage[],
  bookTitle: string,
  format: BookFormat,
  fontId: string | undefined,
  customFonts: { name: string; dataUrl: string }[],
  coverUrl?: string,
  backCoverUrl?: string,
): string {
  const dims    = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const font    = getFontById(fontId)

  const mTop   = px2cm(margins.top)
  const mRight = px2cm(margins.right)
  const mBott  = px2cm(margins.bottom)
  const mLeft  = px2cm(margins.left)

  const googleImport = font.google
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.google)}&display=swap">`
    : ''
  const customFontFaces = customFonts.map(f => `@font-face{font-family:'${f.name}';src:url('${f.dataUrl}')}`).join('\n')

  const coverHtml = coverUrl
    ? `<div style="page:cover-pg;break-after:page;width:${dims.wCm};height:${dims.hCm};overflow:hidden;background:#000"><img src="${coverUrl}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/></div>`
    : ''
  const backCoverHtml = backCoverUrl
    ? `<div style="page:cover-pg;break-before:page;width:${dims.wCm};height:${dims.hCm};overflow:hidden;background:#000"><img src="${backCoverUrl}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""/></div>`
    : ''

  const pagesHtml = pages.map(p => {
    if (p.kind === 'intercapa') return p.html

    const contentHtml = p.html.replace(
      /\[(\d+)\]/g,
      '<sup class="fn-ref">[$1]</sup>'
    )

    const fnHtml = p.footnotes?.length
      ? `<div class="fn-block"><div class="fn-rule"></div>${p.footnotes.map(fn =>
          `<div class="fn-line"><span class="fn-num">[${fn.num}]</span><span class="fn-text">${fn.html}</span></div>`
        ).join('')}</div>`
      : ''

    const pgNum = p.pageNum != null ? `<div class="pg-num">${p.pageNum}</div>` : ''

    // Conteúdo envolto em .book-page-content — IDÊNTICO ao que o paginador mede
    return `<div class="page"><div class="book-page-content">${contentHtml}</div>${fnHtml}${pgNum}</div>`
  }).join('\n')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${bookTitle}</title>${googleImport}
<style>
${customFontFaces}
@page{size:${dims.wCm} ${dims.hCm};margin:0}
@page cover-pg{size:${dims.wCm} ${dims.hCm};margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;font-family:${font.css}}
.page{
  width:${dims.wCm};height:${dims.hCm};
  padding:${mTop} ${mRight} ${mBott} ${mLeft};
  break-after:page;overflow:hidden;position:relative;
}
/* CSS idêntico ao globals.css .book-page-content — mesmos valores que o paginador vê */
.book-page-content{font-size:11px;line-height:1.8;font-family:${font.css};color:#1a1a1a}
.book-page-content p{margin-bottom:0.55em;text-align:justify;text-indent:1.5em}
.book-page-content p:first-child,
.book-page-content h1+p,
.book-page-content h2+p,
.book-page-content h3+p{text-indent:0}
.book-page-content p:empty{min-height:1.8em;display:block}
.book-page-content h1{font-size:1.8em;font-weight:700;line-height:1.2;padding-top:1.5em;margin:0 0 0.5em}
.book-page-content h2{font-size:1.25em;font-weight:600;line-height:1.3;padding-top:1.2em;margin:0 0 0.5em;letter-spacing:0.01em}
.book-page-content h3{font-size:1.05em;font-weight:600;line-height:1.4;padding-top:0.8em;margin:0 0 0.4em}
.book-page-content :is(h1,h2,h3):first-child{padding-top:0.3em}
.book-page-content blockquote{margin:0.7em 1.2em;padding-left:0.75em;border-left:2px solid #c8b89a;font-style:italic;color:#555}
.book-page-content ul{margin:0.4em 0;padding-left:1.4em;list-style-type:disc}
.book-page-content ol{margin:0.4em 0;padding-left:1.4em;list-style-type:decimal}
.book-page-content li{margin-bottom:0.2em}
.book-page-content strong{font-weight:700}
.book-page-content em{font-style:italic}
.book-page-content img{max-width:100%;height:auto}
.fn-ref{color:#c8720a;font-size:0.72em;vertical-align:super;font-weight:600}
.pg-num{position:absolute;bottom:0;left:0;right:0;text-align:center;padding-bottom:${px2cm(Math.floor(margins.bottom/3))};font-size:9px;color:#888}
.fn-block{position:absolute;bottom:${mBott};left:${mLeft};right:${mRight}}
.fn-rule{border-top:0.5pt solid #bbb;margin-bottom:4pt}
.fn-line{display:flex;gap:4pt;font-size:9px;line-height:1.5;color:#444;margin-bottom:2pt}
.fn-num{flex-shrink:0;font-weight:600}
</style></head><body>
${coverHtml}${pagesHtml}${backCoverHtml}
<script>document.fonts.ready.then(()=>window.print())</script>
</body></html>`
}

// ---------------------------------------------------------------------------
// Helper: envia HTML para o servidor Puppeteer e baixa o PDF resultante
// ---------------------------------------------------------------------------
export async function exportarPdfServidor(html: string, filename: string): Promise<void> {
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Erro HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename || 'livro'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// EPUB
// ---------------------------------------------------------------------------
export async function buildEpub(
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
      ? `<p class="draft-banner">⚠ RASCUNHO — versão em edição, não publicada</p>` : ''
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
