'use client'

import { type Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, Quote, List, ListOrdered, Mic, MicOff,
  Search, ImagePlus, ChevronDown,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ImportarArquivo, CapituloImportado } from './ImportarArquivo'
import { ImportarAudio } from './ImportarAudio'
import { AreaLabel } from '@/components/ui/area-label'
import { BOOK_FONTS, getFontById } from '@/lib/fonts'
import { useState, useRef, useEffect } from 'react'

// Tamanhos adequados para tipografia editorial (pt)
const BOOK_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '24']

interface ToolbarProps {
  editor: Editor | null
  isDictating: boolean
  onToggleDictation: () => void
  onImportar: (capitulos: CapituloImportado[]) => void
  onTransformToChapter: () => void
  onOpenRodape: () => void
  onOpenBuscar: () => void
  onInsertImage: () => void
  defaultFontId?: string
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

// Dropdown genérico para fonte/tamanho
function ToolbarSelect({ value, label, options, onChange, width }: {
  value: string
  label: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  width: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        type="button"
        title={label}
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
        className="flex items-center justify-between gap-0.5 h-7 w-full px-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <span className="truncate">{value}</span>
        <ChevronDown size={10} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 bg-background border border-border rounded-lg shadow-xl py-1 max-h-52 overflow-y-auto" style={{ minWidth: width }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-1 text-xs hover:bg-accent transition-colors',
                opt.value === value && 'bg-accent/60 font-medium text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Toolbar({ editor, isDictating, onToggleDictation, onImportar, onTransformToChapter, onOpenRodape, onOpenBuscar, onInsertImage, defaultFontId }: ToolbarProps) {
  if (!editor) return null

  const defaultFont = getFontById(defaultFontId)

  // Fonte ativa: lê o mark do editor, cai no padrão do livro se não houver mark
  const activeFontCss: string = editor.getAttributes('textStyle').fontFamily ?? defaultFont.css
  const activeFont = BOOK_FONTS.find(f => f.css === activeFontCss) ?? defaultFont

  // Tamanho ativo: lê mark ou cai em 11pt (padrão editorial)
  const rawSize: string = editor.getAttributes('textStyle').fontSize ?? '11pt'
  const activeSize = rawSize.replace('pt', '')

  function handleFontChange(fontId: string) {
    const font = BOOK_FONTS.find(f => f.id === fontId)
    if (!font) return
    if (fontId === defaultFontId) {
      editor.chain().focus().unsetFontFamily().run()
    } else {
      editor.chain().focus().setFontFamily(font.css).run()
    }
  }

  function handleSizeChange(size: string) {
    const pt = `${size}pt`
    if (size === '11') {
      editor.chain().focus().unsetFontSize().run()
    } else {
      editor.chain().focus().setFontSize(pt).run()
    }
  }

  const fontOptions = BOOK_FONTS.map(f => ({ value: f.id, label: f.name }))
  const sizeOptions = BOOK_SIZES.map(s => ({ value: s, label: `${s}pt` }))

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-background/80 backdrop-blur-sm flex-wrap">
      <AreaLabel className="mr-1">Barra de Formatação</AreaLabel>

      {/* Fonte */}
      <ToolbarSelect
        value={activeFont.name}
        label="Família da fonte"
        options={fontOptions}
        onChange={handleFontChange}
        width={96}
      />

      {/* Tamanho */}
      <ToolbarSelect
        value={`${activeSize}pt`}
        label="Tamanho da fonte"
        options={sizeOptions}
        onChange={handleSizeChange}
        width={56}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

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

      {/* Inserir imagem */}
      <Btn
        icon={<ImagePlus size={14}/>}
        label="Inserir imagem"
        onMouseDown={(e) => { e.preventDefault(); onInsertImage() }}
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

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Btn
        icon={<Search size={14}/>}
        label="Localizar no texto (Ctrl+F)"
        onMouseDown={(e) => { e.preventDefault(); onOpenBuscar() }}
      />
    </div>
  )
}
