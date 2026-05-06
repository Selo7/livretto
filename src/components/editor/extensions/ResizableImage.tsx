'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// NodeView
// ---------------------------------------------------------------------------

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const [resizing, setResizing] = useState(false)
  const startRef = useRef({ x: 0, width: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const w = imgRef.current?.offsetWidth ?? (node.attrs.width as number | null) ?? 300
    startRef.current = { x: e.clientX, width: w }
    setResizing(true)
  }

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startRef.current.x
      updateAttributes({ width: Math.max(80, Math.round(startRef.current.width + delta)) })
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, updateAttributes])

  const align = (node.attrs.align as string) ?? 'left'
  const width = node.attrs.width as number | null

  const justifyMap: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  }

  return (
    <NodeViewWrapper>
      <div style={{ display: 'flex', justifyContent: justifyMap[align] ?? 'flex-start', width: '100%', position: 'relative', userSelect: 'none' }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>

          {/* Toolbar de alinhamento (aparece quando selecionado) */}
          {selected && (
            <div style={{
              position: 'absolute', top: -36, left: 0, display: 'flex', gap: 2,
              background: 'var(--background, #fff)', border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              padding: '2px 4px', zIndex: 50, pointerEvents: 'all',
            }}>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: a }) }}
                  style={{
                    padding: '3px 5px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: align === a ? 'var(--accent, #f1f5f9)' : 'transparent',
                    display: 'flex', alignItems: 'center', color: 'var(--foreground, #0f172a)',
                  }}
                >
                  {a === 'left' ? <AlignLeft size={11} /> : a === 'center' ? <AlignCenter size={11} /> : <AlignRight size={11} />}
                </button>
              ))}
              <div style={{ width: 1, background: 'var(--border, #e2e8f0)', margin: '2px 2px' }} />
              <span style={{ fontSize: 10, color: 'var(--muted-foreground, #64748b)', padding: '3px 4px', alignSelf: 'center' }}>
                {width ? `${width}px` : 'auto'}
              </span>
            </div>
          )}

          {/* Imagem */}
          <img
            ref={imgRef}
            src={node.attrs.src as string}
            alt={(node.attrs.alt as string) ?? ''}
            draggable={false}
            style={{
              width: width ? `${width}px` : 'auto',
              maxWidth: '100%',
              display: 'block',
              outline: selected ? '2px solid rgba(99,102,241,0.55)' : 'none',
              outlineOffset: 2,
              borderRadius: 2,
              cursor: resizing ? 'se-resize' : 'default',
            }}
          />

          {/* Handle de redimensionamento */}
          {selected && (
            <div
              onMouseDown={handleResizeStart}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 18, height: 18,
                background: 'rgba(99,102,241,0.85)',
                borderTopLeftRadius: 4,
                cursor: 'se-resize',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <line x1="2" y1="8" x2="8" y2="2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="5" y1="8" x2="8" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// ---------------------------------------------------------------------------
// Extensão TipTap
// ---------------------------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; width?: number; align?: string }) => ReturnType
    }
  }
}

export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: 'left' },
    }
  },

  parseHTML() {
    return [{ tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { align, width, ...rest } = HTMLAttributes
    const styles: string[] = []
    if (width) styles.push(`width:${width}px`)
    styles.push('max-width:100%', 'display:block')
    if (align === 'center') styles.push('margin:0 auto')
    else if (align === 'right') styles.push('margin-left:auto')
    return ['img', mergeAttributes(rest, { style: styles.join(';'), draggable: 'false' })]
  },

  addCommands() {
    return {
      setResizableImage: (options) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: options })
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
