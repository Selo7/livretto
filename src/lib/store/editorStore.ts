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
  updateChapterOpening: (id: string, patch: Partial<Pick<Chapter, 'opening_style' | 'opening_image' | 'opening_epigraph' | 'opening_epigraph_author' | 'numbered' | 'chapter_num'>>) => void
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
      setActiveBook: (book) => set((s) => ({
        activeBook: book
          ? {
              ...book,
              // Preserva imagens de capa do localStorage quando o Supabase não as retorna
              // (coluna ainda não migrada ou campo ausente na resposta)
              cover_url: ('cover_url' in book) ? book.cover_url : s.activeBook?.cover_url,
              back_cover_url: ('back_cover_url' in book) ? book.back_cover_url : s.activeBook?.back_cover_url,
            }
          : null,
      })),
      updateBook: (patch) => set((s) => ({
        activeBook: s.activeBook ? { ...s.activeBook, ...patch } : null,
      })),
      setActiveChapter: (chapter) => set({ activeChapter: chapter }),
      setChapters: (chapters) => set((s) => {
        // Preserve fields that may not exist as Supabase columns yet.
        // Use `in` operator: if the column IS in the Supabase response (even as null),
        // trust it; if absent (column doesn't exist), fall back to localStorage value.
        const merged = chapters.map((c) => {
          const existing = s.chapters.find((e) => e.id === c.id)
          if (!existing) return c
          return {
            ...c,
            footnotes: ('footnotes' in c && (c.footnotes?.length ?? 0) > 0) ? c.footnotes : existing.footnotes,
            // Prefer Supabase value when present and non-null; fall back to localStorage
            // when Supabase returns null (column exists but UPDATE failed or not yet set).
            content_html:           'content_html'           in c ? (c.content_html           ?? existing.content_html)           : existing.content_html,
            opening_style:          'opening_style'          in c ? (c.opening_style          ?? existing.opening_style)          : existing.opening_style,
            opening_image:          'opening_image'          in c ? (c.opening_image          ?? existing.opening_image)          : existing.opening_image,
            opening_epigraph:       'opening_epigraph'       in c ? (c.opening_epigraph       ?? existing.opening_epigraph)       : existing.opening_epigraph,
            opening_epigraph_author:'opening_epigraph_author'in c ? (c.opening_epigraph_author?? existing.opening_epigraph_author): existing.opening_epigraph_author,
            numbered:               'numbered'               in c ? (c.numbered               ?? existing.numbered)               : existing.numbered,
            chapter_num:            'chapter_num'            in c ? (c.chapter_num            ?? existing.chapter_num)            : existing.chapter_num,
          }
        })
        return {
          chapters: merged,
          activeChapter: s.activeChapter
            ? (merged.find((c) => c.id === s.activeChapter!.id) ?? s.activeChapter)
            : null,
        }
      }),
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
        const allNums = get().chapters.flatMap(c => (c.footnotes ?? []).map(f => f.num))
        const newNum = allNums.length > 0 ? Math.max(...allNums) + 1 : 1
        const existing = get().chapters.find(c => c.id === chapterId)?.footnotes ?? []
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
