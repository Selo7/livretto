'use client'

import { useState, KeyboardEvent } from 'react'
import { Rocket, Download, ChevronRight, ChevronLeft, X, Check, FileText, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { BookCategory, BookStatus, SUBCATEGORIAS } from '@/types/book'
import { cn } from '@/lib/utils'
import { getFontById } from '@/lib/fonts'
import { buildPrintHtml, buildEpub } from '@/lib/exportBook'
import { createClient } from '@/lib/supabase/client'

const OWNER_EMAIL = 'brunobrm@gmail.com'
const FREE_PLAN_LIMIT = 1

const CATEGORIAS: { id: BookCategory; nome: string; descricao: string; cor: string }[] = [
  { id: 'ficcao',         nome: 'Ficção',           descricao: 'Romance, thriller, fantasia…',      cor: '#6366f1' },
  { id: 'nao-ficcao',     nome: 'Não-ficção',        descricao: 'Auto-ajuda, negócios, economia…',   cor: '#0ea5e9' },
  { id: 'academico',      nome: 'Acadêmico',         descricao: 'TCC, dissertação, ensaio…',          cor: '#10b981' },
  { id: 'infantojuvenil', nome: 'Infantojuvenil',    descricao: 'Infantil, juvenil, paradidático…',   cor: '#f59e0b' },
  { id: 'poesia',         nome: 'Poesia & Crônica',  descricao: 'Poesia, crônica, conto literário…',  cor: '#ec4899' },
]

const STEPS = ['Classificação', 'Descrição', 'Publicação', 'Concluir']

interface FinalizarLivroProps {
  onClose: () => void
}

export function FinalizarLivro({ onClose }: FinalizarLivroProps) {
  const { activeBook, updateBook, chapters, wordCount } = useEditorStore()

  const [step, setStep] = useState(0)
  const [exportLoading, setExportLoading] = useState<'pdf' | 'epub' | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [categoria, setCategoria] = useState<BookCategory | ''>(activeBook?.category ?? '')
  const [subcategoria, setSubcategoria] = useState(activeBook?.subcategory ?? '')
  const [keywords, setKeywords] = useState<string[]>(activeBook?.keywords ?? [])
  const [kwInput, setKwInput] = useState('')
  const [sinopse, setSinopse] = useState(activeBook?.synopsis ?? '')
  const [preco, setPreco] = useState(activeBook?.price?.toString() ?? '')
  const [territorio, setTerritorio] = useState<'brasil' | 'mundial'>(activeBook?.territory ?? 'brasil')

  function addKeyword(raw: string) {
    const kw = raw.trim().toLowerCase()
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords([...keywords, kw])
    }
    setKwInput('')
  }

  function onKwKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(kwInput)
    }
    if (e.key === 'Backspace' && !kwInput && keywords.length > 0) {
      setKeywords(keywords.slice(0, -1))
    }
  }

  async function handleExportPdf() {
    if (!activeBook) return
    setExportLoading('pdf')
    try {
      const html = buildPrintHtml(chapters, activeBook.title, activeBook.format, activeBook.body_font, activeBook.custom_fonts ?? [], activeBook.cover_url, activeBook.back_cover_url)
      const win = window.open('', '_blank')
      if (!win) { alert('Permita pop-ups para exportar o PDF.'); return }
      win.document.write(html)
      win.document.close()
    } finally {
      setExportLoading(null)
    }
  }

  async function handleExportEpub() {
    if (!activeBook) return
    setExportLoading('epub')
    try {
      const font = getFontById(activeBook.body_font)
      const blob = await buildEpub(chapters, activeBook.title, activeBook.author, activeBook.id, font.css, activeBook.status === 'publicado')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeBook.title.replace(/[^a-z0-9çãõáéíóúâêîôûàüñ]/gi, '-')}.epub`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(null)
    }
  }

  async function salvarEPublicar(status: BookStatus) {
    if (status === 'publicado') {
      setPublishing(true)
      setQuotaExceeded(false)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email !== OWNER_EMAIL) {
          const { count } = await supabase
            .from('books')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'publicado')
            .neq('id', activeBook?.id ?? '')
          if ((count ?? 0) >= FREE_PLAN_LIMIT) {
            setQuotaExceeded(true)
            setPublishing(false)
            return
          }
        }
      } catch { /* offline ou sem conta — permite localmente */ }
      setPublishing(false)
    }

    updateBook({
      category: categoria as BookCategory,
      subcategory: subcategoria,
      synopsis: sinopse,
      keywords,
      price: preco ? parseFloat(preco.replace(',', '.')) : undefined,
      territory: territorio,
      status,
      published_at: status === 'publicado' ? new Date().toISOString() : undefined,
    })
    onClose()
  }

  const canNext = step === 0
    ? !!categoria
    : step === 1
    ? sinopse.length >= 50
    : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Finalizar livro</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{activeBook?.title}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={14} /></Button>
        </div>

        {/* Steps */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-0 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                    i < step ? 'bg-primary text-primary-foreground' :
                    i === step ? 'bg-primary/15 text-primary border border-primary' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {i < step ? <Check size={11} /> : i + 1}
                  </div>
                  <span className={cn('text-[10px] whitespace-nowrap', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-px flex-1 mx-2 mb-4 transition-colors', i < step ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Classificação */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium mb-3 block">Gênero principal</label>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCategoria(c.id); setSubcategoria('') }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                        categoria === c.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted/30'
                      )}
                    >
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: c.cor + '20' }}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.cor }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.descricao}</p>
                      </div>
                      {categoria === c.id && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {categoria && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Subcategoria</label>
                  <select
                    value={subcategoria}
                    onChange={(e) => setSubcategoria(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione a subcategoria</option>
                    {SUBCATEGORIAS[categoria].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Palavras-chave <span className="text-muted-foreground font-normal">({keywords.length}/10)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border bg-background min-h-[44px]">
                  {keywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">
                      {kw}
                      <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}><X size={10} /></button>
                    </span>
                  ))}
                  {keywords.length < 10 && (
                    <input
                      value={kwInput}
                      onChange={(e) => setKwInput(e.target.value)}
                      onKeyDown={onKwKeyDown}
                      onBlur={() => kwInput && addKeyword(kwInput)}
                      placeholder={keywords.length === 0 ? 'Digite e pressione Enter…' : ''}
                      className="flex-1 min-w-24 text-xs bg-transparent focus:outline-none"
                    />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Ajudam os leitores a encontrar seu livro na busca</p>
              </div>
            </div>
          )}

          {/* Step 1: Descrição */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Sinopse <span className="text-muted-foreground font-normal">({sinopse.length} caracteres, mínimo 50)</span>
                </label>
                <textarea
                  value={sinopse}
                  onChange={(e) => setSinopse(e.target.value)}
                  placeholder="Escreva uma descrição envolvente que faça o leitor querer comprar o seu livro…"
                  rows={8}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Esta é a descrição que aparecerá na página de venda do livro. Seja direto, desperte curiosidade.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Publicação */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Preço de venda (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="29,90"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Deixe em branco para gratuito</p>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1.5 block">Território de venda</label>
                  <div className="flex gap-2">
                    {(['brasil', 'mundial'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTerritorio(t)}
                        className={cn(
                          'flex-1 py-2 rounded-lg border-2 text-sm transition-all capitalize',
                          territorio === t ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/30'
                        )}
                      >
                        {t === 'brasil' ? '🇧🇷 Brasil' : '🌍 Mundial'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">Marketplace em breve</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  A loja integrada com afiliados estará disponível na v4 da plataforma.
                  Por agora, você pode exportar o livro em PDF ou EPUB e vender onde preferir.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Concluir */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Resumo */}
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-medium text-foreground mb-2">Resumo do livro</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div><span className="text-muted-foreground">Título</span><p className="font-medium truncate">{activeBook?.title}</p></div>
                  <div><span className="text-muted-foreground">Autor</span><p className="font-medium">{activeBook?.author}</p></div>
                  <div><span className="text-muted-foreground">Gênero</span><p className="font-medium">{CATEGORIAS.find(c => c.id === categoria)?.nome ?? '—'}{subcategoria ? ` · ${subcategoria}` : ''}</p></div>
                  <div><span className="text-muted-foreground">Formato</span><p className="font-medium">{activeBook?.format?.toUpperCase()}</p></div>
                  <div><span className="text-muted-foreground">Capítulos</span><p className="font-medium">{chapters.length}</p></div>
                  <div><span className="text-muted-foreground">Palavras</span><p className="font-medium">{wordCount.toLocaleString('pt-BR')}</p></div>
                  <div><span className="text-muted-foreground">Preço</span><p className="font-medium">{preco ? `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}` : 'Gratuito'}</p></div>
                  <div><span className="text-muted-foreground">Território</span><p className="font-medium capitalize">{territorio}</p></div>
                </div>
              </div>

              {/* Exportar */}
              <div>
                <p className="text-xs font-medium mb-2">Exportar</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={!!exportLoading}
                    className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">
                        {exportLoading === 'pdf' ? 'Paginando...' : 'PDF para impressão'}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Layout final com capa e diagramação
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={activeBook?.status === 'publicado' ? handleExportEpub : undefined}
                    disabled={!!exportLoading || activeBook?.status !== 'publicado'}
                    className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium">
                        {exportLoading === 'epub' ? 'Gerando...' : 'EPUB para e-readers'}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {activeBook?.status === 'publicado' ? 'Kindle, Kobo, Apple Books' : 'Disponível após publicar'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Aviso de quota */}
              {quotaExceeded && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Limite do plano gratuito atingido</p>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    Você já tem um livro publicado. Faça upgrade para o plano Pro para publicar livros ilimitados.
                  </p>
                </div>
              )}

              {/* Ações finais */}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full gap-2"
                  disabled={publishing}
                  onClick={() => salvarEPublicar('publicado')}
                >
                  <Rocket size={14} />
                  {publishing ? 'Verificando...' : 'Marcar como pronto para publicação'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={publishing}
                  onClick={() => salvarEPublicar('revisao')}
                >
                  Salvar e continuar revisando
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="gap-1.5"
          >
            <ChevronLeft size={14} />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < STEPS.length - 1 && (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="gap-1.5"
            >
              Próximo
              <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
