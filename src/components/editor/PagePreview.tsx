'use client'

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEditorStore } from '@/lib/store/editorStore'
import { BookFormat } from '@/types/book'
import { AreaLabel } from '@/components/ui/area-label'
import { Button } from '@/components/ui/button'
import { ConfiguracaoLivro } from './ConfiguracaoLivro'
import { Chapter } from '@/types/book'
import { getFontById } from '@/lib/fonts'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Dimensões e margens por formato
// ---------------------------------------------------------------------------
const formatDimensions: Record<BookFormat, { width: number; height: number; label: string }> = {
  '14x21':  { width: 530,  height: 794,  label: '14 × 21 cm' },
  '15x23':  { width: 567,  height: 870,  label: '15 × 23 cm' },
  'a5':     { width: 559,  height: 794,  label: 'A5' },
  'pocket': { width: 416,  height: 680,  label: 'Bolso' },
  'abnt':   { width: 756,  height: 1071, label: 'A4 ABNT' },
}

const formatMargins: Record<BookFormat, { top: number; right: number; bottom: number; left: number }> = {
  '14x21':  { top: 96, right: 70, bottom: 60, left: 96 },
  '15x23':  { top: 96, right: 70, bottom: 60, left: 96 },
  'a5':     { top: 96, right: 70, bottom: 60, left: 96 },
  'pocket': { top: 80, right: 56, bottom: 48, left: 80 },
  'abnt':   { top: 132, right: 76, bottom: 60, left: 113 },
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

interface FootnoteEntry {
  num: number
  html: string
}


/** Extrai números de citação ([1], [2]…) de um trecho HTML. */
function findCitations(html: string): number[] {
  const nums = [...html.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]))
  return [...new Set(nums)].sort((a, b) => a - b)
}

/** Converte número em algarismos romanos minúsculos (para capítulos não numerados). */
function toRoman(n: number): string {
  if (n <= 0) return ''
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let r = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i] }
  }
  return r.toLowerCase()
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PaginaData {
  html: string
  startBlock: number
  endBlock: number
  footnotes: FootnoteEntry[]
}

interface PagePreviewProps {
  content: string
  width?: number
  cursorBlockIndex?: number
  onBlockClick?: (blockIndex: number) => void
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PagePreview({ content, width = 420, cursorBlockIndex = 0, onBlockClick }: PagePreviewProps) {
  const {
    activeBook, activeChapter, chapters,
    isFocusMode, isPreviewOpen, togglePreview,
    chapterPageCounts, setChapterPageCount,
  } = useEditorStore()

  const fontCss = getFontById(activeBook?.body_font).css
  const [paginas, setPaginas] = useState<PaginaData[]>([])
  const [modoVisualizacao, setModoVisualizacao] = useState<'capitulo' | 'livro'>('capitulo')
  const medidorRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const currentPageIdxRef = useRef(-1)

  const format = activeBook?.format ?? '14x21'
  const dims = formatDimensions[format]
  const margins = formatMargins[format]
  const scale = Math.min(0.85, (width * 0.88) / dims.width)

  const larguraPagina = dims.width * scale
  const alturaPagina = dims.height * scale
  const alturaUtil = (dims.height - margins.top - margins.bottom) * scale
  const larguraUtil = (dims.width - margins.left - margins.right) * scale

  const htmlParaPaginar = useMemo(() => {
    if (modoVisualizacao === 'capitulo' || chapters.length === 0) return content
    return chapters
      .map((c, i) => {
        const html = c.id === activeChapter?.id ? content : (c.content_html || '')
        const titulo = `<h1>${c.title || 'Sem título'}</h1>`
        return (i === 0 ? '' : '<hr/>') + titulo + html
      })
      .join('')
  }, [modoVisualizacao, content, chapters, activeChapter?.id])

  // ---------------------------------------------------------------------------
  // Paginação com extração de rodapés
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!htmlParaPaginar || !medidorRef.current) {
      setPaginas([{ html: '', startBlock: 0, endBlock: 0, footnotes: [] }])
      return
    }

    const structuredFootnotes = modoVisualizacao === 'capitulo' ? (activeChapter?.footnotes ?? []) : []
    const footnoteMap = new Map(structuredFootnotes.map(f => [f.num, f.content]))

    const medidor = medidorRef.current
    medidor.style.width = `${larguraUtil}px`
    medidor.style.fontSize = `${11 * scale}px`
    medidor.style.lineHeight = '1.8'
    medidor.style.fontFamily = fontCss
    medidor.innerHTML = htmlParaPaginar

    const nos = Array.from(medidor.childNodes)
    const paginasGeradas: PaginaData[] = []
    let alturaAcumulada = 0
    let htmlAtual = ''
    let blockNum = 0
    let startBlock = 0

    const finalizarPagina = (html: string, start: number, end: number) => {
      const cits = findCitations(html)
      const footnotes: FootnoteEntry[] = cits
        .filter(n => footnoteMap.has(n))
        .map(n => ({ num: n, html: footnoteMap.get(n)! }))
      paginasGeradas.push({ html, startBlock: start, endBlock: end, footnotes })
    }

    for (const no of nos) {
      if (!(no instanceof Element)) continue
      const el = no as HTMLElement

      if (el.tagName === 'HR') {
        finalizarPagina(htmlAtual || '', startBlock, blockNum)
        htmlAtual = ''
        alturaAcumulada = 0
        blockNum++
        startBlock = blockNum
        continue
      }

      const alturaEl = el.offsetHeight + 16

      if (alturaAcumulada + alturaEl > alturaUtil && htmlAtual) {
        finalizarPagina(htmlAtual, startBlock, blockNum - 1)
        htmlAtual = el.outerHTML
        alturaAcumulada = alturaEl
        startBlock = blockNum
      } else {
        htmlAtual += el.outerHTML
        alturaAcumulada += alturaEl
      }
      blockNum++
    }

    if (htmlAtual) finalizarPagina(htmlAtual, startBlock, blockNum - 1)
    if (paginasGeradas.length === 0) {
      paginasGeradas.push({ html: '', startBlock: 0, endBlock: 0, footnotes: [] })
    }

    setPaginas(paginasGeradas)
  }, [htmlParaPaginar, format, alturaUtil, larguraUtil, scale, fontCss, modoVisualizacao, activeChapter?.footnotes])

  // Armazena contagem de páginas para cálculo de offset global (só no modo capítulo)
  useEffect(() => {
    if (modoVisualizacao === 'capitulo' && activeChapter?.id && paginas.length > 0) {
      setChapterPageCount(activeChapter.id, paginas.length)
    }
  }, [paginas.length, activeChapter?.id, setChapterPageCount, modoVisualizacao])

  // ---------------------------------------------------------------------------
  // Numeração global de páginas
  // ---------------------------------------------------------------------------
  const isNumbered = activeChapter?.numbered !== false

  const pageOffset = useMemo(() => {
    if (modoVisualizacao === 'livro') return 0
    const activeIdx = chapters.findIndex(c => c.id === activeChapter?.id)
    return chapters.slice(0, activeIdx).reduce((sum, c) => {
      const mesmaTipo = (c.numbered !== false) === isNumbered
      return mesmaTipo ? sum + (chapterPageCounts[c.id] ?? 0) : sum
    }, 0)
  }, [chapters, activeChapter?.id, isNumbered, chapterPageCounts, modoVisualizacao])

  function displayNum(pageIdx: number): string {
    const n = pageOffset + pageIdx + 1
    return modoVisualizacao === 'livro' ? String(n) : (isNumbered ? String(n) : toRoman(n))
  }

  // ---------------------------------------------------------------------------
  // Scroll automático para página do cursor (só no modo capítulo)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPreviewOpen || paginas.length === 0 || modoVisualizacao === 'livro') return
    const targetIdx = paginas.findIndex(
      p => cursorBlockIndex >= p.startBlock && cursorBlockIndex <= p.endBlock
    )
    if (targetIdx < 0 || targetIdx === currentPageIdxRef.current) return
    currentPageIdxRef.current = targetIdx
    pageRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [cursorBlockIndex, paginas, isPreviewOpen, modoVisualizacao])

  if (isFocusMode) return null

  if (!isPreviewOpen) {
    return (
      <div className="shrink-0 w-10 border-l border-border bg-background flex flex-col items-center py-3 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePreview} title="Mostrar visualizador">
          <PanelRightOpen size={15} />
        </Button>
        <span
          className="text-[10px] text-muted-foreground/50 uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Visualizador
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Medidor oculto para calcular paginação */}
      <div
        ref={medidorRef}
        aria-hidden
        className="book-page-content"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}
      />

      <aside
        className="shrink-0 bg-neutral-100 dark:bg-neutral-900 border-l border-border flex flex-col overflow-hidden transition-none"
        style={{ width }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">Visualizador</span>
            <AreaLabel>Visualizador</AreaLabel>
            <div className="flex items-center rounded border border-border overflow-hidden ml-1">
              <button
                onClick={() => setModoVisualizacao('capitulo')}
                className={cn(
                  'text-[10px] px-2 py-0.5 transition-colors leading-tight',
                  modoVisualizacao === 'capitulo'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >Capítulo</button>
              <button
                onClick={() => setModoVisualizacao('livro')}
                className={cn(
                  'text-[10px] px-2 py-0.5 transition-colors leading-tight border-l border-border',
                  modoVisualizacao === 'livro'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >Livro</button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{dims.label}</span>
            <ConfiguracaoLivro />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePreview} title="Ocultar visualizador">
              <PanelRightClose size={14} />
            </Button>
          </div>
        </div>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4 gap-8">
          {modoVisualizacao === 'capitulo' && activeChapter?.opening_style && activeChapter.opening_style !== 'nenhum' && (() => {
            const activeIndex = chapters.findIndex(c => c.id === activeChapter.id)
            const chapterNumber = activeChapter.numbered === false
              ? null
              : chapters.slice(0, activeIndex + 1).filter(c => c.numbered !== false).length
            return (
              <PaginaAbertura
                chapter={activeChapter}
                chapterNumber={chapterNumber}
                largura={larguraPagina}
                altura={alturaPagina}
                scale={scale}
                fontCss={fontCss}
              />
            )
          })()}

          {paginas.map((p, i) => (
            <Pagina
              key={i}
              ref={(el) => { pageRefs.current[i] = el }}
              html={p.html}
              numero={displayNum(i)}
              largura={larguraPagina}
              altura={alturaPagina}
              margins={margins}
              scale={scale}
              fontCss={fontCss}
              footnotes={p.footnotes}
              startBlock={p.startBlock}
              onBlockClick={modoVisualizacao === 'capitulo' ? onBlockClick : undefined}
            />
          ))}

          {paginas.length === 0 && (
            <Pagina
              ref={(el) => { pageRefs.current[0] = el }}
              html=""
              numero={displayNum(0)}
              largura={larguraPagina}
              altura={alturaPagina}
              margins={margins}
              scale={scale}
              fontCss={fontCss}
              footnotes={[]}
            />
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-background/50 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {paginas.length} {paginas.length === 1 ? 'página' : 'páginas'}
            {modoVisualizacao === 'capitulo' && pageOffset > 0 && ` · começa na ${isNumbered ? pageOffset + 1 : toRoman(pageOffset + 1)}`}
            {modoVisualizacao === 'livro' && ` · livro completo`}
          </span>
          <span className="text-xs text-muted-foreground">{dims.label}</span>
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// PaginaAbertura (intercapa)
// ---------------------------------------------------------------------------

interface PaginaAberturaProps {
  chapter: Chapter
  chapterNumber: number | null
  largura: number
  altura: number
  scale: number
  fontCss: string
}

function PaginaAbertura({ chapter, chapterNumber, largura, altura, scale, fontCss }: PaginaAberturaProps) {
  const { opening_style, opening_image, opening_epigraph, opening_epigraph_author, title } = chapter
  const fs = (n: number) => n * scale
  const numLabel = chapterNumber !== null ? `Capítulo ${chapterNumber}` : null

  const baseStyle: React.CSSProperties = {
    width: largura, height: altura, position: 'relative', overflow: 'hidden', flexShrink: 0,
  }

  if (opening_style === 'simples') {
    return (
      <div className="shadow-xl rounded-sm" style={{ ...baseStyle, background: '#faf8f0' }}>
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
      <div className="shadow-xl rounded-sm" style={{ ...baseStyle, background: '#faf8f0' }}>
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
    const imgHeight = altura * 0.55
    return (
      <div className="shadow-xl rounded-sm" style={{ ...baseStyle, background: '#faf8f0' }}>
        <div style={{ height: imgHeight, overflow: 'hidden', background: 'linear-gradient(135deg, #e8e0d0 0%, #d0c4a8 100%)' }}>
          {opening_image
            ? <img src={opening_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: fs(8), color: '#b0a080', fontStyle: 'italic', fontFamily: fontCss }}>Imagem do capítulo</p></div>
          }
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: altura - imgHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: fontCss, gap: fs(4) }}>
          {numLabel && <p style={{ fontSize: fs(8), letterSpacing: '0.12em', color: '#999', textTransform: 'uppercase' }}>{numLabel}</p>}
          <p style={{ fontSize: fs(14), color: '#1a1a1a' }}>{title}</p>
        </div>
      </div>
    )
  }

  if (opening_style === 'pagina-inteira') {
    return (
      <div className="shadow-xl rounded-sm" style={{ ...baseStyle, background: '#1a1510' }}>
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

  return null
}

// ---------------------------------------------------------------------------
// Pagina (página individual)
// ---------------------------------------------------------------------------

interface PaginaProps {
  html: string
  numero: string     // já formatado (árabe ou romano)
  largura: number
  altura: number
  margins: { top: number; right: number; bottom: number; left: number }
  scale: number
  fontCss: string
  footnotes: FootnoteEntry[]
  startBlock?: number
  onBlockClick?: (blockIndex: number) => void
}

const Pagina = forwardRef<HTMLDivElement, PaginaProps>(function Pagina(
  { html, numero, largura, altura, margins, scale, fontCss, footnotes, startBlock = 0, onBlockClick },
  ref
) {
  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onBlockClick) return
    const container = e.currentTarget
    const children = Array.from(container.children)
    const idx = children.findIndex(child => child.contains(e.target as Node))
    if (idx >= 0) onBlockClick(startBlock + idx)
  }
  const fnHeight = footnotes.length > 0
    ? (footnotes.length * 13 * scale) + (8 * scale)  // estimativa: ~13px por nota + separador
    : 0

  return (
    <div
      ref={ref}
      className="relative shrink-0 shadow-xl rounded-sm"
      style={{ width: largura, height: altura, background: '#faf8f0' }}
    >
      {/* Conteúdo principal */}
      <div
        className="book-page-content absolute overflow-hidden"
        style={{
          top: margins.top * scale,
          right: margins.right * scale,
          bottom: margins.bottom * scale + fnHeight,
          left: margins.left * scale,
          fontFamily: fontCss,
          fontSize: 11 * scale,
          lineHeight: 1.8,
          color: '#1a1a1a',
          cursor: onBlockClick ? 'pointer' : undefined,
        }}
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{
          __html: html || '<p style="color:#bbb;font-style:italic">Seu texto aparecerá aqui...</p>',
        }}
      />

      {/* Rodapé / Notas de rodapé */}
      {footnotes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: margins.bottom * scale,
            left: margins.left * scale,
            right: margins.right * scale,
            borderTop: `${0.5 * scale}px solid #bbb`,
            paddingTop: 4 * scale,
            background: '#faf8f0',  // cobre eventual overflow do conteúdo
          }}
        >
          {footnotes.map(fn => (
            <div
              key={fn.num}
              style={{
                fontSize: 8.5 * scale,
                lineHeight: 1.5,
                color: '#444',
                display: 'flex',
                gap: 3 * scale,
                marginBottom: 2 * scale,
                fontFamily: fontCss,
              }}
            >
              <span style={{ flexShrink: 0, fontWeight: 600 }}>[{fn.num}]</span>
              <span dangerouslySetInnerHTML={{ __html: fn.html }} />
            </div>
          ))}
        </div>
      )}

      {/* Número de página */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center"
        style={{ paddingBottom: (margins.bottom * scale) / 3, fontSize: 9 * scale, color: '#888' }}
      >
        {numero}
      </div>
    </div>
  )
})
