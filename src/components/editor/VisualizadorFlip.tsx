'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { getFontById } from '@/lib/fonts'
import { BookFormat } from '@/types/book'

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
// Tipos de página
// ---------------------------------------------------------------------------
type PageItem =
  | { kind: 'blank' }
  | { kind: 'cover';     src: string }
  | { kind: 'backCover'; src: string }
  | { kind: 'content';   html: string; num: string }

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
  const medidorRef = useRef<HTMLDivElement>(null)

  const format = (activeBook?.format ?? '14x21') as BookFormat
  const dims = FORMAT_DIMS[format]
  const margins = FORMAT_MARGINS[format]
  const fontCss = getFontById(activeBook?.body_font).css

  // Escala baseada na viewport
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const update = () => {
      const maxH = window.innerHeight * 0.80
      const maxW = (window.innerWidth * 0.90) / 2 // metade para cada página
      setScale(Math.min(maxH / dims.h, maxW / dims.w, 0.85))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [dims.h, dims.w])

  const pw = dims.w * scale   // page width
  const ph = dims.h * scale   // page height
  const alturaUtil = (dims.h - margins.top - margins.bottom) * scale
  const larguraUtil = (dims.w - margins.left - margins.right) * scale

  // ---------------------------------------------------------------------------
  // Paginação
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!medidorRef.current) return

    const htmlContent = chapters.length > 0
      ? chapters.map((c, i) => {
          const html = c.id === activeChapter?.id
            ? (c.content_html || '')
            : (c.content_html || '')
          return (i === 0 ? '' : '<hr/>') + html
        }).join('')
      : ''

    const allFootnotes = chapters.flatMap(c => c.footnotes ?? [])
    const footnoteMap = new Map(allFootnotes.map(f => [f.num, f.content]))

    const medidor = medidorRef.current
    medidor.style.width = `${larguraUtil}px`
    medidor.style.fontSize = `${11 * scale}px`
    medidor.style.lineHeight = '1.8'
    medidor.style.fontFamily = fontCss
    medidor.innerHTML = htmlContent

    const contentPages: PageItem[] = []
    let acc = 0, html = '', blockNum = 0, pageNum = 1

    for (const no of Array.from(medidor.childNodes)) {
      if (!(no instanceof Element)) continue
      const el = no as HTMLElement
      if (el.tagName === 'HR') { acc = 0; blockNum++; continue }
      const h = el.offsetHeight + 16
      if (acc + h > alturaUtil && html) {
        const cits = findCitations(html)
        let fnHtml = ''
        cits.forEach(n => { if (footnoteMap.has(n)) fnHtml += `<div style="font-size:0.72em;color:#555;display:flex;gap:4px"><span style="font-weight:600">[${n}]</span><span>${footnoteMap.get(n)}</span></div>` })
        const pageHtml = fnHtml
          ? `${html}<div style="margin-top:auto;padding-top:6px;border-top:0.5px solid #bbb">${fnHtml}</div>`
          : html
        contentPages.push({ kind: 'content', html: pageHtml, num: String(pageNum++) })
        html = el.outerHTML; acc = h
      } else {
        html += el.outerHTML; acc += h
      }
      blockNum++
    }
    if (html) contentPages.push({ kind: 'content', html, num: String(pageNum++) })

    // Montar array completo: capa + conteúdo + contracapa
    const pages: PageItem[] = []
    if (activeBook?.cover_url) pages.push({ kind: 'cover', src: activeBook.cover_url })
    pages.push(...contentPages)
    if (activeBook?.back_cover_url) pages.push({ kind: 'backCover', src: activeBook.back_cover_url })

    // Garantir contagem par (adiciona blank no início se necessário para cover ficar à direita)
    if (pages.length > 0 && pages[0].kind === 'cover') {
      pages.unshift({ kind: 'blank' })
    }
    if (pages.length % 2 !== 0) pages.push({ kind: 'blank' })

    setAllPages(pages)
    setSpreadIdx(0)
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

  const goNext = useCallback(() => {
    if (animating || !canNext) return
    setFlipDir('next')
    setAnimating(true)
    setTimeout(() => { setSpreadIdx(i => i + 1); setAnimating(false) }, 660)
  }, [animating, canNext])

  const goPrev = useCallback(() => {
    if (animating || !canPrev) return
    setFlipDir('prev')
    setAnimating(true)
    setTimeout(() => { setSpreadIdx(i => i - 1); setAnimating(false) }, 660)
  }, [animating, canPrev])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  // ---------------------------------------------------------------------------
  // O que renderizar durante animação
  // ---------------------------------------------------------------------------
  const cur  = spreads[spreadIdx]   ?? [{ kind: 'blank' }, { kind: 'blank' }]
  const next = spreads[spreadIdx + 1] ?? [{ kind: 'blank' }, { kind: 'blank' }]
  const prev = spreads[spreadIdx - 1] ?? [{ kind: 'blank' }, { kind: 'blank' }]

  // Páginas de fundo (sem o leaf)
  const bgLeft  = animating && flipDir === 'next' ? cur[0]  : animating && flipDir === 'prev' ? prev[0] : cur[0]
  const bgRight = animating && flipDir === 'next' ? next[1] : animating && flipDir === 'prev' ? cur[1]  : cur[1]

  // Conteúdo do leaf
  const leafFront = flipDir === 'next' ? cur[1]  : cur[0]
  const leafBack  = flipDir === 'next' ? next[0] : prev[1]
  const leafLeft  = flipDir === 'prev' ? 0 : pw + 8   // posição horizontal do leaf

  const progress = `${spreadIdx * 2 + 1} – ${Math.min(spreadIdx * 2 + 2, allPages.length)} de ${allPages.length}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center gap-6 select-none">

      {/* Medidor oculto */}
      <div ref={medidorRef} aria-hidden className="book-page-content"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }} />

      {/* Barra superior */}
      <div className="w-full flex items-center justify-between px-6 shrink-0">
        <p className="text-xs text-white/40">{activeBook?.title}</p>
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
        <div className="relative flex" style={{ width: pw * 2 + 8, height: ph }}>

          {/* Sombra do livro */}
          <div style={{
            position: 'absolute', bottom: -12, left: '5%', right: '5%', height: 20,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
            filter: 'blur(6px)', zIndex: -1,
          }} />

          {/* Página esquerda (fundo) */}
          <PageRenderer item={bgLeft} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side="left" />

          {/* Lombada */}
          <div style={{
            width: 8, height: ph, flexShrink: 0, zIndex: 5,
            background: 'linear-gradient(to right, #c8b89a, #e8dcc8, #c8b89a)',
            boxShadow: '0 0 8px rgba(0,0,0,0.3)',
          }} />

          {/* Página direita (fundo) */}
          <PageRenderer item={bgRight} pw={pw} ph={ph} margins={margins} scale={scale} fontCss={fontCss} side="right" />

          {/* Leaf animado */}
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
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-8 shrink-0">
        <button
          onClick={goPrev}
          disabled={!canPrev || animating}
          className="flex items-center gap-2 text-white/60 hover:text-white disabled:opacity-20 transition-colors text-sm"
        >
          <ChevronLeft size={20} />
          Anterior
        </button>

        <span className="text-xs text-white/30 w-28 text-center">{progress}</span>

        <button
          onClick={goNext}
          disabled={!canNext || animating}
          className="flex items-center gap-2 text-white/60 hover:text-white disabled:opacity-20 transition-colors text-sm"
        >
          Próxima
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="text-[10px] text-white/20">Use ← → para navegar · Esc para fechar</p>
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

  return (
    <div style={base}>
      <div
        className="book-page-content absolute overflow-hidden"
        style={{
          top: margins.top * scale,
          right: margins.right * scale,
          bottom: margins.bottom * scale,
          left: margins.left * scale,
          fontSize: 11 * scale,
          lineHeight: 1.8,
          fontFamily: fontCss,
          color: '#1a1a1a',
        }}
        dangerouslySetInnerHTML={{ __html: item.html }}
      />
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          paddingBottom: (margins.bottom * scale) / 3,
          fontSize: 9 * scale, color: '#888',
        }}
      >
        {item.num}
      </div>
    </div>
  )
}
