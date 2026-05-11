'use client'

import { useState } from 'react'
import { useEditorStore } from '@/lib/store/editorStore'
import { getFontById } from '@/lib/fonts'
import { Button } from '@/components/ui/button'
import { Download, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { paginarParaExport, buildReviewHtml, buildPrintHtml, exportarPdfServidor } from '@/lib/exportBook'

export function ExportarLivro() {
  const { activeBook, chapters } = useEditorStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null)

  if (!activeBook) return null

  const isPublished = activeBook.status === 'publicado'

  async function handlePdf() {
    setMenuOpen(false)
    try {
      const font = getFontById(activeBook!.body_font)
      let html: string

      if (isPublished) {
        setLoadingMsg('Paginando...')
        const pages = await paginarParaExport(chapters, activeBook!.format, font.css)
        html = buildPrintHtml(
          pages,
          activeBook!.title,
          activeBook!.format,
          activeBook!.body_font,
          activeBook!.custom_fonts ?? [],
          activeBook!.cover_url,
          activeBook!.back_cover_url,
        )
      } else {
        setLoadingMsg('Gerando...')
        html = buildReviewHtml(
          chapters,
          activeBook!.title,
          activeBook!.author,
          activeBook!.body_font,
          activeBook!.custom_fonts ?? [],
          activeBook!.cover_url,
          activeBook!.back_cover_url,
        )
      }

      setLoadingMsg('Gerando PDF...')
      await exportarPdfServidor(html, activeBook!.title)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Erro ao gerar PDF')
    } finally {
      setLoadingMsg(null)
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
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-background border border-border rounded-xl shadow-xl py-1 w-60 overflow-hidden">
            <button
              onClick={handlePdf}
              disabled={!!loadingMsg}
              className="flex items-start gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors w-full text-left disabled:opacity-50"
            >
              <FileText size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-medium leading-tight">
                  {loadingMsg
                    ? loadingMsg
                    : (isPublished ? 'Exportar PDF' : 'Exportar PDF de revisão')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {isPublished
                    ? 'Layout final com capa e diagramação'
                    : 'Texto corrido para revisar o conteúdo'}
                </p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
