import React, { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'

import { type PertNodeData, type PertEdgeData } from '@/types'

interface PertChartProps {
  nodes: PertNodeData[]
  edges: PertEdgeData[]
}

// Custom Node Component
const CustomNode = ({ data }: { data: PertNodeData }) => {
  return (
    <div className={cn(
      "w-[200px] rounded-2xl border-2 p-4 shadow-sm transition-all",
      data.is_critical ? "border-rose-500 bg-rose-50" : "border-zinc-200 bg-white"
    )}>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
          data.is_critical ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-600"
        )}>
          {data.is_critical ? "Critical Path" : "Task"}
        </span>
        <span className="text-[10px] font-bold text-zinc-400">ID: {data.id.substring(0, 4)}</span>
      </div>
      
      <h3 className={cn(
        "text-sm font-black tracking-tight mb-4",
        data.is_critical ? "text-rose-900" : "text-zinc-900"
      )}>
        {data.title}
      </h3>
      
      <div className="grid grid-cols-2 gap-2 text-[10px] font-medium font-mono bg-zinc-50/50 p-2 rounded-xl">
        <div className="text-emerald-600">ES: {data.es.toFixed(1)}</div>
        <div className="text-emerald-600">EF: {data.ef.toFixed(1)}</div>
        <div className="text-amber-600">LS: {data.ls.toFixed(1)}</div>
        <div className="text-amber-600">LF: {data.lf.toFixed(1)}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

const PertChart: React.FC<PertChartProps> = ({ nodes: initialNodes, edges: initialEdges }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PertNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const getLayoutedElements = useCallback((rawNodes: PertNodeData[], rawEdges: PertEdgeData[]) => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    
    // Set direction Top-to-Bottom
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 })

    rawNodes.forEach(node => {
      dagreGraph.setNode(node.id, { width: 200, height: 160 })
    })

    rawEdges.forEach(edge => {
      dagreGraph.setEdge(edge.from, edge.to)
    })

    dagre.layout(dagreGraph)

    const layoutedNodes = rawNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)
      return {
        id: node.id,
        type: 'custom',
        position: {
          x: nodeWithPosition.x - 100, // subtract half width
          y: nodeWithPosition.y - 80, // subtract half height
        },
        data: node,
      }
    })

    const layoutedEdges = rawEdges.map((edge) => {
      const sourceNode = rawNodes.find(n => n.id === edge.from)
      const targetNode = rawNodes.find(n => n.id === edge.to)
      const isCritical = sourceNode?.is_critical && targetNode?.is_critical
      
      return {
        id: `e-${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        type: 'smoothstep',
        animated: !!isCritical,
        style: { 
          stroke: isCritical ? '#f43f5e' : '#e4e4e7',
          strokeWidth: isCritical ? 3 : 2
        },
      }
    })

    return { layoutedNodes, layoutedEdges }
  }, [])

  useEffect(() => {
    const { layoutedNodes, layoutedEdges } = getLayoutedElements(initialNodes, initialEdges)
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [initialNodes, initialEdges, getLayoutedElements, setNodes, setEdges])

  if (initialNodes.length === 0) {
    return <div className="text-center p-12 text-zinc-400 font-medium italic">No dependency data available</div>
  }

  return (
    <div className="w-full h-[600px] bg-zinc-50 rounded-3xl border border-zinc-200 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-zinc-50"
      >
        <Controls className="bg-white border-zinc-200 shadow-lg rounded-xl" />
        <MiniMap 
          nodeColor={n => n.data.is_critical ? '#f43f5e' : '#e4e4e7'}
          maskColor="rgba(250, 250, 250, 0.7)"
          className="bg-white border border-zinc-200 rounded-xl shadow-lg"
        />
        <Background color="#e4e4e7" gap={16} />
        
        <Panel position="top-right" className="bg-white p-3 rounded-2xl shadow-lg border border-zinc-100 flex items-center gap-3 m-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
            <div className="w-3 h-3 rounded-full bg-zinc-200" /> Standard Path
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /> Critical Path
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md ml-2">
            <Zap size={12} /> Auto-Layout Active
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default PertChart
