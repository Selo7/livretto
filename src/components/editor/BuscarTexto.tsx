'use client'

import { useEffect, useRef, useState } from 'react'
import { type Editor } from '@tiptap/react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { getSearchState } from './extensions/SearchExtension'

interface BuscarTextoProps {
  editor: Editor | null
  open: boolean
  onClose: () => void
}

export function BuscarTexto({ editor, open, onClose }: BuscarTextoProps) {
  const [termo, setTermo] = useState('')
  const [info, setInfo] = useState({ total: 0, current: -1 })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
    } else {
      editor?.commands.setSearchTerm('')
      setTermo('')
      setInfo({ total: 0, current: -1 })
    }
  }, [open, editor])

  useEffect(() => {
    if (!editor || !open) return
    editor.commands.setSearchTerm(termo)
    const s = getSearchState(editor)
    setInfo({ total: s.matches.length, current: s.currentIdx })
  }, [termo, editor, open])

  function scrollToMatch(ed: typeof editor) {
    if (!ed) return
    const s = getSearchState(ed)
    if (s.currentIdx < 0 || !s.matches.length) return
    try {
      const { node } = ed.view.domAtPos(s.matches[s.currentIdx].from)
      const el = node instanceof Element ? node : (node as ChildNode).parentElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch { /* posição fora do DOM */ }
  }

  function next() {
    editor?.commands.findNext()
    const s = getSearchState(editor)
    setInfo({ total: s.matches.length, current: s.currentIdx })
    scrollToMatch(editor)
  }

  function prev() {
    editor?.commands.findPrev()
    const s = getSearchState(editor)
    setInfo({ total: s.matches.length, current: s.currentIdx })
    scrollToMatch(editor)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? prev() : next() }
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  const semResultado = termo.length > 0 && info.total === 0

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-background shrink-0">
      <Search size={13} className="text-muted-foreground shrink-0" />

      <input
        ref={inputRef}
        value={termo}
        onChange={e => setTermo(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Localizar no texto…"
        className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
        style={{ color: semResultado ? 'hsl(var(--destructive))' : undefined }}
      />

      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 w-16 text-right">
        {semResultado
          ? 'Sem resultado'
          : info.total > 0
            ? `${info.current + 1} de ${info.total}`
            : ''}
      </span>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onMouseDown={e => { e.preventDefault(); prev() }}
          disabled={info.total === 0}
          title="Anterior (Shift+Enter)"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent disabled:opacity-30 transition-colors"
        >
          <ChevronUp size={12} />
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); next() }}
          disabled={info.total === 0}
          title="Próximo (Enter)"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent disabled:opacity-30 transition-colors"
        >
          <ChevronDown size={12} />
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onClose() }}
          title="Fechar (Esc)"
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent transition-colors ml-0.5"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
