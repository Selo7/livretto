'use client'

import { Fragment, forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { PanelRightClose, PanelRightOpen, ZoomIn, ZoomOut } from 'lucide-react'
import { useEditorStore } from '@/lib/store/editorStore'
import { BookFormat } from '@/types/book'
import { AreaLabel } from '@/components/ui/area-label'
import { Button } from '@/components/ui/button'
import { ConfiguracaoLivro } from './ConfiguracaoLivro'
import { Chapter } from '@/types/book'
import { getFontById } from '@/lib/fonts'

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

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PaginaData {
  html: string
  startBlock: number
  endBlock: number
  footnotes: FootnoteEntry[]
  chapterIdx: number
}

interface PagePreviewProps {
  content: string
  width?: number
  cursorBlockIndex?: number
  onBlockClick?: (blockIndex: number) => void
  onChapterClick?: (chapter: Chapter, localBlockIdx: number) => void
  onKeyCommand?: (cmd: 'enter' | 'backspace' | 'delete') => void
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PagePreview({ content, width = 420, cursorBlockIndex = 0, onBlockClick, onChapterClick, onKeyCommand }: PagePreviewProps) {
  const {
    activeBook, activeChapter, chapters, setActiveChapter: setActiveChapterStore,
    isFocusMode, isPreviewOpen, togglePreview,
  } = useEditorStore()

  const fontCss = getFontById(activeBook?.body_font).css
  const [paginas, setPaginas] = useState<PaginaData[]>([])
  const [zoomFactor, setZoomFactor] = useState(1.0)
  const medidorRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastScrollKeyRef = useRef('')
  const activeChapterStartBlockRef = useRef(0)

  const format = activeBook?.format ?? '14x21'
  const dims = formatDimensions[format]
  const margins = formatMargins[format]
  const baseScale = Math.min(0.85, (width * 0.88) / dims.width)
  const scale = baseScale * zoomFactor

  const ZOOM_STEPS = [0.5, 0.65, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0]
  const zoomIn  = () => setZoomFactor(v => ZOOM_STEPS.find(z => z > v + 0.01) ?? v)
  const zoomOut = () => setZoomFactor(v => [...ZOOM_STEPS].reverse().find(z => z < v - 0.01) ?? v)

  const larguraPagina = dims.width * scale
  const alturaPagina = dims.height * scale
  const alturaUtil = (dims.height - margins.top - margins.bottom) * scale
  const larguraUtil = (dims.width - margins.left - margins.right) * scale

  const htmlParaPaginar = useMemo(() => {
    if (chapters.length === 0) return content
    return chapters
      .map((c, i) => {
        const html = c.id === activeChapter?.id ? content : (c.content_html || '')
        return (i === 0 ? '' : '<hr data-chapter-sep="true"/>') + html
      })
      .join('')
  }, [content, chapters, activeChapter?.id])

  // ---------------------------------------------------------------------------
  // Paginação — motor baseado em scrollHeight (layout real do browser, como o Word)
  //
  // Em vez de somar offsetHeight+16 (aproximação imprecisa que ignora margens CSS,
  // colapso de margens e tamanho mínimo de fonte do browser), adicionamos cada
  // elemento ao medidor e verificamos o scrollHeight real depois de cada adição.
  // O browser faz o layout completo — fonte, line-height, padding, margens — e
  // reporta a altura real. Isso é exatamente o modelo do Word/InDesign.
  //
  // Margem de segurança: 1 cm (38 px a 96 dpi, escalado) abaixo do conteúdo,
  // garantindo que texto nunca toque a linha de margem inferior.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!htmlParaPaginar || !medidorRef.current) {
      setPaginas([{ html: '', startBlock: 0, endBlock: 0, footnotes: [], chapterIdx: 0 }])
      return
    }

    const medidor = medidorRef.current

    const runLayout = () => {
      if (!medidorRef.current) return

      // Build footnote map — prefer activeChapter's fresh footnotes over stale chapters array
      const footnoteMap = new Map<number, string>()
      for (const c of chapters) {
        const fns = c.id === activeChapter?.id
          ? (activeChapter.footnotes ?? c.footnotes ?? [])
          : (c.footnotes ?? [])
        for (const f of fns) footnoteMap.set(f.num, f.content)
      }
      // Ensure active chapter footnotes are always included even if chapters array is stale
      for (const f of activeChapter?.footnotes ?? []) footnoteMap.set(f.num, f.content)

      // Calcula offset global do capítulo ativo (para sincronizar scroll do cursor)
      let blockCount = 0
      for (let i = 0; i < chapters.length; i++) {
        const c = chapters[i]
        if (i > 0) blockCount++
        if (c.id === activeChapter?.id) { activeChapterStartBlockRef.current = blockCount; break }
        const tmp = document.createElement('div')
        tmp.innerHTML = c.content_html || ''
        blockCount += tmp.children.length
      }

      // Configura o medidor com os mesmos estilos da página real
      medidor.style.width = `${larguraUtil}px`
      medidor.style.fontSize = `${11 * scale}px`
      medidor.style.lineHeight = '1.8'
      medidor.style.fontFamily = fontCss

      // Parseia todo o HTML de uma vez para obter os nós DOM, depois limpa o medidor
      medidor.innerHTML = htmlParaPaginar
      const allNodes = Array.from(medidor.childNodes)
      medidor.innerHTML = ''

      // Margem de segurança mínima para absorver erros de arredondamento.
      // A margem inferior da página (margins.bottom) já reserva espaço visual suficiente.
      const SAFETY = 4 * scale
      const pageLimit = alturaUtil - SAFETY

      const paginasGeradas: PaginaData[] = []
      let htmlAtual = ''
      let blockNum = 0
      let startBlock = 0
      let chapterIdx = 0
      let lastElHtml = ''
      let lastElTag = ''

      const finalizarPagina = (html: string, start: number, end: number) => {
        const cits = findCitations(html)
        const footnotes: FootnoteEntry[] = cits
          .filter(n => footnoteMap.has(n))
          .map(n => ({ num: n, html: footnoteMap.get(n)! }))
        paginasGeradas.push({ html, startBlock: start, endBlock: end, footnotes, chapterIdx })
      }

      for (const no of allNodes) {
        if (!(no instanceof Element)) continue
        const el = no as HTMLElement

        if (el.tagName === 'HR' && el.dataset.chapterSep === 'true') {
          finalizarPagina(htmlAtual || '', startBlock, blockNum)
          htmlAtual = ''
          medidor.innerHTML = ''
          blockNum++
          startBlock = blockNum
          chapterIdx++
          lastElHtml = ''
          lastElTag = ''
          continue
        }

        // HR de conteúdo = quebra de página manual
        if (el.tagName === 'HR') {
          if (htmlAtual) finalizarPagina(htmlAtual, startBlock, blockNum - 1)
          htmlAtual = ''
          medidor.innerHTML = ''
          startBlock = blockNum + 1
          lastElHtml = ''
          lastElTag = ''
          blockNum++
          continue
        }

        // Adiciona o elemento ao medidor e mede a altura real resultante
        const clone = el.cloneNode(true) as HTMLElement
        medidor.appendChild(clone)

        if (medidor.scrollHeight > pageLimit && htmlAtual) {
          // Elemento ultrapassa o limite — remove e fecha a página atual
          medidor.removeChild(clone)
          // Página "curta": menos de ~4 linhas — trata igual ao caso do heading sozinho
          const isShortPage = medidor.scrollHeight < 11 * scale * 1.8 * 4

          // Anti-orphan: título no fim ou sozinho na página → mantém com o próximo elemento
          if (/^H[1-3]$/.test(lastElTag) && htmlAtual.length > lastElHtml.length) {
            // Título no fim de página com conteúdo anterior — puxa título+próximo para a próxima
            const semTitulo = htmlAtual.slice(0, -lastElHtml.length)
            finalizarPagina(semTitulo, startBlock, blockNum - 2)
            htmlAtual = lastElHtml + el.outerHTML
            startBlock = blockNum - 1
          } else if (/^H[1-3]$/.test(lastElTag) || isShortPage) {
            // Título sozinho OU página muito curta — força o próximo elemento na mesma página
            htmlAtual += el.outerHTML
            finalizarPagina(htmlAtual, startBlock, blockNum)
            htmlAtual = ''
            startBlock = blockNum + 1
          } else {
            finalizarPagina(htmlAtual, startBlock, blockNum - 1)
            htmlAtual = el.outerHTML
            startBlock = blockNum
          }
          // Reinicia o medidor com o conteúdo da nova página
          medidor.innerHTML = htmlAtual
          lastElHtml = el.outerHTML
          lastElTag = el.tagName
        } else {
          htmlAtual += el.outerHTML
          lastElHtml = el.outerHTML
          lastElTag = el.tagName
        }
        blockNum++
      }

      if (htmlAtual) finalizarPagina(htmlAtual, startBlock, blockNum - 1)
      if (paginasGeradas.length === 0) {
        paginasGeradas.push({ html: '', startBlock: 0, endBlock: 0, footnotes: [], chapterIdx: 0 })
      }

      setPaginas(paginasGeradas)
    }

    // Aguarda as fontes carregarem antes de medir — elimina erros de tamanho com web fonts
    document.fonts.ready.then(runLayout)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlParaPaginar, format, alturaUtil, larguraUtil, scale, fontCss, activeChapter?.footnotes, chapters])

  // ---------------------------------------------------------------------------
  // Numeração global de páginas
  // ---------------------------------------------------------------------------
  function displayNum(pageIdx: number): string {
    return String(pageIdx + 1)
  }

  // ---------------------------------------------------------------------------
  // Scroll automático para página do cursor
  // Usa chave composta cursor:páginaAlvo para rolar sempre que o cursor muda
  // OU quando a paginação muda e o cursor passa para uma página diferente.
  // Isso evita o race condition onde cursorBlockIndex muda com paginas antigas
  // e o scroll ficava preso na página errada após o Enter.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPreviewOpen || paginas.length === 0) return
    const globalBlock = activeChapterStartBlockRef.current + cursorBlockIndex
    const targetIdx = paginas.findIndex(
      p => globalBlock >= p.startBlock && globalBlock <= p.endBlock
    )
    if (targetIdx < 0) return
    const key = `${cursorBlockIndex}:${targetIdx}`
    if (key === lastScrollKeyRef.current) return
    lastScrollKeyRef.current = key
    pageRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [cursorBlockIndex, paginas, isPreviewOpen])

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
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{dims.label}</span>

            {/* Zoom controls */}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut}
              disabled={zoomFactor <= ZOOM_STEPS[0]} title="Reduzir zoom">
              <ZoomOut size={11} />
            </Button>
            <button
              onClick={() => setZoomFactor(1.0)}
              className="text-[10px] text-muted-foreground hover:text-foreground min-w-[34px] text-center tabular-nums transition-colors"
              title="Resetar zoom"
            >
              {Math.round(zoomFactor * 100)}%
            </button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn}
              disabled={zoomFactor >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} title="Aumentar zoom">
              <ZoomIn size={11} />
            </Button>

            <ConfiguracaoLivro />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePreview} title="Ocultar visualizador">
              <PanelRightClose size={14} />
            </Button>
          </div>
        </div>

        {/* Scroll area — overflow-x: auto permite rolagem horizontal quando zoom > 100% */}
        <div
          ref={scrollAreaRef}
          tabIndex={0}
          className="flex-1 overflow-auto outline-none"
          onClick={() => scrollAreaRef.current?.focus()}
          onKeyDown={(e) => {
            if (!onKeyCommand) return
            if (e.key === 'Enter') { e.preventDefault(); onKeyCommand('enter') }
            else if (e.key === 'Backspace') { e.preventDefault(); onKeyCommand('backspace') }
            else if (e.key === 'Delete') { e.preventDefault(); onKeyCommand('delete') }
          }}
        >
          {/* Wrapper interno — min-w-full garante centralização quando páginas cabem;
              w-fit expande para rolagem horizontal quando zoom aumenta as páginas */}
          <div className="flex flex-col items-center py-8 px-4 gap-8" style={{ minWidth: '100%', width: 'fit-content', margin: '0 auto' }}>

          {activeBook?.cover_url && (
            <PaginaCapa
              coverUrl={activeBook.cover_url}
              largura={larguraPagina}
              altura={alturaPagina}
            />
          )}

          {paginas.map((p, i) => {
            const isFirstOfChapter = i === 0 || paginas[i - 1].chapterIdx !== p.chapterIdx
            const chapterForOpening = chapters[p.chapterIdx]
            return (
              <Fragment key={i}>
                {isFirstOfChapter && chapterForOpening?.opening_style && chapterForOpening.opening_style !== 'nenhum' && (
                  <PaginaAbertura
                    chapter={chapterForOpening}
                    largura={larguraPagina}
                    altura={alturaPagina}
                    scale={scale}
                    fontCss={fontCss}
                  />
                )}
                <Pagina
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
                  activeCursorBlock={activeChapterStartBlockRef.current + cursorBlockIndex}
                  onBlockClick={(globalIdx) => {
                    const pageChapter = chapters[p.chapterIdx]
                    if (pageChapter && pageChapter.id !== activeChapter?.id) {
                      // Outro capítulo: calcula bloco local dentro desse capítulo
                      const firstPage = paginas.find(pg => pg.chapterIdx === p.chapterIdx)
                      const chapterStart = firstPage?.startBlock ?? 0
                      const localIdx = Math.max(0, globalIdx - chapterStart)
                      if (onChapterClick) {
                        onChapterClick(pageChapter, localIdx)
                      } else {
                        setActiveChapterStore(pageChapter)
                      }
                    } else if (onBlockClick) {
                      const localIdx = globalIdx - activeChapterStartBlockRef.current
                      if (localIdx >= 0) onBlockClick(localIdx)
                    }
                  }}
                />
              </Fragment>
            )
          })}

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
              activeCursorBlock={cursorBlockIndex}
            />
          )}

          {activeBook?.back_cover_url && (
            <PaginaCapa
              coverUrl={activeBook.back_cover_url}
              largura={larguraPagina}
              altura={alturaPagina}
            />
          )}

          </div>{/* end inner wrapper */}
        </div>

        <div className="px-4 py-2 border-t border-border bg-background/50 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {paginas.length} {paginas.length === 1 ? 'página' : 'páginas'} · livro completo
          </span>
          <span className="text-xs text-muted-foreground">{dims.label}</span>
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// PaginaCapa (capa do livro — primeira página, sem numeração)
// ---------------------------------------------------------------------------

function PaginaCapa({ coverUrl, largura, altura }: { coverUrl: string; largura: number; altura: number }) {
  return (
    <div
      className="relative shrink-0 shadow-xl rounded-sm overflow-hidden"
      style={{ width: largura, height: altura }}
    >
      <img
        src={coverUrl}
        alt="Capa"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// PaginaAbertura (intercapa)
// ---------------------------------------------------------------------------

interface PaginaAberturaProps {
  chapter: Chapter
  largura: number
  altura: number
  scale: number
  fontCss: string
}

function PaginaAbertura({ chapter, largura, altura, scale, fontCss }: PaginaAberturaProps) {
  const { opening_style, opening_image, opening_epigraph, opening_epigraph_author, title } = chapter
  const fs = (n: number) => n * scale
  const numLabel = chapter.chapter_num?.trim() ? `Capítulo ${chapter.chapter_num.trim()}` : null

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
  numero: string
  largura: number
  altura: number
  margins: { top: number; right: number; bottom: number; left: number }
  scale: number
  fontCss: string
  footnotes: FootnoteEntry[]
  startBlock?: number
  activeCursorBlock?: number
  onBlockClick?: (blockIndex: number) => void
}

const Pagina = forwardRef<HTMLDivElement, PaginaProps>(function Pagina(
  { html, numero, largura, altura, margins, scale, fontCss, footnotes, startBlock = 0, activeCursorBlock, onBlockClick },
  ref
) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el || activeCursorBlock === undefined) return
    const localIdx = activeCursorBlock - startBlock
    Array.from(el.children).forEach((child, i) => {
      const h = child as HTMLElement
      if (i === localIdx) {
        h.style.borderLeft = '2px solid rgba(99,102,241,0.35)'
        h.style.paddingLeft = '5px'
        h.style.marginLeft = '-7px'
        h.style.backgroundColor = 'rgba(99,102,241,0.03)'
      } else {
        h.style.borderLeft = ''
        h.style.paddingLeft = ''
        h.style.marginLeft = ''
        h.style.backgroundColor = ''
      }
    })
  }, [activeCursorBlock, startBlock, html])

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const container = e.currentTarget
    const children = Array.from(container.children)
    const idx = children.findIndex(child => child.contains(e.target as Node))
    if (idx >= 0 && onBlockClick) onBlockClick(startBlock + idx)
  }

  // Área reservada para rodapés: separador (8px) + gap de 1cm (38px) + ~24px por nota
  // O gap de 1cm garante que o texto principal nunca toque a área de rodapé
  const fnHeight = footnotes.length > 0
    ? (46 * scale) + (footnotes.length * 24 * scale)
    : 0

  return (
    <div
      ref={ref}
      className="relative shrink-0 shadow-xl rounded-sm"
      style={{ width: largura, height: altura, background: '#faf8f0' }}
    >
      {/* Conteúdo principal */}
      <div
        ref={contentRef}
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
          cursor: 'pointer',
        }}
        onClick={handleContentClick}
        dangerouslySetInnerHTML={{
          __html: html
            ? html.replace(/\[(\d+)\]/g, '<sup style="color:#c8720a;font-size:0.72em;vertical-align:super;font-weight:600">[$1]</sup>')
            : '<p style="color:#bbb;font-style:italic">Seu texto aparecerá aqui...</p>',
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
            background: '#faf8f0',
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
