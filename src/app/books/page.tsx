'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ArrowRight, Trash2, Loader2, BookOpen, LogOut } from 'lucide-react'
import { Book, BookFormat } from '@/types/book'
import { coverToDataUri } from '@/lib/cover'
import { fetchBooks, deleteBook } from '@/lib/services/books'
import { signOut, getUser } from '@/lib/services/auth'
import { useEditorStore } from '@/lib/store/editorStore'
import { fetchChapters } from '@/lib/services/chapters'

const C = {
  bg: '#0a0907', surface: '#111009', card: '#1a1610',
  cardHover: '#201d13', border: '#2a2218', borderLight: '#3a3228',
  text: '#f0e8d6', muted: '#9a8870', faint: '#4a3c2e',
  accent: '#c8720a', accentLight: '#e08c2a',
}

// Target word count for a complete book (adjustable per genre)
const WORDS_TARGET = 60_000

function getProgress(words: number) {
  const pct = Math.min(Math.round((words / WORDS_TARGET) * 100), 100)
  let message: string
  if (words === 0)      message = 'A primeira palavra muda tudo. Comece agora.'
  else if (pct < 10)   message = 'Os primeiros passos! A história está nascendo.'
  else if (pct < 25)   message = 'Ótimo início. O ritmo está bom!'
  else if (pct < 50)   message = 'Já escrevemos muito. Vamos manter o foco!'
  else if (pct < 65)   message = 'Mais da metade! Não para agora.'
  else if (pct < 80)   message = 'Começamos, mas ainda não terminamos. Falta pouco!'
  else if (pct < 95)   message = 'A reta final! Você está quase lá.'
  else if (pct < 100)  message = 'Finalíssimo. Hora do último empurrão!'
  else                 message = 'Manuscrito completo. Pronto para publicar!'
  return { pct, message }
}

const FORMAT_DIM: Record<BookFormat, { w: number; h: number; label: string }> = {
  '14x21': { w: 42, h: 63, label: 'Livro' },
  '15x23': { w: 45, h: 69, label: 'Premium' },
  'a5':    { w: 44, h: 63, label: 'A5' },
  'pocket':{ w: 33, h: 54, label: 'Bolso' },
  'abnt':  { w: 56, h: 80, label: 'ABNT' },
  'kdp':   { w: 41, h: 63, label: 'KDP' },
}

function Mark() {
  return (
    <svg width="26" height="23" viewBox="0 0 40 36" fill="none" aria-hidden>
      <rect x="12" y="0" width="16" height="11" rx="1.5" stroke={C.accent} strokeWidth="1.5"/>
      <line x1="15" y1="3.5" x2="25" y2="3.5" stroke={C.accent} strokeWidth="1" opacity="0.55"/>
      <line x1="15" y1="7" x2="22" y2="7" stroke={C.accent} strokeWidth="1" opacity="0.3"/>
      <rect x="3" y="9.5" width="34" height="5.5" rx="2.75" stroke={C.accent} strokeWidth="1.5" fill={C.card}/>
      <rect x="1" y="14.5" width="38" height="21" rx="3" stroke={C.accent} strokeWidth="1.5" fill={C.card}/>
      {[6,12.5,19,25.5,32].map((x) => (
        <rect key={x} x={x} y="19" width="5" height="3.5" rx="1" fill={C.accent} opacity="0.8"/>
      ))}
      {[6,12.5,19,25.5,32].map((x) => (
        <rect key={x+'b'} x={x} y="25.5" width="5" height="3.5" rx="1" fill={C.accent} opacity="0.45"/>
      ))}
    </svg>
  )
}

function BookThumbnail({ book }: { book: Book }) {
  const dim = FORMAT_DIM[book.format] ?? FORMAT_DIM['14x21']
  const src = book.cover_url || coverToDataUri(book.title, book.author)
  return (
    <div style={{
      width: dim.w, height: dim.h,
      borderRadius: 3,
      boxShadow: '3px 3px 8px rgba(0,0,0,0.35), inset -2px 0 4px rgba(0,0,0,0.08)',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <img src={src} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
    </div>
  )
}

export default function BooksPage() {
  const router = useRouter()
  const { setActiveBook, setChapters, setActiveChapter } = useEditorStore()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    getUser().then((u) => setUserEmail(u?.email ?? ''))
    fetchBooks()
      .then(setBooks)
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleOpen(book: Book) {
    setOpening(book.id)
    try {
      const chapters = await fetchChapters(book.id)
      setActiveBook(book)
      setChapters(chapters)
      setActiveChapter(chapters[0] ?? null)
      router.push(`/editor/${book.id}`)
    } catch {
      router.push(`/editor/${book.id}`)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    try {
      await deleteBook(id)
      setBooks((prev) => prev.filter((b) => b.id !== id))
    } catch {
      alert('Erro ao excluir o livro.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  const fmt = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 60,
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <Mark/>
          <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: 19, color: C.text }}>
            Livretto
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {userEmail && (
            <span style={{ fontSize: 12, color: C.muted }}>{userEmail}</span>
          )}
          <Link
            href="/new"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.accent, color: '#fff',
              padding: '7px 16px', borderRadius: 7,
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}
          >
            <Plus size={13}/>
            Novo livro
          </Link>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = C.faint)}
          >
            <LogOut size={13}/>
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 40px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 32, fontWeight: 700,
            color: C.text, letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            Seus livros
          </h1>
          <p style={{ fontSize: 13, color: C.muted }}>
            {loading ? 'Carregando...' : `${books.length} ${books.length === 1 ? 'livro' : 'livros'}`}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <Loader2 size={24} style={{ color: C.muted, animation: 'spin 1s linear infinite' }}/>
          </div>
        )}

        {/* Empty state */}
        {!loading && books.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            border: `1px dashed ${C.border}`, borderRadius: 16,
          }}>
            <BookOpen size={40} style={{ color: C.faint, margin: '0 auto 20px' }}/>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
              Nenhum livro ainda
            </p>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
              Crie seu primeiro livro e veja cada página<br/>ganhar forma em tempo real.
            </p>
            <Link href="/new" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.accent, color: '#fff',
              padding: '12px 24px', borderRadius: 9,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              <Plus size={14}/>
              Criar primeiro livro
            </Link>
          </div>
        )}

        {/* Books grid */}
        {!loading && books.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {books.map((book) => {
              const dim = FORMAT_DIM[book.format] ?? FORMAT_DIM['14x21']
              const isDeleting = deleting === book.id
              const isOpening = opening === book.id
              return (
                <div
                  key={book.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    opacity: isDeleting ? 0.4 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderLight)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                >
                  {/* Book info row */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <BookThumbnail book={book}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-playfair)',
                        fontSize: 16, fontWeight: 700,
                        color: C.text, lineHeight: 1.3,
                        marginBottom: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {book.title}
                      </p>
                      <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{book.author}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: C.surface, color: C.muted,
                          border: `1px solid ${C.border}`,
                        }}>
                          {dim.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  {(() => {
                    const { pct, message } = getProgress(book.word_count)
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 10, color: C.muted }}>
                            {book.word_count.toLocaleString('pt-BR')} / {WORDS_TARGET.toLocaleString('pt-BR')} palavras
                          </span>
                          <span style={{ fontSize: 10, color: pct >= 100 ? C.accentLight : C.muted, fontWeight: 600 }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 4,
                            background: pct >= 100
                              ? `linear-gradient(90deg, ${C.accent}, ${C.accentLight})`
                              : pct >= 65
                              ? `linear-gradient(90deg, ${C.accent}88, ${C.accent})`
                              : `${C.accent}55`,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <p style={{ fontSize: 10, color: C.muted, marginTop: 5, fontStyle: 'italic', lineHeight: 1.4 }}>
                          {message}
                        </p>
                      </div>
                    )
                  })()}

                  {/* Date */}
                  <p style={{ fontSize: 11, color: C.faint }}>
                    Atualizado em {fmt(book.updated_at)}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpen(book)}
                      disabled={isOpening || !!deleting}
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '9px 0', borderRadius: 8,
                        background: C.accent, color: '#fff',
                        border: 'none', cursor: isOpening ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 500,
                        opacity: isOpening ? 0.7 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (!isOpening) e.currentTarget.style.background = C.accentLight }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.accent }}
                    >
                      {isOpening ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <ArrowRight size={13}/>}
                      {isOpening ? 'Abrindo...' : 'Continuar escrevendo'}
                    </button>
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      disabled={!!deleting}
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: 'transparent', color: C.faint,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7a2020'; e.currentTarget.style.color = '#f08080' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.faint }}
                      title="Excluir livro"
                    >
                      {isDeleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <Trash2 size={13}/>}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* New book card */}
            <Link
              href="/new"
              style={{
                background: 'transparent',
                border: `1px dashed ${C.border}`,
                borderRadius: 14,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                textDecoration: 'none',
                minHeight: 160,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = `${C.accent}08` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: C.surface, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={16} style={{ color: C.muted }}/>
              </div>
              <span style={{ fontSize: 13, color: C.muted }}>Novo livro</span>
            </Link>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
