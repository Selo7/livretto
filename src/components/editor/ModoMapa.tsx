'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEditorStore } from '@/lib/store/editorStore'
import { type MapNodeType, type StoredMapNode, type StoredMapEdge } from '@/types/book'
import { Plus, Trash2, Undo2, Redo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AreaLabel } from '@/components/ui/area-label'

interface MapNodeData extends Record<string, unknown> {
  label: string
  description?: string
  nodeType: MapNodeType
  color?: string
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#64748b', '#1e293b', '#78350f',
]

const NODE_CONFIG: Record<MapNodeType, { label: string; header: string; border: string }> = {
  personagem: { label: 'Personagem', header: 'bg-blue-500 text-white',   border: '#3b82f6' },
  lugar:      { label: 'Lugar',      header: 'bg-green-500 text-white',  border: '#22c55e' },
  evento:     { label: 'Evento',     header: 'bg-orange-500 text-white', border: '#f97316' },
  objeto:     { label: 'Objeto',     header: 'bg-purple-500 text-white', border: '#a855f7' },
  capitulo:   { label: 'Capítulo',  header: 'bg-indigo-500 text-white', border: '#6366f1' },
}

function MapNodeComponent({ data, selected }: NodeProps) {
  const d = data as MapNodeData
  const cfg = NODE_CONFIG[d.nodeType] ?? NODE_CONFIG.personagem
  const headerColor = d.color ?? cfg.border
  return (
    <div
      className="rounded-lg border-2 shadow-md bg-white dark:bg-zinc-900 min-w-32 max-w-48 overflow-hidden"
      style={{ borderColor: selected ? '#6366f1' : headerColor }}
    >
      <Handle type="target" position={Position.Top}    id="t" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left}   id="l" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: '#888', width: 8, height: 8 }} />
      <div className="px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: headerColor }}>
        {cfg.label}
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium leading-tight">{d.label || 'Sem nome'}</p>
        {d.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug line-clamp-2">
            {d.description}
          </p>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { mapNode: MapNodeComponent }

function toRFNode(n: StoredMapNode): Node {
  return { id: n.id, type: 'mapNode', position: { x: n.x, y: n.y }, data: { label: n.label, description: n.description, nodeType: n.nodeType, color: n.color } as MapNodeData }
}

function toRFEdge(e: StoredMapEdge): Edge {
  return { id: e.id, source: e.source, target: e.target, label: e.label, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 } }
}

function fromRFNode(n: Node): StoredMapNode {
  const d = n.data as MapNodeData
  return { id: n.id, nodeType: d.nodeType, label: d.label, description: d.description, color: d.color, x: n.position.x, y: n.position.y }
}

function fromRFEdge(e: Edge): StoredMapEdge {
  return { id: e.id, source: e.source, target: e.target, label: typeof e.label === 'string' ? e.label : undefined }
}

interface HistoryEntry { nodes: Node[]; edges: Edge[] }

export function ModoMapa() {
  const activeBook  = useEditorStore(s => s.activeBook)
  const mapData     = useEditorStore(s => s.mapData)
  const setMapNodes = useEditorStore(s => s.setMapNodes)
  const setMapEdges = useEditorStore(s => s.setMapEdges)
  const bookId = activeBook?.id ?? ''

  const mapDataRef = useRef(mapData)
  mapDataRef.current = mapData

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Refs for stable access inside event handlers and keyboard listener
  const nodesRef    = useRef<Node[]>([])
  const edgesRef    = useRef<Edge[]>([])
  const historyRef  = useRef<HistoryEntry[]>([])
  const histIdxRef  = useRef(-1)
  const clipboard   = useRef<Node[]>([])
  const isUndoRedo  = useRef(false)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // Sync to store
  useEffect(() => { if (bookId) setMapNodes(bookId, nodes.map(fromRFNode)) }, [nodes, bookId, setMapNodes])
  useEffect(() => { if (bookId) setMapEdges(bookId, edges.map(fromRFEdge)) }, [edges, bookId, setMapEdges])

  function pushHistory(ns: Node[], es: Edge[]) {
    if (isUndoRedo.current) return
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    historyRef.current.push({ nodes: ns, edges: es })
    histIdxRef.current = historyRef.current.length - 1
    setCanUndo(histIdxRef.current > 0)
    setCanRedo(false)
  }

  function undo() {
    if (histIdxRef.current <= 0) return
    isUndoRedo.current = true
    histIdxRef.current--
    const { nodes: ns, edges: es } = historyRef.current[histIdxRef.current]
    setNodes([...ns])
    setEdges([...es])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setCanUndo(histIdxRef.current > 0)
    setCanRedo(true)
    setTimeout(() => { isUndoRedo.current = false }, 0)
  }

  function redo() {
    if (histIdxRef.current >= historyRef.current.length - 1) return
    isUndoRedo.current = true
    histIdxRef.current++
    const { nodes: ns, edges: es } = historyRef.current[histIdxRef.current]
    setNodes([...ns])
    setEdges([...es])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setCanUndo(true)
    setCanRedo(histIdxRef.current < historyRef.current.length - 1)
    setTimeout(() => { isUndoRedo.current = false }, 0)
  }

  // Load from store when bookId changes
  useEffect(() => {
    const stored = mapDataRef.current[bookId] ?? { nodes: [], edges: [] }
    const ns = stored.nodes.map(toRFNode)
    const es = stored.edges.map(toRFEdge)
    setNodes(ns)
    setEdges(es)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    historyRef.current = [{ nodes: ns, edges: es }]
    histIdxRef.current = 0
    setCanUndo(false)
    setCanRedo(false)
  }, [bookId, setNodes, setEdges])

  // Keyboard shortcuts — all functions used here are stable via refs
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !inInput) {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (ctrl && e.key === 'y' && !inInput) {
        e.preventDefault()
        redo()
        return
      }
      if (ctrl && e.key === 'c' && !inInput) {
        const sel = nodesRef.current.filter(n => n.selected)
        if (sel.length) clipboard.current = sel
        return
      }
      if (ctrl && e.key === 'v' && !inInput) {
        if (!clipboard.current.length) return
        const pasted = clipboard.current.map(n => ({
          ...n,
          id: crypto.randomUUID(),
          position: { x: n.position.x + 40, y: n.position.y + 40 },
          selected: false,
        }))
        const ns = [...nodesRef.current, ...pasted]
        setNodes(ns)
        pushHistory(ns, edgesRef.current)
        return
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => {
      const updated = addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 } }, eds)
      pushHistory(nodesRef.current, updated)
      return updated
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEdges])

  function addNode(nodeType: MapNodeType) {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id, type: 'mapNode',
      position: { x: 180 + Math.random() * 320, y: 80 + Math.random() * 260 },
      data: { label: `Novo ${NODE_CONFIG[nodeType].label}`, nodeType } as MapNodeData,
    }
    const ns = [...nodesRef.current, newNode]
    setNodes(ns)
    pushHistory(ns, edgesRef.current)
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return
    const ns = nodesRef.current.filter(n => n.id !== selectedNodeId)
    const es = edgesRef.current.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId)
    setNodes(ns)
    setEdges(es)
    pushHistory(ns, es)
    setSelectedNodeId(null)
  }

  function deleteSelectedEdge() {
    if (!selectedEdgeId) return
    const es = edgesRef.current.filter(e => e.id !== selectedEdgeId)
    setEdges(es)
    pushHistory(nodesRef.current, es)
    setSelectedEdgeId(null)
  }

  function updateSelectedNode(patch: Partial<MapNodeData>) {
    if (!selectedNodeId) return
    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n))
  }

  function updateEdgeLabel(label: string) {
    if (!selectedEdgeId) return
    setEdges(eds => eds.map(e => e.id === selectedEdgeId ? { ...e, label } : e))
  }

  // Push history when node drag ends
  const onNodeDragStop = useCallback((_: React.MouseEvent, __: Node, allNodes: Node[]) => {
    pushHistory(allNodes, edgesRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push history for keyboard deletes (fires after React Flow removes from state)
  const onNodesDelete = useCallback((deleted: Node[]) => {
    const ids = new Set(deleted.map(n => n.id))
    setTimeout(() => {
      const ns = nodesRef.current.filter(n => !ids.has(n.id))
      const es = edgesRef.current.filter(e => !ids.has(e.source) && !ids.has(e.target))
      pushHistory(ns, es)
      setSelectedNodeId(null)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const ids = new Set(deleted.map(e => e.id))
    setTimeout(() => {
      pushHistory(nodesRef.current, edgesRef.current.filter(e => !ids.has(e.id)))
      setSelectedEdgeId(null)
    }, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const selectedData = selectedNode?.data as MapNodeData | undefined
  const selectedEdge = edges.find(e => e.id === selectedEdgeId)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-background flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-border shrink-0">
          <AreaLabel>Mapa Mental</AreaLabel>
        </div>

        {/* Add nodes */}
        <div className="p-3 border-b border-border shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar elemento</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(NODE_CONFIG) as [MapNodeType, typeof NODE_CONFIG[MapNodeType]][]).map(([type, cfg]) => (
              <button key={type} onClick={() => addNode(type)}
                className={cn('flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80', cfg.header)}>
                <Plus size={11} />{cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex gap-1 p-2 border-b border-border shrink-0">
          <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)"
            className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors">
            <Undo2 size={13} /> Desfazer
          </button>
          <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)"
            className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors">
            <Redo2 size={13} /> Refazer
          </button>
        </div>

        {/* Edit panel */}
        {selectedData ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Editar elemento</p>
              <button onClick={() => setSelectedNodeId(null)} className="text-xs text-muted-foreground hover:text-foreground w-5 h-5 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <input
                className="w-full h-7 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedData.label}
                onChange={e => updateSelectedNode({ label: e.target.value })}
                onBlur={() => pushHistory(nodesRef.current, edgesRef.current)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                className="w-full h-7 rounded-md border border-border bg-background text-xs px-1.5 focus:outline-none cursor-pointer"
                value={selectedData.nodeType}
                onChange={e => { updateSelectedNode({ nodeType: e.target.value as MapNodeType }); setTimeout(() => pushHistory(nodesRef.current, edgesRef.current), 0) }}
              >
                {(Object.entries(NODE_CONFIG) as [MapNodeType, typeof NODE_CONFIG[MapNodeType]][]).map(([v, cfg]) => (
                  <option key={v} value={v}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cor</label>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map(hex => (
                  <button
                    key={hex}
                    title={hex}
                    onClick={() => { updateSelectedNode({ color: hex }); setTimeout(() => pushHistory(nodesRef.current, edgesRef.current), 0) }}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: hex, borderColor: selectedData.color === hex ? '#6366f1' : 'transparent' }}
                  />
                ))}
                <button
                  title="Cor padrão do tipo"
                  onClick={() => { updateSelectedNode({ color: undefined }); setTimeout(() => pushHistory(nodesRef.current, edgesRef.current), 0) }}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 text-[9px] font-bold flex items-center justify-center bg-muted text-muted-foreground transition-transform hover:scale-110',
                    !selectedData.color && 'border-primary'
                  )}
                >
                  A
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <textarea
                className="w-full rounded-md border border-border bg-background text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={4}
                value={selectedData.description ?? ''}
                onChange={e => updateSelectedNode({ description: e.target.value })}
                onBlur={() => pushHistory(nodesRef.current, edgesRef.current)}
                placeholder="Descreva este elemento..."
              />
            </div>
            <button onClick={deleteSelectedNode}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md border border-destructive/50 text-destructive text-xs hover:bg-destructive/10 transition-colors">
              <Trash2 size={12} /> Excluir elemento
            </button>
          </div>
        ) : selectedEdge ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Conexão</p>
              <button onClick={() => setSelectedEdgeId(null)} className="text-xs text-muted-foreground hover:text-foreground w-5 h-5 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rótulo</label>
              <input
                className="w-full h-7 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
                onChange={e => updateEdgeLabel(e.target.value)}
                onBlur={() => pushHistory(nodesRef.current, edgesRef.current)}
                placeholder="Ex: pai de, ama, rival..."
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">Pressione Delete para remover a conexão selecionada no canvas</p>
            </div>
            <button onClick={deleteSelectedEdge}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md border border-destructive/50 text-destructive text-xs hover:bg-destructive/10 transition-colors">
              <Trash2 size={12} /> Desconectar
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Clique em um elemento ou conexão para editar
            </p>
          </div>
        )}
      </aside>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null) }}
          onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null) }}
          onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null) }}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          deleteKeyCode="Delete"
          fitView
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#94a3b8" />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          {nodes.length === 0 && (
            <Panel position="top-center">
              <div className="bg-background border border-border rounded-xl px-6 py-4 text-center shadow-md mt-8">
                <p className="text-sm font-medium mb-1">Mapa mental vazio</p>
                <p className="text-xs text-muted-foreground max-w-48">
                  Adicione personagens, lugares e eventos usando o painel à esquerda
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}
