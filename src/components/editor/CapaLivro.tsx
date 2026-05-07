'use client'

import { useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ImageIcon, X, Upload, CheckCircle, Trash2, SplitSquareHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { createClient } from '@/lib/supabase/client'
import { updateBook as updateBookService } from '@/lib/services/books'
import { BookFormat } from '@/types/book'

const FORMAT_INFO: Record<BookFormat, { label: string; cm: string; px: string; w: number; h: number }> = {
  '14x21':  { label: '14 × 21 cm',  cm: '14 × 21 cm',   px: '1.654 × 2.480 px', w: 1654, h: 2480 },
  '15x23':  { label: '15 × 23 cm',  cm: '15 × 23 cm',   px: '1.772 × 2.717 px', w: 1772, h: 2717 },
  'a5':     { label: 'A5',           cm: '14,8 × 21 cm', px: '1.748 × 2.480 px', w: 1748, h: 2480 },
  'pocket': { label: 'Bolso',        cm: '10,5 × 17 cm', px: '1.240 × 2.008 px', w: 1240, h: 2008 },
  'abnt':   { label: 'A4 ABNT',      cm: '21 × 29,7 cm', px: '2.480 × 3.508 px', w: 2480, h: 3508 },
}

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
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = reject
    img.src = url
  })
}

/** Divide uma imagem de spread (frente+verso lado a lado) em duas metades.
 *  Convenção: metade DIREITA = capa (frente), metade ESQUERDA = contracapa (verso). */
function dividirSpread(file: File): Promise<{ frente: string; verso: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const halfW = Math.floor(img.width / 2)
      const h = img.height

      const canvasFrente = document.createElement('canvas')
      canvasFrente.width = halfW; canvasFrente.height = h
      canvasFrente.getContext('2d')!.drawImage(img, halfW, 0, halfW, h, 0, 0, halfW, h)

      const canvasVerso = document.createElement('canvas')
      canvasVerso.width = halfW; canvasVerso.height = h
      canvasVerso.getContext('2d')!.drawImage(img, 0, 0, halfW, h, 0, 0, halfW, h)

      resolve({
        frente: canvasFrente.toDataURL('image/jpeg', 0.88),
        verso: canvasVerso.toDataURL('image/jpeg', 0.88),
      })
    }
    img.onerror = reject
    img.src = url
  })
}

type Aba = 'frente' | 'verso' | 'spread'
type Estado = 'idle' | 'arrastando' | 'processando' | 'sucesso'

export function CapaLivro() {
  const { activeBook, updateBook } = useEditorStore()
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<Aba>('frente')
  const [arrastando, setArrastando] = useState(false)
  const [estado, setEstado] = useState<Estado>('idle')
  const inputFrente = useRef<HTMLInputElement>(null)
  const inputVerso = useRef<HTMLInputElement>(null)
  const inputSpread = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const format = (activeBook?.format ?? '14x21') as BookFormat
  const info = FORMAT_INFO[format]
  const coverUrl = activeBook?.cover_url
  const backCoverUrl = activeBook?.back_cover_url

  async function salvar(patch: { cover_url?: string; back_cover_url?: string }) {
    if (!activeBook) return
    setEstado('processando')
    updateBook(patch)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const ts = new Date().toISOString()
        // Salva cada campo separadamente para que falha em um não bloqueie o outro
        if (patch.cover_url !== undefined) {
          await updateBookService(activeBook.id, { cover_url: patch.cover_url, updated_at: ts }).catch(() => {})
        }
        if (patch.back_cover_url !== undefined) {
          await updateBookService(activeBook.id, { back_cover_url: patch.back_cover_url, updated_at: ts }).catch(() => {})
        }
      }
    } catch { /* offline */ }
    setEstado('sucesso')
    setTimeout(() => { setEstado('idle'); setAberto(false) }, 1000)
  }

  async function processarUnica(file: File, tipo: 'frente' | 'verso') {
    setEstado('processando')
    try {
      const dataUrl = await comprimirImagem(file, info.w, info.h)
      await salvar(tipo === 'frente' ? { cover_url: dataUrl } : { back_cover_url: dataUrl })
    } catch { setEstado('idle') }
  }

  async function processarSpread(file: File) {
    setEstado('processando')
    try {
      const { frente, verso } = await dividirSpread(file)
      await salvar({ cover_url: frente, back_cover_url: verso })
    } catch { setEstado('idle') }
  }

  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>, tipo: 'frente' | 'verso' | 'spread') {
    const f = e.target.files?.[0]; if (!f) return
    e.target.value = ''
    if (tipo === 'spread') processarSpread(f)
    else processarUnica(f, tipo)
  }

  function onDrop(e: React.DragEvent, tipo: 'frente' | 'verso' | 'spread') {
    e.preventDefault(); setArrastando(false)
    const f = e.dataTransfer.files[0]
    if (!f || !f.type.startsWith('image/')) return
    if (tipo === 'spread') processarSpread(f)
    else processarUnica(f, tipo)
  }

  const processando = estado === 'processando'
  const sucesso = estado === 'sucesso'

  const abaClass = (a: Aba) =>
    `text-[11px] px-3 py-1 rounded transition-colors ${aba === a ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-accent'}`

  return (
    <>
      {/* Item no sidebar */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group transition-colors"
        onClick={() => setAberto(true)}
      >
        <div className="flex gap-0.5 shrink-0">
          <div className="w-5 h-7 rounded-sm border border-border overflow-hidden bg-muted flex items-center justify-center">
            {coverUrl
              ? <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
              : <ImageIcon size={8} className="text-muted-foreground/40" />
            }
          </div>
          <div className="w-5 h-7 rounded-sm border border-border overflow-hidden bg-muted flex items-center justify-center">
            {backCoverUrl
              ? <img src={backCoverUrl} alt="Contracapa" className="w-full h-full object-cover" />
              : <ImageIcon size={8} className="text-muted-foreground/40" />
            }
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium">Capa / Contracapa</p>
          <p className="text-xs text-muted-foreground/50">
            {coverUrl && backCoverUrl ? 'Ambas definidas' : coverUrl ? 'Só a capa' : backCoverUrl ? 'Só a contracapa' : 'Adicionar imagens'}
          </p>
        </div>
      </div>

      {/* Modal */}
      {aberto && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

            <div className="flex items-start justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-sm">Capa e contracapa</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Formato: {info.label} · {info.px} · 300 DPI</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(false)}>
                <X size={14} />
              </Button>
            </div>

            {/* Abas */}
            <div className="flex items-center gap-1 px-5 pt-4 pb-0">
              <button className={abaClass('frente')} onClick={() => setAba('frente')}>Capa (frente)</button>
              <button className={abaClass('verso')} onClick={() => setAba('verso')}>Contracapa (verso)</button>
              <button className={abaClass('spread')} onClick={() => setAba('spread')}>
                <span className="flex items-center gap-1"><SplitSquareHorizontal size={11} />Arquivo único</span>
              </button>
            </div>

            <div className="p-5">
              {sucesso ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle size={32} className="text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Salvo com sucesso!</p>
                </div>
              ) : processando ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {aba === 'spread' ? 'Dividindo o arquivo...' : 'Processando imagem...'}
                  </p>
                </div>
              ) : aba === 'spread' ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Como funciona</p>
                    <p>Suba uma imagem com <strong>capa e contracapa lado a lado</strong> (spread completo).</p>
                    <p>O editor divide ao meio automaticamente: <strong>metade direita = capa frontal</strong>, <strong>metade esquerda = contracapa</strong>.</p>
                    <p className="opacity-70">Tamanho recomendado: {info.w * 2} × {info.h} px (dois {info.cm} lado a lado)</p>
                  </div>
                  <DropZone
                    arrastando={arrastando}
                    onDragOver={() => setArrastando(true)}
                    onDragLeave={() => setArrastando(false)}
                    onDrop={(e) => onDrop(e, 'spread')}
                    onClick={() => inputSpread.current?.click()}
                    label="Arraste o spread aqui"
                    sublabel="frente + verso em um único arquivo"
                    icon={<SplitSquareHorizontal size={28} className="mx-auto mb-2 text-muted-foreground" />}
                  />
                  <input ref={inputSpread} type="file" accept="image/*" className="hidden" onChange={(e) => onArquivoSelecionado(e, 'spread')} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/40 border border-border px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{aba === 'frente' ? 'Capa frontal' : 'Contracapa'}</span>
                    {' — '}{info.px} · {info.cm} · 300 DPI recomendado
                  </div>
                  <div className="flex gap-4">
                    {/* Preview atual */}
                    {(aba === 'frente' ? coverUrl : backCoverUrl) && (
                      <div className="relative shrink-0">
                        <img
                          src={aba === 'frente' ? coverUrl! : backCoverUrl!}
                          alt={aba === 'frente' ? 'Capa' : 'Contracapa'}
                          className="w-20 rounded-md border border-border shadow-sm object-cover"
                          style={{ aspectRatio: `${info.w}/${info.h}` }}
                        />
                        <button
                          onClick={() => { updateBook(aba === 'frente' ? { cover_url: undefined } : { back_cover_url: undefined }) }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    )}
                    <DropZone
                      arrastando={arrastando}
                      onDragOver={() => setArrastando(true)}
                      onDragLeave={() => setArrastando(false)}
                      onDrop={(e) => onDrop(e, aba)}
                      onClick={() => (aba === 'frente' ? inputFrente : inputVerso).current?.click()}
                      label={(aba === 'frente' ? coverUrl : backCoverUrl) ? 'Substituir' : 'Arraste a imagem aqui'}
                      sublabel="ou clique para selecionar"
                    />
                  </div>
                  <input ref={inputFrente} type="file" accept="image/*" className="hidden" onChange={(e) => onArquivoSelecionado(e, 'frente')} />
                  <input ref={inputVerso} type="file" accept="image/*" className="hidden" onChange={(e) => onArquivoSelecionado(e, 'verso')} />
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

function DropZone({ arrastando, onDragOver, onDragLeave, onDrop, onClick, label, sublabel, icon }: {
  arrastando: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  label: string
  sublabel: string
  icon?: React.ReactNode
}) {
  return (
    <div
      className={`flex-1 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
        arrastando ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      {icon ?? <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />}
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{sublabel}</p>
    </div>
  )
}
