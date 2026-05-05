'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { Book, BookFormat } from '@/types/book'
import { createBook } from '@/lib/services/books'
import { cn } from '@/lib/utils'

interface FormatoConfig {
  id: BookFormat
  nome: string
  dimensoes: string
  descricao: string
  proporcao: { largura: number; altura: number }
  disponivel: boolean
}

const FORMATOS: FormatoConfig[] = [
  {
    id: '14x21',
    nome: 'Livro',
    dimensoes: '14 × 21 cm',
    descricao: 'Padrão editorial brasileiro. Ideal para romance, não-ficção e ensaio.',
    proporcao: { largura: 70, altura: 105 },
    disponivel: true,
  },
  {
    id: '15x23',
    nome: 'Livro Premium',
    dimensoes: '15 × 23 cm',
    descricao: 'Formato maior, comum em obras de referência e não-ficção densa.',
    proporcao: { largura: 75, altura: 115 },
    disponivel: true,
  },
  {
    id: 'a5',
    nome: 'A5',
    dimensoes: '14,8 × 21 cm',
    descricao: 'Universal. Usado em publicações acadêmicas e internacionais.',
    proporcao: { largura: 74, altura: 105 },
    disponivel: true,
  },
  {
    id: 'pocket',
    nome: 'Bolso',
    dimensoes: '11 × 18 cm',
    descricao: 'Compacto e portátil. Perfeito para ficção e romances de bolso.',
    proporcao: { largura: 55, altura: 90 },
    disponivel: true,
  },
  {
    id: 'abnt',
    nome: 'ABNT / Acadêmico',
    dimensoes: 'A4 com margens ABNT',
    descricao: 'TCC, monografias e dissertações no padrão da ABNT.',
    proporcao: { largura: 94, altura: 133 },
    disponivel: true,
  },
]

const FORMATOS_BREVE = [
  { nome: 'Livro Infantil', descricao: 'Layouts de página ilustrada', proporcao: { largura: 105, altura: 105 } },
  { nome: 'Roteiro', descricao: 'Padrão Final Draft / Fountain', proporcao: { largura: 80, altura: 110 } },
]

export default function Onboarding() {
  const router = useRouter()
  const { setActiveBook, setChapters, setActiveChapter } = useEditorStore()
  const [etapa, setEtapa] = useState<'formato' | 'dados'>('formato')
  const [formatoSelecionado, setFormatoSelecionado] = useState<FormatoConfig | null>(null)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')

  function selecionarFormato(formato: FormatoConfig) {
    setFormatoSelecionado(formato)
    setEtapa('dados')
  }

  async function criarLivro() {
    if (!formatoSelecionado || !titulo.trim()) return

    const base = {
      id: crypto.randomUUID(),
      title: titulo.trim(),
      author: autor.trim() || 'Autor',
      format: formatoSelecionado.id,
      language: 'pt-BR',
      word_count: 0,
      daily_goal: 500,
      streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let livro: Book = { ...base, user_id: 'local' }

    try {
      livro = await createBook(base)
    } catch {
      // user not logged in — keep local
    }

    setActiveBook(livro)
    setChapters([])
    setActiveChapter(null)
    router.push(`/editor/${livro.id}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-8 py-5 border-b border-border">
        <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }} className="font-bold text-lg tracking-tight">
          Libretto
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {etapa === 'formato' ? (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Como será seu livro?</h1>
              <p className="text-muted-foreground text-sm">
                Escolha o formato antes de começar. Isso define as margens, tipografia e o preview ao vivo.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {FORMATOS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selecionarFormato(f)}
                  className={cn(
                    'group flex flex-col items-center gap-4 p-5 rounded-xl border-2 border-border',
                    'hover:border-primary hover:bg-primary/5 transition-all text-left',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                  )}
                >
                  <div className="flex items-end justify-center h-28">
                    <div
                      className="rounded-sm shadow-md group-hover:shadow-lg transition-shadow"
                      style={{
                        width: f.proporcao.largura * 0.9,
                        height: f.proporcao.altura * 0.9,
                        background: 'linear-gradient(135deg, #faf8f0 0%, #f0ece0 100%)',
                        border: '1px solid #d4c9a8',
                        boxShadow: '3px 3px 8px rgba(0,0,0,0.15), inset -2px 0 4px rgba(0,0,0,0.06)',
                      }}
                    />
                  </div>
                  <div className="w-full">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{f.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.dimensoes}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5 leading-relaxed line-clamp-2">{f.descricao}</p>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Em breve</p>
              <div className="grid grid-cols-2 gap-3">
                {FORMATOS_BREVE.map((f) => (
                  <div
                    key={f.nome}
                    className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border opacity-50 cursor-not-allowed"
                  >
                    <div
                      className="rounded-sm shrink-0"
                      style={{
                        width: f.proporcao.largura * 0.5,
                        height: f.proporcao.altura * 0.5,
                        background: '#f0ece0',
                        border: '1px solid #d4c9a8',
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm">{f.nome}</p>
                        <Lock size={11} className="text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <button
              onClick={() => setEtapa('formato')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              ← Voltar aos formatos
            </button>

            <div className="flex items-center gap-5 mb-8">
              <div
                className="rounded-sm shadow-md shrink-0"
                style={{
                  width: (formatoSelecionado?.proporcao.largura ?? 70) * 0.7,
                  height: (formatoSelecionado?.proporcao.altura ?? 105) * 0.7,
                  background: 'linear-gradient(135deg, #faf8f0 0%, #f0ece0 100%)',
                  border: '1px solid #d4c9a8',
                  boxShadow: '3px 3px 8px rgba(0,0,0,0.15)',
                }}
              />
              <div>
                <p className="font-bold text-lg">{formatoSelecionado?.nome}</p>
                <p className="text-sm text-muted-foreground">{formatoSelecionado?.dimensoes}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Título do livro</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && criarLivro()}
                  placeholder="Ex: A Última Luz do Sertão"
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Autor <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && criarLivro()}
                  placeholder="Seu nome"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              <Button
                className="w-full gap-2 mt-2"
                size="lg"
                onClick={criarLivro}
                disabled={!titulo.trim()}
              >
                Começar a escrever
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
