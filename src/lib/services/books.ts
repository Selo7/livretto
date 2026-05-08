import { createClient } from '@/lib/supabase/client'
import { Book } from '@/types/book'

type BookInsert = Omit<Book, 'user_id'>
type BookUpdate = Partial<Omit<Book, 'id' | 'user_id' | 'created_at'>>

export async function fetchBooks(): Promise<Book[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*, chapters(word_count)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  // Compute word_count as sum of chapters (the books.word_count column is stale)
  return (data ?? []).map((b: Record<string, unknown>) => {
    const { chapters, ...book } = b
    const word_count = ((chapters as { word_count: number }[]) ?? [])
      .reduce((sum, c) => sum + (c.word_count ?? 0), 0)
    return { ...book, word_count } as Book
  })
}

export async function fetchBook(id: string): Promise<Book | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Book
}

export async function createBook(book: BookInsert): Promise<Book> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('books')
    .insert({ ...book, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Book
}

export async function updateBook(id: string, patch: BookUpdate): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('books')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function deleteBook(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function upsertBook(book: BookInsert): Promise<Book> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('books')
    .upsert({ ...book, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Book
}
