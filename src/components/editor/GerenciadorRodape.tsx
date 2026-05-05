'use client'

import { useEffect, useRef, useState } from 'react'
import { type Editor } from '@tiptap/react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/lib/store/editorStore'
import { updateChapter as updateChapterService } from '@/lib/services/chapters'
import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'

interface GerenciadorRodapeProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

export function GerenciadorRodape({ editor, open, onClose }: GerenciadorRodapeProps) {
  const { activeChapter, addChapterFootnote, updateChapterFootnote, removeChapterFootnote } = useEditorStore()
  const supabase = useMemo(() => createClient(), [])

  const footnotes = activeChapter?.footnotes ?? []
  const proxNum = footnotes.length > 0 ? Math.max(...footnotes.map(f => f.num)) + 1 : 1

  const [novoConteudo, setNovoConteudo] = useState('')
  const [editandoNum, setEditandoNum] = useState<number | null>(null)
  const [editConteudo, setEditConteudo] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setNovoConteudo('')
      setEditandoNum(null)
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [open])

  async function sincronizar(notas: typeof footnotes) {
    if (!activeChapter?.id) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await updateChapterService(activeChapter.id, {
        footnotes: notas,
        updated_at: new Date().toISOString(),
      } as Parameters<typeof updateChapterService>[1])
    } catch { /* offline */ }
  }

  function handleInserir() {
    if (!novoConteudo.trim() || !activeChapter?.id) return
    const num = addChapterFootnote(activeChapter.id, novoConteudo.trim())
    editor?.chain().focus().insertContent(`[${num}]`).run()
    const notas = [...footnotes, { num, content: novoConteudo.trim() }]
    sincronizar(notas)
    setNovoConteudo('')
    onClose()
  }

  function handleSalvarEdicao() {
    if (editandoNum === null || !activeChapter?.id) return
    updateChapterFootnote(activeChapter.id, editandoNum, editConteudo.trim())
    const notas = footnotes.map(f => f.num === editandoNum ? { ...f, content: editConteudo.trim() } : f)
    sincronizar(notas)
    setEditandoNum(null)
  }

  function handleRemover(num: number) {
    if (!activeChapter?.id) return
    removeChapterFootnote(activeChapter.id, num)
    const notas = footnotes.filter(f => f.num !== num)
    sincronizar(notas)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Notas de rodapé</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeChapter?.title ?? 'Capítulo sem título'}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Notas existentes */}
          {footnotes.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Notas deste capítulo
              </p>
              <div className="space-y-2">
                {footnotes.map(fn => (
                  <div key={fn.num} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                    {editandoNum === fn.num ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">[{fn.num}]</span>
                          <span className="text-xs text-muted-foreground">editando</span>
                        </div>
                        <textarea
                          value={editConteudo}
                          onChange={e => setEditConteudo(e.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditandoNum(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSalvarEdicao}>
                            <Check size={12} className="mr-1" /> Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-primary shrink-0 mt-0.5">[{fn.num}]</span>
                        <p className="text-xs text-foreground flex-1 leading-relaxed">{fn.content}</p>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            onClick={() => { setEditandoNum(fn.num); setEditConteudo(fn.content) }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => handleRemover(fn.num)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nova nota */}
          <div className="px-5 pt-4 pb-5">
            {footnotes.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Nova nota
              </p>
            )}
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold">
                  {proxNum}
                </span>
                <span className="text-xs text-muted-foreground">
                  A marcação <code className="bg-muted px-1 rounded text-[11px]">[{proxNum}]</code> será inserida onde o cursor está
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={novoConteudo}
                onChange={e => setNovoConteudo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleInserir()
                  if (e.key === 'Escape') onClose()
                }}
                placeholder="Cole ou escreva a referência bibliográfica, nota ou citação..."
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Ctrl+Enter para inserir
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-border flex gap-2 justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleInserir}
            disabled={!novoConteudo.trim()}
          >
            Inserir [{proxNum}] no texto
          </Button>
        </div>
      </div>
    </div>
  )
}
