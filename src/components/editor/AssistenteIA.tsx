'use client'

import { useState, useRef } from 'react'
import { Sparkles, X, Send, Loader2, BookOpen, Lightbulb, Search, Quote, RefreshCw, ArrowDownToLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AreaLabel } from '@/components/ui/area-label'
import { useEditorStore } from '@/lib/store/editorStore'
import { cn } from '@/lib/utils'
import { type Editor } from '@tiptap/react'

interface Mensagem {
  papel: 'usuario' | 'assistente'
  texto: string
}

const SUGESTOES_RAPIDAS = [
  { icone: <Lightbulb size={13} />, texto: 'Sugerir continuação' },
  { icone: <Search size={13} />,    texto: 'Buscar referências' },
  { icone: <Quote size={13} />,     texto: 'Revisar este trecho' },
  { icone: <RefreshCw size={13} />, texto: 'Variar o tom' },
]

interface AssistenteIAProps {
  editor: Editor | null
}

export function AssistenteIA({ editor }: AssistenteIAProps) {
  const { isAIPanelOpen, toggleAIPanel, activeBook, activeChapter } = useEditorStore()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [entrada, setEntrada] = useState('')
  const [carregando, setCarregando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function enviar(texto?: string) {
    const pergunta = texto ?? entrada.trim()
    if (!pergunta || carregando) return

    setEntrada('')
    setMensagens((prev) => [...prev, { papel: 'usuario', texto: pergunta }])
    setCarregando(true)

    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: pergunta,
          historico: mensagens,
          contexto: {
            titulo: activeBook?.title,
            capitulo: activeChapter?.title,
          },
        }),
      })

      if (!res.ok) throw new Error('Erro na resposta da IA')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream indisponível')

      setMensagens((prev) => [...prev, { papel: 'assistente', texto: '' }])

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const linhas = buffer.split('\n')
        buffer = linhas.pop() ?? ''

        for (const linha of linhas) {
          if (!linha.startsWith('data: ')) continue
          const dado = linha.slice(6)
          if (dado === '[DONE]') break
          try {
            const json = JSON.parse(dado)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              setMensagens((prev) => {
                const copia = [...prev]
                copia[copia.length - 1] = {
                  ...copia[copia.length - 1],
                  texto: copia[copia.length - 1].texto + delta,
                }
                return copia
              })
            }
          } catch {}
        }
      }
    } catch {
      setMensagens((prev) => [
        ...prev,
        { papel: 'assistente', texto: 'Desculpe, ocorreu um erro. Tente novamente.' },
      ])
    } finally {
      setCarregando(false)
    }
  }

  function inserirNoEditor(texto: string) {
    if (!editor || !texto.trim()) return
    const html = texto
      .split('\n')
      .map((linha) => `<p>${linha.trim() || '<br/>'}</p>`)
      .join('')
    editor.chain().focus().insertContent(html).run()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  if (!isAIPanelOpen) return null

  return (
    <div className="w-80 shrink-0 border-l border-border bg-background flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="font-semibold text-sm">Assistente IA</span>
          <AreaLabel>Assistente IA</AreaLabel>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleAIPanel}>
          <X size={14} />
        </Button>
      </div>

      {/* Contexto ativo */}
      {(activeBook || activeChapter) && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen size={11} />
            <span className="truncate">
              {activeBook?.title}
              {activeChapter ? ` › ${activeChapter.title}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Área de conversa */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center pt-4">
              Pergunte qualquer coisa sobre seu livro ou peça sugestões.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {SUGESTOES_RAPIDAS.map((s) => (
                <button
                  key={s.texto}
                  onClick={() => enviar(s.texto)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-left hover:bg-accent transition-colors"
                >
                  {s.icone}
                  {s.texto}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-col',
              msg.papel === 'usuario' ? 'items-end' : 'items-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.papel === 'usuario'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {msg.papel === 'assistente' && msg.texto === '' && carregando ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.texto}</span>
              )}
            </div>

            {msg.papel === 'assistente' && msg.texto && !(i === mensagens.length - 1 && carregando) && (
              <button
                onClick={() => inserirNoEditor(msg.texto)}
                className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Inserir este texto no capítulo"
              >
                <ArrowDownToLine size={10} />
                Inserir no texto
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte à IA sobre seu livro..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => enviar()}
            disabled={!entrada.trim() || carregando}
          >
            {carregando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/50 mt-1.5 text-center">Enter para enviar · Shift+Enter nova linha</p>
      </div>
    </div>
  )
}
