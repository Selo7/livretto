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
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AreaLabel } from '@/components/ui/area-label'

interface MapNodeData extends Record<string, unknown> {
  label: string
  description?: string
  nodeType: MapNodeType
}

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
  return (
    <div
      className="rounded-lg border-2 shadow-md bg-white dark:bg-zinc-900 min-w-32 max-w-48 overflow-hidden"
      style={{ borderColor: selected ? '#6366f1' : cfg.border }}
    >
      <Handle type="target" position={Position.Top}    id="t" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="target" position={Position.Left}   id="l" style={{ background: '#888', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: '#888', width: 8, height: 8 }} />
      <div className={cn('px-3 py-1 text-xs font-semibold', cfg.header)}>
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
  return {
    id: n.id,
    type: 'mapNode',
    position: { x: n.x, y: n.y },
    data: { label: n.label, description: n.description, nodeType: n.nodeType } as MapNodeData,
  }
}

function toRFEdge(e: StoredMapEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 1.5 },
  }
}

function fromRFNode(n: Node): StoredMapNode {
  const d = n.data as MapNodeData
  return { id: n.id, nodeType: d.nodeType, label: d.label, description: d.description, x: n.position.x, y: n.position.y }
}

function fromRFEdge(e: Edge): StoredMapEdge {
  return { id: e.id, source: e.source, target: e.target, label: typeof e.label === 'string' ? e.label : undefined }
}

export function ModoMapa() {
  const activeBook = useEditorStore(s => s.activeBook)
  const mapData    = useEditorStore(s => s.mapData)
  const setMapNodes = useEditorStore(s => s.setMapNodes)
  const setMapEdges = useEditorStore(s => s.setMapEdges)
  const bookId = activeBook?.id ?? ''

  const mapDataRef = useRef(mapData)
  mapDataRef.current = mapData

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const selectedData = selectedNode?.data as MapNodeData | undefined

  // Carrega do store quando o livro muda
  useEffect(() => {
    const stored = mapDataRef.current[bookId] ?? { nodes: [], edges: [] }
    setNodes(stored.nodes.map(toRFNode))
    setEdges(stored.edges.map(toRFEdge))
    setSelectedNodeId(null)
  }, [bookId, setNodes, setEdges])

  // Sincroniza nós com o store
  useEffect(() => {
    if (!bookId) return
    setMapNodes(bookId, nodes.map(fromRFNode))
  }, [nodes, bookId, setMapNodes])

  // Sincroniza arestas com o store
  useEffect(() => {
    if (!bookId) return
    setMapEdges(bookId, edges.map(fromRFEdge))
  }, [edges, bookId, setMapEdges])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.5 },
    }, eds))
  }, [setEdges])

  function addNode(nodeType: MapNodeType) {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type: 'mapNode',
      position: { x: 180 + Math.random() * 320, y: 80 + Math.random() * 260 },
      data: { label: `Novo ${NODE_CONFIG[nodeType].label}`, nodeType } as MapNodeData,
    }
    setNodes(nds => [...nds, newNode])
    setSelectedNodeId(id)
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId))
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  function updateSelectedNode(patch: Partial<MapNodeData>) {
    if (!selectedNodeId) return
    setNodes(nds => nds.map(n =>
      n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n
    ))
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-background flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-border shrink-0">
          <AreaLabel>Mapa Mental</AreaLabel>
        </div>

        <div className="p-3 border-b border-border shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar elemento</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(NODE_CONFIG) as [MapNodeType, typeof NODE_CONFIG[MapNodeType]][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80',
                  cfg.header,
                )}
              >
                <Plus size={11} />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {selectedData ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Editar elemento</p>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-xs text-muted-foreground hover:text-foreground w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <input
                className="w-full h-7 rounded-md border border-border bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedData.label}
                onChange={e => updateSelectedNode({ label: e.target.value })}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                className="w-full h-7 rounded-md border border-border bg-background text-xs px-1.5 focus:outline-none cursor-pointer"
                value={selectedData.nodeType}
                onChange={e => updateSelectedNode({ nodeType: e.target.value as MapNodeType })}
              >
                {(Object.entries(NODE_CONFIG) as [MapNodeType, typeof NODE_CONFIG[MapNodeType]][]).map(([v, cfg]) => (
                  <option key={v} value={v}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <textarea
                className="w-full rounded-md border border-border bg-background text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={4}
                value={selectedData.description ?? ''}
                onChange={e => updateSelectedNode({ description: e.target.value })}
                placeholder="Descreva este elemento..."
              />
            </div>

            <button
              onClick={deleteSelectedNode}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md border border-destructive/50 text-destructive text-xs hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={12} />
              Excluir elemento
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Clique em um elemento para editar seus detalhes
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
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          deleteKeyCode={null}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 1.5 },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#94a3b8" className="opacity-30" />
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
