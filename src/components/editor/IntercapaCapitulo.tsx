'use client'

import { useRef, useState } from 'react'
import { Chapter, ChapterOpeningStyle } from '@/types/book'
import { useEditorStore } from '@/lib/store/editorStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ESTILOS: { id: ChapterOpeningStyle; nome: string }[] = [
  { id: 'nenhum',         nome: 'Nenhum' },
  { id: 'simples',        nome: 'Simples' },
  { id: 'epigrafe',       nome: 'Com epígrafe' },
  { id: 'ilustrado',      nome: 'Ilustrado' },
  { id: 'pagina-inteira', nome: 'Página inteira' },
]

interface IntercapaCapituloProps {
  chapter: Chapter
  children?: React.ReactNode
  // modo controlado (aberto de fora)
  open?: boolean
  onClose?: () => void
}

export function IntercapaCapitulo({ chapter, children, open: openProp, onClose }: IntercapaCapituloProps) {
  const { updateChapterOpening } = useEditorStore()
  const [abertoInterno, setAbertoInterno] = useState(false)
  const aberto = openProp !== undefined ? openProp : abertoInterno
  const [estilo, setEstilo] = useState<ChapterOpeningStyle>(chapter.opening_style ?? 'nenhum')
  const [imagem, setImagem] = useState(chapter.opening_image ?? '')
  const [epigrafe, setEpigrafe] = useState(chapter.opening_epigraph ?? '')
  const [autorEpigrafe, setAutorEpigrafe] = useState(chapter.opening_epigraph_author ?? '')
  const [numerado, setNumerado] = useState(chapter.numbered !== false)
  const inputRef = useRef<HTMLInputElement>(null)

  function abrir(e: React.MouseEvent) {
    e.stopPropagation()
    setEstilo(chapter.opening_style ?? 'nenhum')
    setImagem(chapter.opening_image ?? '')
    setEpigrafe(chapter.opening_epigraph ?? '')
    setAutorEpigrafe(chapter.opening_epigraph_author ?? '')
    setNumerado(chapter.numbered !== false)
    setAbertoInterno(true)
  }

  function fechar() {
    setAbertoInterno(false)
    onClose?.()
  }

  function salvar() {
    updateChapterOpening(chapter.id, {
      opening_style: estilo,
      opening_image: imagem || undefined,
      opening_epigraph: epigrafe || undefined,
      opening_epigraph_author: autorEpigrafe || undefined,
      numbered: numerado,
    })
    fechar()
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImagem(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const precisaImagem = estilo === 'ilustrado' || estilo === 'pagina-inteira'
  const precisaEpigrafe = estilo === 'epigrafe'

  return (
    <>
      <span onClick={abrir} className="contents">{children}</span>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-sm">Intercapa do capítulo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{chapter.title}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fechar}>✕</Button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-medium mb-3 block">Estilo de abertura</label>
                <div className="grid grid-cols-5 gap-2">
                  {ESTILOS.map((e) => {
                    const ativo = estilo === e.id
                    return (
                      <button
                        key={e.id}
                        onClick={() => setEstilo(e.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all',
                          ativo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        )}
                      >
                        <MiniEstilo id={e.id} />
                        <p className="text-[10px] font-medium leading-tight text-center">{e.nome}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Numeração */}
              <button
                type="button"
                onClick={() => setNumerado((v) => !v)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all text-sm',
                  numerado
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-muted/20 text-muted-foreground'
                )}
              >
                <div className="text-left">
                  <p className="text-xs font-medium leading-tight">
                    {numerado ? 'Capítulo numerado' : 'Sem numeração'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {numerado
                      ? 'Aparece como "Capítulo 1", "Capítulo 2"…'
                      : 'Prefácio, apresentação, notas — sem número'}
                  </p>
                </div>
                <div className={cn(
                  'w-9 h-5 rounded-full relative transition-colors shrink-0 ml-3',
                  numerado ? 'bg-primary' : 'bg-muted-foreground/30'
                )}>
                  <div className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                    numerado ? 'left-[18px]' : 'left-0.5'
                  )} />
                </div>
              </button>

              {precisaImagem && (
                <div>
                  <label className="text-xs font-medium mb-2 block">
                    Imagem {estilo === 'pagina-inteira' ? 'de fundo' : 'do capítulo'}
                  </label>
                  {imagem ? (
                    <div className="relative rounded-lg overflow-hidden h-36">
                      <img src={imagem} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImagem('')}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black/80"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
                    >
                      Clique para enviar uma imagem
                    </button>
                  )}
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
              )}

              {precisaEpigrafe && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Epígrafe</label>
                    <textarea
                      value={epigrafe}
                      onChange={(e) => setEpigrafe(e.target.value)}
                      placeholder="Citação de abertura..."
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Autor da citação</label>
                    <input
                      value={autorEpigrafe}
                      onChange={(e) => setAutorEpigrafe(e.target.value)}
                      placeholder="— Nome do autor"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={fechar}>Cancelar</Button>
              <Button size="sm" onClick={salvar}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MiniEstilo({ id }: { id: ChapterOpeningStyle }) {
  const w = 40, h = 58

  if (id === 'nenhum') {
    return (
      <div style={{ width: w, height: h }} className="rounded-sm border border-border bg-muted/30 flex items-center justify-center">
        <span className="text-[9px] text-muted-foreground/50">—</span>
      </div>
    )
  }

  if (id === 'simples') {
    return (
      <div style={{ width: w, height: h, background: '#faf8f0', border: '1px solid #d4c9a8' }} className="rounded-sm flex flex-col items-center justify-center gap-1.5 px-2">
        <div style={{ width: 14, height: 1, background: '#c8b89a' }} className="rounded" />
        <div style={{ width: 26, height: 2.5, background: '#666' }} className="rounded" />
        <div style={{ width: 20, height: 1.5, background: '#999' }} className="rounded" />
        <div style={{ width: 14, height: 1, background: '#c8b89a' }} className="rounded" />
      </div>
    )
  }

  if (id === 'epigrafe') {
    return (
      <div style={{ width: w, height: h, background: '#faf8f0', border: '1px solid #d4c9a8' }} className="rounded-sm flex flex-col items-center justify-center gap-1 px-2">
        <div style={{ width: 26, height: 2.5, background: '#666' }} className="rounded" />
        <div style={{ width: 20, height: 1.5, background: '#999' }} className="rounded" />
        <div style={{ height: 4 }} />
        <div style={{ width: 30, height: 1, background: '#ccc' }} className="rounded" />
        <div style={{ width: 24, height: 1, background: '#ccc' }} className="rounded" />
        <div style={{ width: 16, height: 1, background: '#bbb' }} className="rounded self-end mr-1" />
      </div>
    )
  }

  if (id === 'ilustrado') {
    return (
      <div style={{ width: w, height: h, background: '#faf8f0', border: '1px solid #d4c9a8', overflow: 'hidden' }} className="rounded-sm flex flex-col">
        <div style={{ height: Math.round(h * 0.55), background: 'linear-gradient(135deg, #e0d8c8 0%, #c8baa0 100%)' }} className="flex items-center justify-center shrink-0">
          <div style={{ width: 14, height: 10, background: '#b0a080', borderRadius: 1, opacity: 0.7 }} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div style={{ width: 26, height: 2, background: '#666' }} className="rounded" />
          <div style={{ width: 18, height: 1.5, background: '#999' }} className="rounded" />
        </div>
      </div>
    )
  }

  if (id === 'pagina-inteira') {
    return (
      <div style={{ width: w, height: h, background: 'linear-gradient(160deg, #3a3530 0%, #1a1510 100%)', border: '1px solid #555', overflow: 'hidden' }} className="rounded-sm flex flex-col justify-end">
        <div style={{ padding: '5px 4px', background: 'rgba(0,0,0,0.45)' }} className="flex flex-col gap-1">
          <div style={{ width: 26, height: 2, background: 'rgba(255,255,255,0.85)' }} className="rounded" />
          <div style={{ width: 18, height: 1.5, background: 'rgba(255,255,255,0.55)' }} className="rounded" />
        </div>
      </div>
    )
  }

  return null
}
