'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { getFontById } from '@/lib/fonts'
import { BookFormat, Chapter } from '@/types/book'

// ---------------------------------------------------------------------------
// Dimensões por formato (px a 96 dpi para renderização)
// ---------------------------------------------------------------------------
const FORMAT_DIMS: Record<BookFormat, { w: number; h: number }> = {
  '14x21':  { w: 530,  h: 794  },
  '15x23':  { w: 567,  h: 870  },
  'a5':     { w: 559,  h: 794  },
  'pocket': { w: 416,  h: 680  },
  'abnt':   { w: 756,  h: 1071 },
}
const FORMAT_MARGINS: Record<BookFormat, { top: number; right: number; bottom: number; left: number }> = {
  '14x21':  { top: 96, right: 70, bottom: 60, left: 96 },
  '15x23':  { top: 96, right: 70, bottom: 60, left: 96 },
  'a5':     { top: 96, right: 70, bottom: 60, left: 96 },
  'pocket': { top: 80, right: 56, bottom: 48, left: 80 },
  'abnt':   { top: 132, right: 76, bottom: 60, left: 113 },
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface FootnoteEntry {
  num: number
  html: string
}

type PageItem =
  | { kind: 'blank' }
  | { kind: 'cover';     src: string }
  | { kind: 'backCover'; src: string }
  | { kind: 'intercapa'; chapter: Chapter }
  | { kind: 'content';   html: string; num: string; footnotes: FootnoteEntry[] }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function findCitations(html: string): number[] {
  return [...new Set([...html.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1])))]
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  onClose: () => void
  onContinuar: () => void
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function VisualizadorFlip({ onClose, onContinuar }: Props) {
  const { activeBook, activeChapter, chapters } = useEditorStore()
  const [allPages, setAllPages] = useState<PageItem[]>([])
  const [spreadIdx, setSpreadIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next')
  const [pageInput, setPageInput] = useState('')
  const [editingPage, setEditingPage] = useState(false)
  const medidorRef = useRef<HTMLDivElement>(null)

  const format = (activeBook?.format ?? '14x21') as BookFormat
  const dims = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const fontCss = getFontById(activeBook?.body_font).css

  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const update = () => {
      const maxH = window.innerHeight * 0.80
      const maxW = (window.innerWidth * 0.90) / 2
      setScale(Math.min(maxH / dims.h, maxW / dims.w, 0.85))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [dims.h, dims.w])

  const pw = dims.w * scale
  const ph = dims.h * scale
  const alturaUtil = (dims.h - margins.top - margins.bottom) * scale
  const larguraUtil = (dims.w - margins.left - margins.right) * scale

  // ---------------------------------------------------------------------------
  // Paginação — motor baseado em scrollHeight (layout real do browser, como o Word)
  //
  // Adiciona cada elemento ao medidor e verifica scrollHeight real após cada adição.
  // Margem de segurança de 1 cm (38 px × escala) abaixo do conteúdo.
  // Anti-orphan: heading no fim da página é puxado para a próxima.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!medidorRef.current) return

    const htmlContent = chapters.length > 0
      ? chapters.map((c, i) => {
          const html = c.id === activeChapter?.id ? (c.content_html || '') : (c.content_html || '')
          return (i === 0 ? '' : '<hr data-chapter-sep="true"/>') + html
        }).join('')
      : ''

    const footnoteMap = new Map<number, string>()
    for (const c of chapters) {
      const fns = c.id === activeChapter?.id
        ? (activeChapter.footnotes ?? c.footnotes ?? [])
        : (c.footnotes ?? [])
      for (const f of fns) footnoteMap.set(f.num, f.content)
    }
    const medidor = medidorRef.current

    const runLayout = () => {
      if (!medidorRef.current) return

      medidor.style.width = `${larguraUtil}px`
      medidor.style.fontSize = `${11 * scale}px`
      medidor.style.lineHeight = '1.8'
      medidor.style.fontFamily = fontCss

      medidor.innerHTML = htmlContent
      const allNodes = Array.from(medidor.childNodes)
      medidor.innerHTML = ''

      const SAFETY = 38 * scale
      const pageLimit = alturaUtil - SAFETY

      interface ContentPage { html: string; footnotes: FootnoteEntry[]; chapterIdx: number }
      const contentPages: ContentPage[] = []
      let htmlAtual = ''
      let chapterIdx = 0
      let lastElHtml = ''
      let lastElTag = ''
      let pageNum = 1

      const finalizarPagina = (html: string) => {
        const cits = findCitations(html)
        const footnotes: FootnoteEntry[] = cits
          .filter(n => footnoteMap.has(n))
          .map(n => ({ num: n, html: footnoteMap.get(n)! }))
        contentPages.push({ html, footnotes, chapterIdx })
      }

      for (const no of allNodes) {
        if (!(no instanceof Element)) continue
        const el = no as HTMLElement

        if (el.tagName === 'HR' && el.dataset.chapterSep === 'true') {
          if (htmlAtual) finalizarPagina(htmlAtual)
          htmlAtual = ''
          medidor.innerHTML = ''
          chapterIdx++
          lastElHtml = ''
          lastElTag = ''
          continue
        }

        // HR de conteúdo = quebra de página manual
        if (el.tagName === 'HR') {
          if (htmlAtual) finalizarPagina(htmlAtual)
          htmlAtual = ''
          medidor.innerHTML = ''
          lastElHtml = ''
          lastElTag = ''
          continue
        }

        const clone = el.cloneNode(true) as HTMLElement
        medidor.appendChild(clone)

        if (medidor.scrollHeight > pageLimit && htmlAtual) {
          medidor.removeChild(clone)
          const isShortPage = medidor.scrollHeight < 11 * scale * 1.8 * 4

          if (/^H[1-3]$/.test(lastElTag) && htmlAtual.length > lastElHtml.length) {
            // Título no fim de página com conteúdo anterior — puxa título+próximo para a próxima
            finalizarPagina(htmlAtual.slice(0, -lastElHtml.length))
            htmlAtual = lastElHtml + el.outerHTML
          } else if (/^H[1-3]$/.test(lastElTag) || isShortPage) {
            // Título sozinho OU página muito curta — força o próximo elemento na mesma página
            htmlAtual += el.outerHTML
            finalizarPagina(htmlAtual)
            htmlAtual = ''
          } else {
            finalizarPagina(htmlAtual)
            htmlAtual = el.outerHTML
          }
          medidor.innerHTML = htmlAtual
          lastElHtml = el.outerHTML
          lastElTag = el.tagName
        } else {
          htmlAtual += el.outerHTML
          lastElHtml = el.outerHTML
          lastElTag = el.tagName
        }
      }

      if (htmlAtual) finalizarPagina(htmlAtual)

      // Montar array completo: capa + intercapas + conteúdo + contracapa
      const pages: PageItem[] = []
      if (activeBook?.cover_url) pages.push({ kind: 'cover', src: activeBook.cover_url })

      let prevChapterIdx = -1
      for (const cp of contentPages) {
        if (cp.chapterIdx !== prevChapterIdx) {
          const chapter = chapters[cp.chapterIdx]
          if (chapter?.opening_style && chapter.opening_style !== 'nenhum') {
            pages.push({ kind: 'intercapa', chapter })
          }
          prevChapterIdx = cp.chapterIdx
        }
        pages.push({ kind: 'content', html: cp.html, num: String(pageNum++), footnotes: cp.footnotes })
      }

      if (activeBook?.back_cover_url) pages.push({ kind: 'backCover', src: activeBook.back_cover_url })

      // Capa e contracapa em spread solo (cada uma com blank do lado)
      if (pages.length > 0 && pages[0].kind === 'cover') {
        pages.splice(1, 0, { kind: 'blank' })
      }
      const backIdx = pages.findIndex(p => p.kind === 'backCover')
      if (backIdx !== -1 && backIdx % 2 !== 0) {
        pages.splice(backIdx, 0, { kind: 'blank' })
      }
      if (pages.length % 2 !== 0) pages.push({ kind: 'blank' })

      setAllPages(pages)
      setSpreadIdx(0)
    }

    document.fonts.ready.then(runLayout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, activeChapter?.id, scale, fontCss, alturaUtil, larguraUtil])

  // ---------------------------------------------------------------------------
  // Spreads: pares de páginas [left, right]
  // ---------------------------------------------------------------------------
  const spreads: [PageItem, PageItem][] = []
  for (let i = 0; i < allPages.length; i += 2) {
    spreads.push([allPages[i] ?? { kind: 'blank' }, allPages[i + 1] ?? { kind: 'blank' }])
  }

  const canNext = spreadIdx < spreads.length - 1
  const canPrev = spreadIdx > 0

  // Mapa número-de-página → índice de spread
  const pageNumToSpreadIdx = useMemo(() => {
    const map = new Map<number, number>()
    allPages.forEach((page, i) => {
      if (page.kind === 'content') map.set(parseInt(page.num), Math.floor(i / 2))
    })
    return map
  }, [allPages])

  function isSolo(spread: [PageItem, PageItem]) {
    return spread[0].kind === 'cover' || spread[1].kind === 'cover' ||
           spread[0].kind === 'backCover' || spread[1].kind === 'backCover'
  }

  function spreadLabel(spread: [PageItem, PageItem]): string {
    if (spread[0].kind === 'cover' || spread[1].kind === 'cover') return 'Capa'
    if (spread[0].kind === 'backCover' || spread[1].kind === 'backCover') return 'Contracapa'
    const nums = [spread[0], spread[1]]
      .filter(p => p.kind === 'content')
      .map(p => (p as Extract<PageItem, { kind: 'content' }>).num)
    if (nums.length === 0) return '—'
    if (nums.length === 1) return `Pág. ${nums[0]}`
    return `Pág. ${nums[0]}–${nums[nums.length - 1]}`
  }

  function handlePageJump(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(pageInput)
    if (!isNaN(n)) {
      const sIdx = pageNumToSpreadIdx.get(n)
      if (sIdx !== undefined) setSpreadIdx(sIdx)
    }
    setEditingPage(false)
    setPageInput('')
  }

  const goNext = useCallback(() => {
    if (animating || !canNext) return
    const nextSpread = spreads[spreadIdx + 1]
    if (nextSpread && isSolo(nextSpread)) { setSpreadIdx(i => i + 1); return }
    if (isSolo(spreads[spreadIdx] ?? [{ kind: 'blank' }, { kind: 'blank' }])) { setSpreadIdx(i => i + 1); return }
    setFlipDir('next')
    setAnimating(true)
    setTimeout(() => { setSpreadIdx(i => i + 1); setAnimating(false) }, 660)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, canNext, spreadIdx, spreads])

  const goPrev = useCallback(() => {
    if (animating || !canPrev) return
    const prevSpread = spreads[spreadIdx - 1]
    if (prevSpread && isSolo(prevSpread)) { setSpreadIdx(i => i - 1); return }
    if (isSolo(spreads[spreadIdx] ?? [{ kind: 'blank' }, { kind: 'blank' }])) { setSpreadIdx(i => i - 1); return }
    setFlipDir('prev')
    setAnimating(true)
    setTimeout(() => { setSpreadIdx(i => i - 1); setAnimating(false) }, 660)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, canPrev, spreadIdx, spreads])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  const cur  = spreads[spreadIdx]     ?? [{ kind: 'blank' }, { kind: 'blank' }]
  const next = spreads[spreadIdx + 1] ?? [{ kind: 'blank' }, { kind: 'blank' }]
  const prev = spreads[spreadIdx - 1] ?? [{ kind: 'blank' }, { kind: 'blank' }]

  const bgLeft  = animating && flipDir === 'next' ? cur[0]  : animating && flipDir === 'prev' ? prev[0] : cur[0]
  const bgRight = animating && flipDir === 'next' ? next[1] : animating && flipDir === 'prev' ? cur[1]  : cur[1]

  const leafFront = flipDir === 'next' ? cur[1]  : cur[0]
  const leafBack  = flipDir === 'next' ? next[0] : prev[1]
  const leafLeft  = flipDir === 'prev' ? 0 : pw + 8

  const contentCount = allPages.filter(p => p.kind === 'content').length

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center gap-6 select-none">

      {/* Medidor oculto */}
      <div ref={medidorRef} aria-hidden className="book-page-content"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }} />

      {/* Barra superior */}
      <div className="w-full flex items-center justify-between px-6 shrink-0">
        <p className="text-xs text-white/40">{activeBook?.title} · {contentCount} páginas</p>
        <div className="flex items-center gap-3">
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" onClick={onContinuar}>
            <Rocket size={13} />
            Configurar publicação
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Livro */}
      <div style={{ perspective: '2500px', perspectiveOrigin: 'center center' }}>
        <div className="relative flex items-center justify-center" style={{ width: pw * 2 + 8, height: ph }}>

          <div style={{
            position: 'absolute', bottom: -12, left: '5%', right: '5%', height: 20,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
            filter: 'blur(6px)', zIndex: -1,
          }} />

          {isSolo(cur) ? (
            // Capa ou contracapa — página única centralizada
            (() => {
              const soloPage = cur[0].kind === 'cover' || cur[0].kind === 'backCover' ? cur[0] : cur[1]
              return (
                <div style={{
                  width: pw, height: ph, overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                }}>
                  <img
                    src={(soloPage as Extract<PageItem, { kind: 'cover' }>).src}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              )
            })()
          ) : (
            // Spread normal com duas páginas
            <>
              <PageRenderer item={bgLeft} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side="left" />

              <div style={{
                width: 8, height: ph, flexShrink: 0, zIndex: 5,
                background: 'linear-gradient(to right, #c8b89a, #e8dcc8, #c8b89a)',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
              }} />

              <PageRenderer item={bgRight} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side="right" />

              {animating && (
                <div
                  className={`flip-leaf ${flipDir === 'next' ? 'flip-next' : 'flip-prev'}`}
                  style={{ width: pw, height: ph, left: leafLeft }}
                >
                  <div className="flip-face">
                    <PageRenderer item={leafFront} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side={flipDir === 'next' ? 'right' : 'left'} />
                  </div>
                  <div className="flip-face flip-face-back">
                    <PageRenderer item={leafBack} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side={flipDir === 'next' ? 'left' : 'right'} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={() => setSpreadIdx(0)}
          disabled={!canPrev || animating}
          className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          title="Ir ao início"
        >
          <ChevronsLeft size={18} />
        </button>

        <button
          onClick={goPrev}
          disabled={!canPrev || animating}
          className="flex items-center gap-1.5 text-white/60 hover:text-white disabled:opacity-20 transition-colors text-sm"
        >
          <ChevronLeft size={20} />
          Anterior
        </button>

        {/* Indicador / busca por página */}
        <div className="w-36 text-center">
          {editingPage ? (
            <form onSubmit={handlePageJump} className="flex items-center justify-center gap-1">
              <input
                autoFocus
                type="number"
                min={1}
                max={contentCount}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onBlur={() => { setEditingPage(false); setPageInput('') }}
                placeholder="Nº página"
                className="w-24 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-xs text-white text-center outline-none focus:border-white/50"
              />
            </form>
          ) : (
            <button
              onClick={() => setEditingPage(true)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
              title="Clique para ir a uma página"
            >
              {spreadLabel(cur)} · {contentCount} págs.
            </button>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={!canNext || animating}
          className="flex items-center gap-1.5 text-white/60 hover:text-white disabled:opacity-20 transition-colors text-sm"
        >
          Próxima
          <ChevronRight size={20} />
        </button>

        <button
          onClick={() => setSpreadIdx(spreads.length - 1)}
          disabled={!canNext || animating}
          className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          title="Ir ao fim"
        >
          <ChevronsRight size={18} />
        </button>
      </div>

      <p className="text-[10px] text-white/20">Use ← → para navegar · clique em &ldquo;Pág.&rdquo; para buscar · Esc para fechar</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renderizador de página individual
// ---------------------------------------------------------------------------
function PageRenderer({ item, pw, ph, margins, scale, fontCss, side }: {
  item: PageItem
  pw: number
  ph: number
  margins: { top: number; right: number; bottom: number; left: number }
  scale: number
  fontCss: string
  side: 'left' | 'right'
}) {
  const base: React.CSSProperties = {
    width: pw, height: ph, background: '#faf8f0', flexShrink: 0, position: 'relative', overflow: 'hidden',
    boxShadow: side === 'left'
      ? '-4px 0 12px rgba(0,0,0,0.15), inset -2px 0 4px rgba(0,0,0,0.05)'
      : '4px 0 12px rgba(0,0,0,0.15), inset 2px 0 4px rgba(0,0,0,0.05)',
  }

  if (item.kind === 'blank') {
    return <div style={{ ...base, background: '#f0ede4' }} />
  }

  if (item.kind === 'cover' || item.kind === 'backCover') {
    return (
      <div style={base}>
        <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }

  if (item.kind === 'intercapa') {
    return <IntercapaRenderer chapter={item.chapter} base={base} ph={ph} scale={scale} fontCss={fontCss} />
  }

  // content page
  const fnHeight = item.footnotes.length > 0
    ? (46 * scale) + (item.footnotes.length * 24 * scale)
    : 0

  return (
    <div style={base}>
      <div
        className="book-page-content absolute overflow-hidden"
        style={{
          top: margins.top * scale,
          right: margins.right * scale,
          bottom: margins.bottom * scale + fnHeight,
          left: margins.left * scale,
          fontSize: 11 * scale,
          lineHeight: 1.8,
          fontFamily: fontCss,
          color: '#1a1a1a',
        }}
        dangerouslySetInnerHTML={{ __html: item.html.replace(/\[(\d+)\]/g, '<sup style="color:#c8720a;font-size:0.72em;vertical-align:super;font-weight:600">[$1]</sup>') }}
      />

      {item.footnotes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: margins.bottom * scale,
          left: margins.left * scale,
          right: margins.right * scale,
          borderTop: `${0.5 * scale}px solid #bbb`,
          paddingTop: 4 * scale,
          background: '#faf8f0',
        }}>
          {item.footnotes.map(fn => (
            <div key={fn.num} style={{
              fontSize: 8.5 * scale, lineHeight: 1.5, color: '#444',
              display: 'flex', gap: 3 * scale, marginBottom: 2 * scale, fontFamily: fontCss,
            }}>
              <span style={{ flexShrink: 0, fontWeight: 600 }}>[{fn.num}]</span>
              <span dangerouslySetInnerHTML={{ __html: fn.html }} />
            </div>
          ))}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        paddingBottom: (margins.bottom * scale) / 3,
        fontSize: 9 * scale, color: '#888',
      }}>
        {item.num}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renderizador de intercapa (abertura de capítulo)
// ---------------------------------------------------------------------------
function IntercapaRenderer({ chapter, base, ph, scale, fontCss }: {
  chapter: Chapter
  base: React.CSSProperties
  ph: number
  scale: number
  fontCss: string
}) {
  const { opening_style, opening_image, opening_epigraph, opening_epigraph_author, title } = chapter
  const fs = (n: number) => n * scale
  const numLabel = chapter.chapter_num?.trim() ? `Capítulo ${chapter.chapter_num.trim()}` : null

  if (opening_style === 'simples') {
    return (
      <div style={{ ...base, background: '#faf8f0' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: fs(12), padding: `0 ${fs(40)}px`, fontFamily: fontCss }}>
          <div style={{ width: fs(60), height: 1, background: '#c8b89a' }} />
          <div style={{ textAlign: 'center' }}>
            {numLabel && <p style={{ fontSize: fs(8), letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase', marginBottom: fs(6) }}>{numLabel}</p>}
            <p style={{ fontSize: fs(16), color: '#1a1a1a', lineHeight: 1.3 }}>{title}</p>
          </div>
          <div style={{ width: fs(60), height: 1, background: '#c8b89a' }} />
        </div>
      </div>
    )
  }

  if (opening_style === 'epigrafe') {
    return (
      <div style={{ ...base, background: '#faf8f0' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${fs(50)}px`, fontFamily: fontCss }}>
          {numLabel && <p style={{ fontSize: fs(8), letterSpacing: '0.15em', color: '#999', textTransform: 'uppercase', marginBottom: fs(6) }}>{numLabel}</p>}
          <p style={{ fontSize: fs(16), color: '#1a1a1a', marginBottom: fs(28) }}>{title}</p>
          {opening_epigraph && (
            <div style={{ borderLeft: `2px solid #c8b89a`, paddingLeft: fs(12) }}>
              <p style={{ fontSize: fs(9), color: '#555', fontStyle: 'italic', lineHeight: 1.6, marginBottom: fs(6) }}>&ldquo;{opening_epigraph}&rdquo;</p>
              {opening_epigraph_author && <p style={{ fontSize: fs(8), color: '#888', textAlign: 'right' }}>— {opening_epigraph_author}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (opening_style === 'ilustrado') {
    const imgHeight = ph * 0.55
    return (
      <div style={{ ...base, background: '#faf8f0' }}>
        <div style={{ height: imgHeight, overflow: 'hidden', background: 'linear-gradient(135deg, #e8e0d0 0%, #d0c4a8 100%)' }}>
          {opening_image
            ? <img src={opening_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: fs(8), color: '#b0a080', fontStyle: 'italic', fontFamily: fontCss }}>Imagem do capítulo</p></div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ph - imgHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fontCss, gap: fs(4) }}>
          {numLabel && <p style={{ fontSize: fs(8), letterSpacing: '0.12em', color: '#999', textTransform: 'uppercase' }}>{numLabel}</p>}
          <p style={{ fontSize: fs(14), color: '#1a1a1a' }}>{title}</p>
        </div>
      </div>
    )
  }

  if (opening_style === 'pagina-inteira') {
    return (
      <div style={{ ...base, background: '#1a1510' }}>
        {opening_image
          ? <img src={opening_image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #3a3530 0%, #1a1510 100%)' }} />
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${fs(20)}px ${fs(30)}px`, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', fontFamily: fontCss }}>
          {numLabel && <p style={{ fontSize: fs(8), letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: fs(6) }}>{numLabel}</p>}
          <p style={{ fontSize: fs(16), color: '#fff', lineHeight: 1.2 }}>{title}</p>
        </div>
      </div>
    )
  }

  return <div style={{ ...base, background: '#faf8f0' }} />
}
