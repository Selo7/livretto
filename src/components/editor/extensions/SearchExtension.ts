import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { Node } from 'prosemirror-model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (term: string) => ReturnType
      findNext: () => ReturnType
      findPrev: () => ReturnType
    }
  }
}

export interface SearchMatch { from: number; to: number }

interface SearchPluginState {
  term: string
  matches: SearchMatch[]
  currentIdx: number
  decorations: DecorationSet
}

export const searchPluginKey = new PluginKey<SearchPluginState>('searchHighlight')

function findMatches(doc: Node, term: string): SearchMatch[] {
  if (!term) return []
  const matches: SearchMatch[] = []
  const lower = term.toLowerCase()
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text.toLowerCase()
    let i = 0
    while ((i = text.indexOf(lower, i)) !== -1) {
      matches.push({ from: pos + i, to: pos + i + term.length })
      i++
    }
  })
  return matches
}

function buildDecorations(doc: Node, matches: SearchMatch[], currentIdx: number): DecorationSet {
  if (!matches.length) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    matches.map((m, i) =>
      Decoration.inline(m.from, m.to, {
        class: i === currentIdx ? 'search-current' : 'search-match',
      })
    )
  )
}

export const SearchExtension = Extension.create({
  name: 'searchHighlight',

  addCommands() {
    return {
      setSearchTerm: (term) => ({ tr, dispatch }) => {
        const matches = findMatches(tr.doc, term)
        const currentIdx = matches.length > 0 ? 0 : -1
        tr.setMeta(searchPluginKey, { term, matches, currentIdx })
        if (matches.length > 0) {
          tr.setSelection(TextSelection.create(tr.doc, matches[0].from, matches[0].to))
            .scrollIntoView()
        }
        if (dispatch) dispatch(tr)
        return true
      },

      findNext: () => ({ tr, dispatch, state }) => {
        const s = searchPluginKey.getState(state)
        if (!s || !s.matches.length) return false
        const nextIdx = s.currentIdx < 0 ? 0 : (s.currentIdx + 1) % s.matches.length
        const match = s.matches[nextIdx]
        tr.setMeta(searchPluginKey, { term: s.term, matches: s.matches, currentIdx: nextIdx })
        tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView()
        if (dispatch) dispatch(tr)
        return true
      },

      findPrev: () => ({ tr, dispatch, state }) => {
        const s = searchPluginKey.getState(state)
        if (!s || !s.matches.length) return false
        const prevIdx = s.currentIdx <= 0 ? s.matches.length - 1 : s.currentIdx - 1
        const match = s.matches[prevIdx]
        tr.setMeta(searchPluginKey, { term: s.term, matches: s.matches, currentIdx: prevIdx })
        tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView()
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init: (): SearchPluginState => ({
            term: '',
            matches: [],
            currentIdx: -1,
            decorations: DecorationSet.empty,
          }),
          apply(tr, prev): SearchPluginState {
            const meta = tr.getMeta(searchPluginKey)
            if (meta) {
              const { term, matches, currentIdx } = meta
              return { term, matches, currentIdx, decorations: buildDecorations(tr.doc, matches, currentIdx) }
            }
            if (tr.docChanged && prev.term) {
              const matches = findMatches(tr.doc, prev.term)
              return { ...prev, matches, decorations: buildDecorations(tr.doc, matches, prev.currentIdx) }
            }
            return prev
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export function getSearchState(editor: { state: Parameters<typeof searchPluginKey.getState>[0] } | null) {
  if (!editor) return { matches: [] as SearchMatch[], currentIdx: -1, term: '' }
  return searchPluginKey.getState(editor.state) ?? { matches: [] as SearchMatch[], currentIdx: -1, term: '' }
}
