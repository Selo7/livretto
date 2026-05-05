'use client'

import { type Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered, Mic, MicOff,
  BookOpen, Scissors,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ImportarArquivo } from './ImportarArquivo'
import { ImportarAudio } from './ImportarAudio'
import { AreaLabel } from '@/components/ui/area-label'

interface ToolbarProps {
  editor: Editor | null
  isDictating: boolean
  onToggleDictation: () => void
  onImportar: (html: string, titulo: string) => void
  onTransformToChapter: () => void
  onOpenRodape: () => void
}

interface BtnProps {
  icon: React.ReactNode
  label: string
  onMouseDown: (e: React.MouseEvent) => void
  active?: boolean
  disabled?: boolean
  className?: string
}

function Btn({ icon, label, onMouseDown, active, disabled, className }: BtnProps) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onMouseDown={onMouseDown}
      className={cn(
        'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-accent text-foreground',
        className
      )}
    >
      {icon}
    </button>
  )
}

function TextBtn({ label, onMouseDown, active, disabled, className }: Omit<BtnProps, 'icon'>) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onMouseDown={onMouseDown}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors text-xs font-medium whitespace-nowrap',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-accent text-foreground',
        className
      )}
    >
      {label}
    </button>
  )
}

// Executa comando TipTap mantendo o foco no editor
function run(editor: Editor, fn: (e: Editor) => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn(editor)
  }
}

export function Toolbar({ editor, isDictating, onToggleDictation, onImportar, onTransformToChapter, onOpenRodape }: ToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-background/80 backdrop-blur-sm flex-wrap">
      <AreaLabel className="mr-1">Barra de Formatação</AreaLabel>
      <Separator orientation="vertical" className="h-5 mr-1" />

      {/* Headings */}
      <Btn icon={<Heading1 size={14}/>} label="Título (H1)"
        active={editor.isActive('heading', { level: 1 })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run())} />
      <Btn icon={<Heading2 size={14}/>} label="Seção (H2)"
        active={editor.isActive('heading', { level: 2 })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run())} />
      <Btn icon={<Heading3 size={14}/>} label="Subseção (H3)"
        active={editor.isActive('heading', { level: 3 })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run())} />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Inline */}
      <Btn icon={<Bold size={14}/>} label="Negrito (Ctrl+B)"
        active={editor.isActive('bold')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleBold().run())} />
      <Btn icon={<Italic size={14}/>} label="Itálico (Ctrl+I)"
        active={editor.isActive('italic')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleItalic().run())} />
      <Btn icon={<Underline size={14}/>} label="Sublinhado (Ctrl+U)"
        active={editor.isActive('underline')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleUnderline().run())} />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alignment */}
      <Btn icon={<AlignLeft size={14}/>} label="Esquerda"
        active={editor.isActive({ textAlign: 'left' })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().setTextAlign('left').run())} />
      <Btn icon={<AlignCenter size={14}/>} label="Centralizar"
        active={editor.isActive({ textAlign: 'center' })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().setTextAlign('center').run())} />
      <Btn icon={<AlignRight size={14}/>} label="Direita"
        active={editor.isActive({ textAlign: 'right' })}
        onMouseDown={run(editor, (ed) => ed.chain().focus().setTextAlign('right').run())} />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Blocks */}
      <Btn icon={<Quote size={14}/>} label="Citação em bloco"
        active={editor.isActive('blockquote')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleBlockquote().run())} />
      <Btn icon={<List size={14}/>} label="Lista"
        active={editor.isActive('bulletList')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleBulletList().run())} />
      <Btn icon={<ListOrdered size={14}/>} label="Lista numerada"
        active={editor.isActive('orderedList')}
        onMouseDown={run(editor, (ed) => ed.chain().focus().toggleOrderedList().run())} />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Transformar em capítulo */}
      <TextBtn
        label="↳ Capítulo"
        onMouseDown={(e) => { e.preventDefault(); onTransformToChapter() }}
      />

      {/* Quebra de página */}
      <TextBtn
        label="⌥ Quebrar página"
        onMouseDown={run(editor, (ed) => ed.chain().focus().setHorizontalRule().run())}
      />

      {/* Nota de rodapé */}
      <TextBtn
        label="¹ Nota"
        onMouseDown={(e) => { e.preventDefault(); onOpenRodape() }}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Ditado */}
      <button
        type="button"
        title={isDictating ? 'Parar ditado' : 'Ditado por voz'}
        onMouseDown={(e) => { e.preventDefault(); onToggleDictation() }}
        className={cn(
          'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
          isDictating
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        {isDictating ? <MicOff size={14}/> : <Mic size={14}/>}
      </button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <ImportarArquivo onImportar={onImportar} />
      <ImportarAudio editor={editor} />
    </div>
  )
}
