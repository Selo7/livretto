'use client'

import { useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ImageIcon, X, Upload, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { createClient } from '@/lib/supabase/client'
import { updateBook as updateBookService } from '@/lib/services/books'
import { BookFormat } from '@/types/book'

// Dimensões físicas por formato (cm) e pixels recomendados a 300 DPI
const FORMAT_INFO: Record<BookFormat, { label: string; cm: string; px: string; w: number; h: number }> = {
  '14x21':  { label: '14 × 21 cm',  cm: '14 × 21 cm',   px: '1.654 × 2.480 px', w: 1654, h: 2480 },
  '15x23':  { label: '15 × 23 cm',  cm: '15 × 23 cm',   px: '1.772 × 2.717 px', w: 1772, h: 2717 },
  'a5':     { label: 'A5',           cm: '14,8 × 21 cm', px: '1.748 × 2.480 px', w: 1748, h: 2480 },
  'pocket': { label: 'Bolso',        cm: '10,5 × 17 cm', px: '1.240 × 2.008 px', w: 1240, h: 2008 },
  'abnt':   { label: 'A4 ABNT',      cm: '21 × 29,7 cm', px: '2.480 × 3.508 px', w: 2480, h: 3508 },
}

/** Comprime e redimensiona para no máximo maxW×maxH mantendo proporção, retorna data URL JPEG. */
function comprimirImagem(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = reject
    img.src = url
  })
}

export function CapaLivro() {
  const { activeBook, updateBook } = useEditorStore()
  const [aberto, setAberto] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const format = (activeBook?.format ?? '14x21') as BookFormat
  const info = FORMAT_INFO[format]
  const coverUrl = activeBook?.cover_url

  async function processarArquivo(file: File) {
    if (!activeBook) return
    setSalvando(true)
    try {
      const dataUrl = await comprimirImagem(file, info.w, info.h)
      updateBook({ cover_url: dataUrl })
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await updateBookService(activeBook.id, { cover_url: dataUrl, updated_at: new Date().toISOString() })
      } catch { /* offline */ }
      setSucesso(true)
      setTimeout(() => { setSucesso(false); setAberto(false) }, 1200)
    } catch {
      // erro silencioso
    } finally {
      setSalvando(false)
    }
  }

  async function removerCapa() {
    if (!activeBook) return
    updateBook({ cover_url: undefined })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await updateBookService(activeBook.id, { cover_url: undefined, updated_at: new Date().toISOString() })
    } catch { /* offline */ }
  }

  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processarArquivo(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setArrastando(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) processarArquivo(f)
  }

  return (
    <>
      {/* Item fixo no sidebar */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group transition-colors"
        onClick={() => setAberto(true)}
      >
        <div className="w-6 h-8 rounded-sm border border-border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
          {coverUrl
            ? <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
            : <ImageIcon size={10} className="text-muted-foreground/50" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">Capa do livro</p>
          <p className="text-xs text-muted-foreground/50">{coverUrl ? 'Alterar imagem' : 'Adicionar imagem'}</p>
        </div>
      </div>

      {/* Modal */}
      {aberto && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

            {/* Cabeçalho */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-sm">Capa do livro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Formato: {info.label} ({info.cm})</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(false)}>
                <X size={14} />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {/* Orientação de tamanho */}
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 space-y-1">
                <p className="text-xs font-medium">Tamanho recomendado para impressão</p>
                <p className="text-sm font-semibold text-primary">{info.px}</p>
                <p className="text-[11px] text-muted-foreground">300 DPI · proporção {info.cm} · JPEG ou PNG</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Imagens menores serão aceitas mas podem ficar pixeladas na impressão.
                </p>
              </div>

              {/* Área de upload */}
              {sucesso ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle size={32} className="text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Capa salva!</p>
                </div>
              ) : salvando ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando imagem...</p>
                </div>
              ) : (
                <div className="flex gap-4">
                  {/* Preview atual */}
                  {coverUrl && (
                    <div className="relative shrink-0">
                      <img
                        src={coverUrl}
                        alt="Capa atual"
                        className="w-20 rounded-md border border-border shadow-sm object-cover"
                        style={{ aspectRatio: `${info.w}/${info.h}` }}
                      />
                      <button
                        onClick={removerCapa}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                        title="Remover capa"
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  )}

                  {/* Drop zone */}
                  <div
                    className={`flex-1 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                      arrastando ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
                    onDragLeave={() => setArrastando(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs font-medium">{coverUrl ? 'Substituir capa' : 'Arraste a imagem aqui'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">ou clique para selecionar</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onArquivoSelecionado}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setAberto(false)}>Fechar</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
