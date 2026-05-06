'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings, Check, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { BookFormat } from '@/types/book'
import { BOOK_FONTS, loadAllBookFonts, registerCustomFont } from '@/lib/fonts'
import { cn } from '@/lib/utils'

const FORMATOS: { id: BookFormat; nome: string; dimensoes: string; proporcao: { w: number; h: number } }[] = [
  { id: '14x21',  nome: 'Livro',          dimensoes: '14 × 21 cm',    proporcao: { w: 42, h: 63 } },
  { id: '15x23',  nome: 'Livro Premium',  dimensoes: '15 × 23 cm',    proporcao: { w: 45, h: 69 } },
  { id: 'a5',     nome: 'A5',             dimensoes: '14,8 × 21 cm',  proporcao: { w: 44, h: 63 } },
  { id: 'pocket', nome: 'Bolso',          dimensoes: '11 × 18 cm',    proporcao: { w: 33, h: 54 } },
  { id: 'abnt',   nome: 'ABNT',           dimensoes: 'A4 com margens', proporcao: { w: 56, h: 80 } },
]

export function ConfiguracaoLivro() {
  const { activeBook, updateBook } = useEditorStore()
  const [aberto, setAberto] = useState(false)
  const [formatoTemp, setFormatoTemp] = useState<BookFormat>(activeBook?.format ?? '14x21')
  const [titulo, setTitulo] = useState(activeBook?.title ?? '')
  const [autor, setAutor] = useState(activeBook?.author ?? '')
  const [fonteTemp, setFonteTemp] = useState(activeBook?.body_font ?? 'Georgia')
  const [customFonts, setCustomFonts] = useState<{ name: string; dataUrl: string }[]>(
    activeBook?.custom_fonts ?? []
  )
  const [uploadando, setUploadando] = useState(false)
  const inputFonteRef = useRef<HTMLInputElement>(null)

  function abrir() {
    setFormatoTemp(activeBook?.format ?? '14x21')
    setTitulo(activeBook?.title ?? '')
    setAutor(activeBook?.author ?? '')
    setFonteTemp(activeBook?.body_font ?? 'Georgia')
    setCustomFonts(activeBook?.custom_fonts ?? [])
    loadAllBookFonts()
    setAberto(true)
  }

  function salvar() {
    updateBook({
      format: formatoTemp,
      title: titulo.trim() || activeBook?.title,
      author: autor.trim() || activeBook?.author,
      body_font: fonteTemp,
      custom_fonts: customFonts,
    })
    setAberto(false)
  }

  async function handleUploadFonte(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/\.(ttf|otf|woff2?)/i.test(file.name)) {
      alert('Formatos aceitos: .ttf, .otf, .woff, .woff2')
      return
    }
    setUploadando(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const nome = file.name.replace(/\.[^.]+$/, '')
      await registerCustomFont(nome, dataUrl)
      setCustomFonts((prev) => [...prev, { name: nome, dataUrl }])
      setFonteTemp(nome)
      setUploadando(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function removerFonteCustom(nome: string) {
    setCustomFonts((prev) => prev.filter((f) => f.name !== nome))
    if (fonteTemp === nome) setFonteTemp('Georgia')
  }

  // Registra fontes customizadas salvas ao abrir o modal
  useEffect(() => {
    if (!aberto) return
    activeBook?.custom_fonts?.forEach((f) => registerCustomFont(f.name, f.dataUrl))
  }, [aberto, activeBook?.custom_fonts])

  const todasFontes = [
    ...BOOK_FONTS,
    ...customFonts.map((f) => ({ id: f.name, name: f.name, css: `"${f.name}", serif`, google: undefined })),
  ]

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={abrir} title="Configurações do livro">
        <Settings size={14} />
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-sm">Configurações do livro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Você pode alterar a qualquer momento</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(false)}>✕</Button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto">
              {/* Título e Autor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Título</label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Autor</label>
                  <input
                    value={autor}
                    onChange={(e) => setAutor(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Formato */}
              <div>
                <label className="text-xs font-medium mb-2 block">Formato do livro</label>
                <div className="grid grid-cols-5 gap-2">
                  {FORMATOS.map((f) => {
                    const ativo = formatoTemp === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFormatoTemp(f.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all text-center',
                          ativo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        )}
                      >
                        <div className="relative flex items-end justify-center h-14">
                          <div
                            className="rounded-sm"
                            style={{
                              width: f.proporcao.w,
                              height: f.proporcao.h,
                              background: 'linear-gradient(135deg, #faf8f0 0%, #f0ece0 100%)',
                              border: ativo ? '1.5px solid hsl(var(--primary))' : '1px solid #d4c9a8',
                              boxShadow: '2px 2px 5px rgba(0,0,0,0.12)',
                            }}
                          />
                          {ativo && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check size={9} className="text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium leading-tight">{f.nome}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{f.dimensoes}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {formatoTemp !== activeBook?.format && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠ Alterar o formato reajusta as margens e a paginação do visualizador.
                  </p>
                )}
              </div>

              {/* Fonte do corpo */}
              <div>
                <label className="text-xs font-medium mb-2 block">Fonte do corpo do texto</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {todasFontes.map((f) => {
                    const ativo = fonteTemp === f.id
                    const isCustom = !BOOK_FONTS.find((bf) => bf.id === f.id)
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFonteTemp(f.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all text-left',
                          ativo ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {ativo
                            ? <Check size={13} className="text-primary shrink-0" />
                            : <div className="w-[13px] shrink-0" />
                          }
                          <div className="min-w-0">
                            <p
                              className="text-base leading-tight truncate"
                              style={{ fontFamily: f.css }}
                            >
                              {f.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: f.css }}>
                              O rato roeu a roupa do rei de Roma
                            </p>
                          </div>
                        </div>
                        {isCustom && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removerFonteCustom(f.id) }}
                            className="shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover fonte"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Upload de fonte customizada */}
                <div className="mt-3">
                  <button
                    onClick={() => inputFonteRef.current?.click()}
                    disabled={uploadando}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed transition-colors text-xs',
                      'border-border text-muted-foreground',
                      'hover:border-primary/50 hover:text-foreground',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <Upload size={12} />
                    {uploadando ? 'Carregando…' : 'Adicionar fonte própria (.ttf, .otf, .woff2)'}
                  </button>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                    Necessário para impressão. O arquivo da fonte é salvo junto ao projeto.
                  </p>
                  <input
                    ref={inputFonteRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={handleUploadFonte}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-border flex gap-2 justify-end shrink-0">
              <Button variant="outline" size="sm" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button size="sm" onClick={salvar}>Salvar alterações</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
