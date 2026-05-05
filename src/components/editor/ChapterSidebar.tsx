'use client'

import { useRef, useState, useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, BookOpen, GripVertical, Pencil, Check, GalleryVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AreaLabel } from '@/components/ui/area-label'
import { useEditorStore } from '@/lib/store/editorStore'
import { createClient } from '@/lib/supabase/client'
import { updateChapter, deleteChapter, reorderChapters } from '@/lib/services/chapters'
import { IntercapaCapitulo } from './IntercapaCapitulo'
import { cn } from '@/lib/utils'
import { Chapter } from '@/types/book'

interface ChapterSidebarProps {
  onAddChapter: () => void
  onSelectChapter: (chapter: Chapter) => void
}

interface SortableItemProps {
  chapter: Chapter
  ativo: boolean
  editandoId: string | null
  confirmandoId: string | null
  valorEdit: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onSelect: () => void
  onIniciarEdicao: (e: React.MouseEvent) => void
  onSalvarEdicao: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onValorEditChange: (v: string) => void
  onConfirmarDelete: () => void
  onSetConfirmando: () => void
  onCancelarConfirmando: () => void
}

function SortableItem({
  chapter, ativo, editandoId, confirmandoId, valorEdit, inputRef,
  onSelect, onIniciarEdicao, onSalvarEdicao, onKeyDown, onValorEditChange,
  onConfirmarDelete, onSetConfirmando, onCancelarConfirmando,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const editando = editandoId === chapter.id
  const confirmando = confirmandoId === chapter.id

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md group transition-colors',
          'hover:bg-accent cursor-pointer',
          ativo && 'bg-accent',
          confirmando && 'opacity-50',
          isDragging && 'shadow-lg'
        )}
        onClick={() => !editando && !confirmando && onSelect()}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </div>

        <div className="flex-1 min-w-0">
          {editando ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={valorEdit}
                onChange={(e) => onValorEditChange(e.target.value)}
                onBlur={onSalvarEdicao}
                onKeyDown={onKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-xs bg-background border border-primary rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); onSalvarEdicao() }}
                className="shrink-0 text-primary hover:text-primary/80"
              >
                <Check size={12} />
              </button>
            </div>
          ) : (
            <>
              <p className={cn('text-sm truncate', ativo ? 'font-medium' : 'text-muted-foreground')}>
                {chapter.title || 'Sem título'}
              </p>
              <p className="text-xs text-muted-foreground/60">{chapter.word_count} palavras</p>
            </>
          )}
        </div>

        {!editando && !confirmando && (
          <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <IntercapaCapitulo chapter={chapter}>
              <button className="text-muted-foreground hover:text-foreground" title="Intercapa">
                <GalleryVertical size={11} />
              </button>
            </IntercapaCapitulo>
            <button onClick={onIniciarEdicao} className="text-muted-foreground hover:text-foreground" title="Renomear">
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSetConfirmando() }}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Excluir capítulo"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Confirmação inline */}
      {confirmando && (
        <div className="mx-2 mb-1 px-2 py-2 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive font-medium mb-2 truncate">Excluir "{chapter.title}"?</p>
          <div className="flex gap-1.5">
            <button
              onClick={onConfirmarDelete}
              className="flex-1 text-xs py-1 px-2 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium"
            >
              Excluir
            </button>
            <button
              onClick={onCancelarConfirmando}
              className="flex-1 text-xs py-1 px-2 rounded border border-border hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ChapterSidebar({ onAddChapter, onSelectChapter }: ChapterSidebarProps) {
  const { chapters, activeChapter, isFocusMode, updateChapterTitle, removeChapter, setChapters } = useEditorStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function iniciarEdicao(chapter: Chapter, e: React.MouseEvent) {
    e.stopPropagation()
    setEditandoId(chapter.id)
    setValorEdit(chapter.title)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  async function salvarEdicao() {
    if (!editandoId) return
    const titulo = valorEdit.trim() || 'Sem título'
    updateChapterTitle(editandoId, titulo)
    setEditandoId(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await updateChapter(editandoId, { title: titulo, updated_at: new Date().toISOString() })
    } catch { /* offline */ }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') salvarEdicao()
    if (e.key === 'Escape') setEditandoId(null)
  }

  async function confirmarDelete(id: string) {
    removeChapter(id)
    setConfirmandoId(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await deleteChapter(id)
    } catch { /* offline */ }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex((c) => c.id === active.id)
    const newIndex = chapters.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))

    setChapters(reordered)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await reorderChapters(reordered.map((c) => ({ id: c.id, order: c.order })))
    } catch { /* offline */ }
  }

  if (isFocusMode) return null

  return (
    <aside className="w-56 border-r border-border bg-background flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Capítulos</span>
          <AreaLabel>Área de Capítulos</AreaLabel>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddChapter}>
          <Plus size={13} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {chapters.length === 0 && (
            <div className="px-2 py-8 text-center">
              <p className="text-xs text-muted-foreground">Nenhum capítulo ainda.</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={onAddChapter}>
                <Plus size={12} className="mr-1" />
                Criar capítulo
              </Button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {chapters.map((chapter) => (
                <SortableItem
                  key={chapter.id}
                  chapter={chapter}
                  ativo={activeChapter?.id === chapter.id}
                  editandoId={editandoId}
                  confirmandoId={confirmandoId}
                  valorEdit={valorEdit}
                  inputRef={inputRef}
                  onSelect={() => onSelectChapter(chapter)}
                  onIniciarEdicao={(e) => iniciarEdicao(chapter, e)}
                  onSalvarEdicao={salvarEdicao}
                  onKeyDown={onKeyDown}
                  onValorEditChange={setValorEdit}
                  onConfirmarDelete={() => confirmarDelete(chapter.id)}
                  onSetConfirmando={() => setConfirmandoId(chapter.id)}
                  onCancelarConfirmando={() => setConfirmandoId(null)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {chapters.length} {chapters.length === 1 ? 'capítulo' : 'capítulos'}
        </p>
      </div>
    </aside>
  )
}
