import { createClient } from '@/lib/supabase/client'
import { Chapter } from '@/types/book'

type ChapterInsert = Omit<Chapter, 'user_id'>
type ChapterUpdate = Partial<Omit<Chapter, 'id' | 'user_id' | 'book_id' | 'created_at'>>

export async function fetchChapters(bookId: string): Promise<Chapter[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Chapter[]
}

export async function createChapter(chapter: ChapterInsert): Promise<Chapter> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('chapters')
    .insert({ ...chapter, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Chapter
}

export async function updateChapter(id: string, patch: ChapterUpdate): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chapters')
    .update(patch)
    .eq('id', id)
  if (error) throw error
}

export async function deleteChapter(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderChapters(updates: { id: string; order: number }[]): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    updates.map(({ id, order }) =>
      supabase.from('chapters').update({ order }).eq('id', id)
    )
  )
}

export async function upsertChapter(chapter: ChapterInsert): Promise<Chapter> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('chapters')
    .upsert({ ...chapter, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Chapter
}
