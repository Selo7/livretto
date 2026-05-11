'use client'

import { useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, BookOpen, FileText } from 'lucide-react'
import { useEditorStore } from '@/lib/store/editorStore'
import { createClient } from '@/lib/supabase/client'
import { reorderChapters } from '@/lib/services/chapters'
import { Chapter } from '@/types/book'
import { cn } from '@/lib/utils'

const OPENING_LABELS: Record<string, string> = {
  simples: 'Simples',
  epigrafe: 'Epígrafe',
  ilustrado: 'Ilustrado',
  'pagina-inteira': 'Pág. inteira',
}

function getChapterNum(chapters: Chapter[], idx: number): number {
  let n = 0
  for (let i = 0; i <= idx; i++) {
    if (chapters[i].numbered !== false) n++
  }
  return n
}

function stripHtml(html: string | undefined, max = 130): string {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = (tmp.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

interface CardProps {
  chapter: Chapter
  chapterNum: number
  isActive: boolean
  onSelect: () => void
}

function SortableCard({ chapter, chapterNum, isActive, onSelect }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })

  const numLabel = chapter.numbered === false
    ? null
    : chapter.chapter_num?.trim()
      ? `Cap. ${chapter.chapter_num.trim()}`
      : `Cap. ${chapterNum}`

  const preview = useMemo(() => stripHtml(chapter.content_html), [chapter.content_html])
  const openingLabel = chapter.opening_style && chapter.opening_style !== 'nenhum'
    ? OPENING_LABELS[chapter.opening_style]
    : null

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card shadow-sm transition-all cursor-pointer select-none',
        'hover:shadow-md hover:border-primary/30',
        isActive && 'border-primary/50 ring-1 ring-primary/20',
        isDragging && 'shadow-xl z-50',
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing touch-none"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Chapter number */}
        {numLabel && (
          <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            {numLabel}
          </p>
        )}

        {/* Title */}
        <h3 className="font-semibold text-sm text-foreground leading-snug pr-5 line-clamp-2">
          {chapter.title || 'Sem título'}
        </h3>

        {/* Content preview */}
        {preview ? (
          <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-3 flex-1">
            {preview}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic flex-1">Capítulo vazio</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {(chapter.word_count ?? 0).toLocaleString()} palavras
        </span>
        {openingLabel && (
          <span className="text-[10px] text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded-full">
            {openingLabel}
          </span>
        )}
      </div>
    </div>
  )
}

export function ModoEstrutura() {
  const { chapters, setChapters, activeChapter, setActiveChapter, setMode } = useEditorStore()
  const supabase = useMemo(() => createClient(), [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex(c => c.id === active.id)
    const newIndex = chapters.findIndex(c => c.id === over.id)
    const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))

    setChapters(reordered)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await reorderChapters(reordered.map(c => ({ id: c.id, order: c.order })))
    } catch { /* offline */ }
  }

  function handleSelect(chapter: Chapter) {
    setActiveChapter(chapter)
    setMode('write')
  }

  if (chapters.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-8">
        <div className="space-y-3">
          <BookOpen size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum capítulo ainda.</p>
          <p className="text-xs text-muted-foreground/60">Crie capítulos no modo Escrever para visualizá-los aqui.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FileText size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Estrutura do livro</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {chapters.length} {chapters.length === 1 ? 'capítulo' : 'capítulos'} · Arraste para reordenar
          </span>
        </div>

        {/* Grid */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chapters.map(c => c.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {chapters.map((chapter, i) => (
                <SortableCard
                  key={chapter.id}
                  chapter={chapter}
                  chapterNum={getChapterNum(chapters, i)}
                  isActive={chapter.id === activeChapter?.id}
                  onSelect={() => handleSelect(chapter)}
                />
              ))}

              {/* Add chapter hint */}
              <button
                onClick={() => setMode('write')}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 text-muted-foreground/50 hover:text-muted-foreground hover:border-border transition-colors h-full min-h-[160px] cursor-pointer"
              >
                <Plus size={18} />
                <span className="text-xs">Adicionar no modo Escrever</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
