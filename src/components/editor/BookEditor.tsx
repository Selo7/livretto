'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toolbar } from './Toolbar'
import { PagePreview } from './PagePreview'
import { ChapterSidebar } from './ChapterSidebar'
import { ImportarArquivo } from './ImportarArquivo'
import { AssistenteIA } from './AssistenteIA'
import { AreaLabel } from '@/components/ui/area-label'
import { useEditorStore } from '@/lib/store/editorStore'
import { createClient } from '@/lib/supabase/client'
import { createChapter as createChapterService, updateChapter as updateChapterService } from '@/lib/services/chapters'
import { IntercapaCapitulo } from './IntercapaCapitulo'
import { GerenciadorRodape } from './GerenciadorRodape'
import { cn } from '@/lib/utils'
import { Chapter } from '@/types/book'
import { getFontById, loadGoogleFont, registerCustomFont } from '@/lib/fonts'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

const PREVIEW_MIN = 280
const PREVIEW_MAX = 680
const PREVIEW_DEFAULT = 420

export function BookEditor() {
  const { activeBook, activeChapter, setActiveChapter, chapters, setChapters, setWordCount, updateChapterContent, isFocusMode, toggleFocusMode } = useEditorStore()
  const [intercapaTarget, setIntercapaTarget] = useState<Chapter | null>(null)
  const [rodapeAberto, setRodapeAberto] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_DEFAULT)
  const [cursorBlockIndex, setCursorBlockIndex] = useState(0)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeChapterRef = useRef(activeChapter)
  const supabase = useMemo(() => createClient(), [])
  const dragRef = useRef<{ dragging: boolean; startX: number; startWidth: number }>({
    dragging: false, startX: 0, startWidth: PREVIEW_DEFAULT,
  })

  function onDragStart(e: React.MouseEvent) {
    dragRef.current = { dragging: true, startX: e.clientX, startWidth: previewWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(ev: MouseEvent) {
      if (!dragRef.current.dragging) return
      const delta = dragRef.current.startX - ev.clientX
      const nova = Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, dragRef.current.startWidth + delta))
      setPreviewWidth(nova)
    }

    function onUp() {
      dragRef.current.dragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Highlight,
      CharacterCount,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Título do capítulo...'
          return 'Comece a escrever...'
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[60vh]',
      },
      handleDrop(view, event: DragEvent) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const file = files[0]
        if (!file.type.startsWith('image/')) return false

        const reader = new FileReader()
        reader.onload = (e) => {
          const src = e.target?.result as string

          // Mede a largura natural da imagem e limita à coluna do editor
          const img = new window.Image()
          img.onload = () => {
            const colunaEl = view.dom.closest('.max-w-2xl') as HTMLElement | null
            const larguraColuna = colunaEl?.offsetWidth ?? 672
            const largura = Math.min(img.naturalWidth, larguraColuna)

            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src, width: largura })
              )
            )
          }
          img.src = src
        }
        reader.readAsDataURL(file)
        event.preventDefault()
        return true
      },
    },
    onSelectionUpdate({ editor }) {
      const { from } = editor.state.selection
      let blockIdx = 0
      let idx = 0
      editor.state.doc.forEach((node, offset) => {
        if (from >= offset && from <= offset + node.nodeSize) blockIdx = idx
        idx++
      })
      setCursorBlockIndex(blockIdx)
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      const json = editor.getJSON()
      setHtmlContent(html)
      const words = editor.storage.characterCount?.words() ?? 0
      setWordCount(words)

      const chapter = activeChapterRef.current
      if (chapter) {
        updateChapterContent(chapter.id, json, html, words)

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
        syncTimerRef.current = setTimeout(async () => {
          const id = activeChapterRef.current?.id
          if (!id) return
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await updateChapterService(id, {
              content: json,
              content_html: html,
              word_count: words,
              updated_at: new Date().toISOString(),
            })
          } catch { /* offline or not logged in */ }
        }, 2000)
      }
    },
  })

  // Carrega a fonte do livro sempre que ela muda
  useEffect(() => {
    if (!activeBook?.body_font) return
    loadGoogleFont(activeBook.body_font)
    activeBook.custom_fonts?.forEach((f) => registerCustomFont(f.name, f.dataUrl))
  }, [activeBook?.body_font, activeBook?.custom_fonts])

  // Keep activeChapterRef in sync for use inside onUpdate closure
  useEffect(() => {
    activeChapterRef.current = activeChapter
  }, [activeChapter])

  // Load chapter content into editor when active chapter changes
  useEffect(() => {
    if (!editor) return
    if (!activeChapter) {
      editor.commands.clearContent()
      setHtmlContent('')
      return
    }
    const html = activeChapter.content_html
    const json = activeChapter.content && Object.keys(activeChapter.content).length > 0
      ? activeChapter.content
      : null
    if (html) {
      editor.commands.setContent(html)
      setHtmlContent(html)
    } else if (json) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.commands.setContent(json as any)
      setHtmlContent(editor.getHTML())
    } else {
      editor.commands.clearContent()
      setHtmlContent('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter?.id, editor])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'f' || e.key === 'F') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return
        toggleFocusMode()
      }
      if (e.key === 'Escape' && isFocusMode) toggleFocusMode()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFocusMode, toggleFocusMode])

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      recognitionRef.current?.stop()
      setIsDictating(false)
      return
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      alert('Seu navegador não suporta ditado por voz. Use Chrome ou Edge.')
      return
    }

    const recognition = new SR()
    recognition.lang = activeBook?.language ?? 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        const text = last[0].transcript
        editor?.commands.insertContent(text + ' ')
      }
    }

    recognition.onerror = () => setIsDictating(false)
    recognition.onend = () => setIsDictating(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsDictating(true)
  }, [isDictating, editor, activeBook?.language])

  async function handleAddChapter() {
    const base: Chapter = {
      id: crypto.randomUUID(),
      book_id: activeBook?.id ?? '',
      title: `Capítulo ${chapters.length + 1}`,
      order: chapters.length,
      content: {},
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let chapter = base
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) chapter = await createChapterService(base)
    } catch { /* offline or not logged in */ }

    setChapters([...chapters, chapter])
    setActiveChapter(chapter)
    editor?.commands.clearContent()
    editor?.commands.focus()
  }

  function handleSelectChapter(chapter: Chapter) {
    setActiveChapter(chapter)
    editor?.commands.focus()
  }

  async function handleImportar(html: string, titulo: string) {
    const base: Chapter = {
      id: crypto.randomUUID(),
      book_id: activeBook?.id ?? '',
      title: titulo || 'Rascunho importado',
      order: chapters.length,
      content: {},
      content_html: html,
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    let chapter = base
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) chapter = await createChapterService({ ...base, content_html: html })
    } catch { /* offline or not logged in */ }

    setChapters([...chapters, chapter])
    setActiveChapter(chapter)
    editor?.commands.setContent(html)
    editor?.commands.focus()
  }

  async function handleTransformToChapter() {
    if (!editor || !activeBook) return

    // Descobre o índice do nó de nível superior onde está o cursor
    const { from } = editor.state.selection
    let splitIndex = 0
    let idx = 0
    editor.state.doc.forEach((node, offset) => {
      if (from >= offset && from <= offset + node.nodeSize) splitIndex = idx
      idx++
    })

    // Divide o HTML no índice encontrado
    const fullHtml = editor.getHTML()
    const parsed = new DOMParser().parseFromString(fullHtml, 'text/html')
    const children = Array.from(parsed.body.children)

    const beforeHtml = children.slice(0, splitIndex).map((el) => el.outerHTML).join('') || '<p></p>'
    const afterHtml = children.slice(splitIndex).map((el) => el.outerHTML).join('')

    // Título = texto do nó atual (limpa tags)
    const titleNode = children[splitIndex]
    const title = titleNode?.textContent?.trim() || `Capítulo ${chapters.length + 1}`

    // Atualiza o capítulo atual com o conteúdo anterior ao split.
    // setContent dispara onUpdate → updateChapterContent → atualiza o store com a
    // nova contagem de palavras do capítulo original. Por isso lemos o estado
    // DEPOIS do setContent via getState(), evitando sobrescrever com closure stale.
    editor.commands.setContent(beforeHtml)

    const freshChapters = useEditorStore.getState().chapters

    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      book_id: activeBook.id,
      title,
      order: freshChapters.length,
      content: {},
      content_html: afterHtml,
      word_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setChapters([...freshChapters, newChapter])
    setActiveChapter(newChapter)
    setIntercapaTarget(newChapter)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await createChapterService(newChapter)
    } catch { /* offline */ }
  }

  return (
    <div className={cn('flex flex-1 overflow-hidden', isFocusMode && 'fixed inset-0 z-50 bg-background')}>
      <ChapterSidebar onAddChapter={handleAddChapter} onSelectChapter={handleSelectChapter} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho da Área de Escrita */}
        {!isFocusMode && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background shrink-0">
            <AreaLabel>Área de Escrita</AreaLabel>
            {activeChapter && (
              <>
                <span className="text-muted-foreground/40 text-xs">›</span>
                <span className="text-xs text-muted-foreground truncate">{activeChapter.title}</span>
              </>
            )}
          </div>
        )}
        <Toolbar editor={editor} isDictating={isDictating} onToggleDictation={toggleDictation} onImportar={handleImportar} onTransformToChapter={handleTransformToChapter} onOpenRodape={() => setRodapeAberto(true)} />

        <div className={cn(
          'flex-1 overflow-y-auto px-12 py-10',
          isFocusMode && 'px-24 py-16',
          'bg-background'
        )}>
          {isFocusMode && (
            <p className="text-xs text-muted-foreground text-center mb-6 opacity-50">
              Modo foco — pressione ESC ou F para sair
            </p>
          )}
          {!activeChapter && !isFocusMode && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">Selecione ou crie um capítulo para começar</p>
                <p className="text-xs text-muted-foreground/60">ou importe um rascunho existente</p>
                <ImportarArquivo onImportar={handleImportar} />
              </div>
            </div>
          )}
          <div
            className={cn('max-w-2xl mx-auto', !activeChapter && !isFocusMode && 'hidden')}
            style={{ fontFamily: getFontById(activeBook?.body_font).css }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {isDictating && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950 border-t border-red-200 dark:border-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 dark:text-red-400">Ditando... fale agora</span>
          </div>
        )}
      </div>

      <AssistenteIA editor={editor} />

      {/* Drag handle entre Área de Escrita e Visualizador */}
      {!isFocusMode && (
        <div
          onMouseDown={onDragStart}
          className="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors bg-border group relative"
          title="Arraste para redimensionar"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {[0,1,2].map(i => (
              <div key={i} className="w-0.5 h-3 rounded-full bg-muted-foreground/40" />
            ))}
          </div>
        </div>
      )}

      <PagePreview content={htmlContent} width={previewWidth} cursorBlockIndex={cursorBlockIndex} />

      {intercapaTarget && (
        <IntercapaCapitulo
          chapter={intercapaTarget}
          open={true}
          onClose={() => setIntercapaTarget(null)}
        />
      )}

      <GerenciadorRodape
        editor={editor}
        open={rodapeAberto}
        onClose={() => setRodapeAberto(false)}
      />
    </div>
  )
}
