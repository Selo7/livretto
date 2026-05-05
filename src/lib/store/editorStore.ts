import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppMode, Book, Chapter, ChapterFootnote } from '@/types/book'

interface EditorState {
  mode: AppMode
  activeBook: Book | null
  activeChapter: Chapter | null
  chapters: Chapter[]
  isFocusMode: boolean
  isAIPanelOpen: boolean
  isPreviewOpen: boolean
  wordCount: number
  sessionWords: number
  chapterPageCounts: Record<string, number>

  setMode: (mode: AppMode) => void
  setActiveBook: (book: Book | null) => void
  updateBook: (patch: Partial<Book>) => void
  setActiveChapter: (chapter: Chapter | null) => void
  setChapters: (chapters: Chapter[]) => void
  updateChapterTitle: (id: string, title: string) => void
  updateChapterContent: (id: string, content: object, contentHtml: string, wordCount: number) => void
  removeChapter: (id: string) => void
  updateChapterOpening: (id: string, patch: Partial<Pick<Chapter, 'opening_style' | 'opening_image' | 'opening_epigraph' | 'opening_epigraph_author' | 'numbered'>>) => void
  setChapterPageCount: (id: string, count: number) => void
  // Notas de rodapé
  addChapterFootnote: (chapterId: string, content: string) => number
  updateChapterFootnote: (chapterId: string, num: number, content: string) => void
  removeChapterFootnote: (chapterId: string, num: number) => void
  toggleFocusMode: () => void
  toggleAIPanel: () => void
  togglePreview: () => void
  setWordCount: (count: number) => void
  incrementSessionWords: (delta: number) => void
}

function applyFootnotes(
  chapters: Chapter[],
  activeChapter: Chapter | null,
  id: string,
  footnotes: ChapterFootnote[]
) {
  return {
    chapters: chapters.map((c) => c.id === id ? { ...c, footnotes } : c),
    activeChapter: activeChapter?.id === id ? { ...activeChapter, footnotes } : activeChapter,
  }
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      mode: 'write',
      activeBook: null,
      activeChapter: null,
      chapters: [],
      isFocusMode: false,
      isAIPanelOpen: false,
      isPreviewOpen: true,
      wordCount: 0,
      sessionWords: 0,
      chapterPageCounts: {},

      setMode: (mode) => set({ mode }),
      setActiveBook: (book) => set({ activeBook: book }),
      updateBook: (patch) => set((s) => ({
        activeBook: s.activeBook ? { ...s.activeBook, ...patch } : null,
      })),
      setActiveChapter: (chapter) => set({ activeChapter: chapter }),
      setChapters: (chapters) => set((s) => ({
        chapters,
        activeChapter: s.activeChapter
          ? (chapters.find((c) => c.id === s.activeChapter!.id) ?? s.activeChapter)
          : null,
      })),
      updateChapterTitle: (id, title) => set((s) => ({
        chapters: s.chapters.map((c) => c.id === id ? { ...c, title } : c),
        activeChapter: s.activeChapter?.id === id ? { ...s.activeChapter, title } : s.activeChapter,
      })),
      removeChapter: (id) => set((s) => {
        const remaining = s.chapters.filter((c) => c.id !== id)
        const wasActive = s.activeChapter?.id === id
        const newActive = wasActive ? (remaining[0] ?? null) : s.activeChapter
        return { chapters: remaining, activeChapter: newActive }
      }),
      updateChapterContent: (id, content, contentHtml, wordCount) => set((s) => ({
        chapters: s.chapters.map((c) => c.id === id ? { ...c, content, content_html: contentHtml, word_count: wordCount } : c),
        activeChapter: s.activeChapter?.id === id ? { ...s.activeChapter, content, content_html: contentHtml, word_count: wordCount } : s.activeChapter,
      })),
      updateChapterOpening: (id, patch) => set((s) => ({
        chapters: s.chapters.map((c) => c.id === id ? { ...c, ...patch } : c),
        activeChapter: s.activeChapter?.id === id ? { ...s.activeChapter, ...patch } : s.activeChapter,
      })),
      setChapterPageCount: (id, count) => set((s) => ({
        chapterPageCounts: { ...s.chapterPageCounts, [id]: count },
      })),

      addChapterFootnote: (chapterId, content) => {
        const existing = get().chapters.find(c => c.id === chapterId)?.footnotes ?? []
        const newNum = existing.length > 0 ? Math.max(...existing.map(f => f.num)) + 1 : 1
        const updated = [...existing, { num: newNum, content }]
        set((s) => applyFootnotes(s.chapters, s.activeChapter, chapterId, updated))
        return newNum
      },
      updateChapterFootnote: (chapterId, num, content) => {
        const existing = get().chapters.find(c => c.id === chapterId)?.footnotes ?? []
        const updated = existing.map(f => f.num === num ? { ...f, content } : f)
        set((s) => applyFootnotes(s.chapters, s.activeChapter, chapterId, updated))
      },
      removeChapterFootnote: (chapterId, num) => {
        const existing = get().chapters.find(c => c.id === chapterId)?.footnotes ?? []
        const updated = existing.filter(f => f.num !== num)
        set((s) => applyFootnotes(s.chapters, s.activeChapter, chapterId, updated))
      },

      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
      toggleAIPanel: () => set((s) => ({ isAIPanelOpen: !s.isAIPanelOpen })),
      togglePreview: () => set((s) => ({ isPreviewOpen: !s.isPreviewOpen })),
      setWordCount: (count) => set({ wordCount: count }),
      incrementSessionWords: (delta) => set((s) => ({ sessionWords: s.sessionWords + delta })),
    }),
    {
      name: 'book-projector-state',
      partialize: (state) => ({
        activeBook: state.activeBook,
        activeChapter: state.activeChapter,
        chapters: state.chapters,
        mode: state.mode,
        isPreviewOpen: state.isPreviewOpen,
      }),
    }
  )
)
