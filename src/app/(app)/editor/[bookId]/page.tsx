'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BookEditor } from '@/components/editor/BookEditor'
import { Header } from '@/components/layout/Header'
import { useEditorStore } from '@/lib/store/editorStore'
import { fetchBook } from '@/lib/services/books'
import { fetchChapters } from '@/lib/services/chapters'

export default function EditorPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const { activeBook, setActiveBook, setChapters, setActiveChapter } = useEditorStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeBook?.id === bookId) return

    setLoading(true)
    fetchBook(bookId)
      .then((book) => {
        if (!book) { router.replace('/new'); return }
        setActiveBook(book)
        return fetchChapters(bookId).then((chs) => {
          setChapters(chs)
          setActiveChapter(chs[0] ?? null)
        })
      })
      .catch(() => router.replace('/new'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId])

  if (!activeBook || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">Carregando livro...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <BookEditor />
      </main>
    </div>
  )
}
