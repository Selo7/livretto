export type BookFormat = '14x21' | '15x23' | 'a5' | 'pocket' | 'abnt' | 'kdp'

export type BookCategory = 'ficcao' | 'nao-ficcao' | 'academico' | 'infantojuvenil' | 'poesia'

export type BookStatus = 'escrevendo' | 'revisao' | 'publicado'

export const SUBCATEGORIAS: Record<BookCategory, string[]> = {
  'ficcao':         ['Romance', 'Thriller', 'Fantasia', 'Ficção científica', 'Conto', 'Horror', 'Mistério', 'Aventura'],
  'nao-ficcao':     ['Auto-ajuda', 'Negócios', 'Economia', 'Biografia', 'História', 'Saúde', 'Espiritualidade', 'Política'],
  'academico':      ['TCC', 'Dissertação', 'Tese', 'Ensaio', 'Artigo científico'],
  'infantojuvenil': ['Infantil', 'Juvenil', 'Paradidático', 'Fábula'],
  'poesia':         ['Poesia', 'Crônica', 'Conto literário', 'Haiku'],
}

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'image' | 'footnote'

export type NodeType = 'character' | 'place' | 'event' | 'theme' | 'chapter'

export type MapNodeType = 'personagem' | 'lugar' | 'evento' | 'objeto' | 'capitulo' | 'personalizado'

export interface StoredMapNode {
  id: string
  nodeType: MapNodeType
  label: string
  typeLabel?: string
  description?: string
  color?: string
  x: number
  y: number
}

export interface StoredMapEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface Book {
  id: string
  title: string
  author: string
  format: BookFormat
  language: string
  cover_url?: string
  back_cover_url?: string
  cover_config?: CoverConfig
  word_count: number
  daily_goal: number
  streak: number
  last_written_at?: string
  // Publicação
  category?: BookCategory
  subcategory?: string
  synopsis?: string
  keywords?: string[]
  price?: number
  territory?: 'brasil' | 'mundial'
  status?: BookStatus
  published_at?: string
  body_font?: string        // ID de BookFont (src/lib/fonts.ts)
  custom_fonts?: { name: string; dataUrl: string }[]
  created_at: string
  updated_at: string
  user_id: string
}

export type ChapterOpeningStyle = 'nenhum' | 'simples' | 'epigrafe' | 'ilustrado' | 'pagina-inteira'

export interface ChapterFootnote {
  num: number
  content: string
}

export interface Chapter {
  id: string
  book_id: string
  title: string
  order: number
  content: object // TipTap JSON
  content_html?: string
  word_count: number
  opening_style?: ChapterOpeningStyle
  opening_image?: string
  opening_epigraph?: string
  opening_epigraph_author?: string
  numbered?: boolean
  chapter_num?: string  // número exibido na intercapa; vazio = automático
  footnotes?: ChapterFootnote[]
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  book_id: string
  name: string
  avatar_url?: string
  age?: string
  description?: string
  motivation?: string
  arc?: string
  map_x?: number
  map_y?: number
  created_at: string
}

export interface CharacterRelationship {
  id: string
  book_id: string
  source_id: string
  target_id: string
  label: string
}

export interface MapNode {
  id: string
  book_id: string
  type: NodeType
  label: string
  data?: Record<string, unknown>
  x: number
  y: number
}

export interface MapEdge {
  id: string
  book_id: string
  source: string
  target: string
  label?: string
}

export interface CoverConfig {
  type: 'upload' | 'builder'
  background_color?: string
  text_color?: string
  title_size?: number
  author_size?: number
  title_position?: 'top' | 'center' | 'bottom'
}

export interface WritingSession {
  book_id: string
  words_written: number
  date: string
}

export type AppMode = 'write' | 'map' | 'structure'
