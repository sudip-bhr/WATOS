import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Node {
  id: string
  title: string
  es: number
  ef: number
  ls: number
  lf: number
  is_critical: boolean
}

interface Edge {
  from: string
  to: string
}

interface PertChartProps {
  nodes: Node[]
  edges: Edge[]
}

const PertChart: React.FC<PertChartProps> = ({ nodes, edges }) => {
  // Simple Layered Layout
  // In a real app, we'd use dagre or a similar layout engine, 
  // but we'll build a custom one for the "Premium SVG" feel.
  
  const layout = useMemo(() => {
    const levels: string[][] = []
    
    // Group nodes by ES (Earliest Start) to create columns
    const sortedNodes = [...nodes].sort((a, b) => a.es - b.es)
    
    let currentLevel: string[] = []
    let currentES = -1
    
    sortedNodes.forEach(node => {
      if (node.es !== currentES) {
        if (currentLevel.length > 0) levels.push(currentLevel)
        currentLevel = [node.id]
        currentES = node.es
      } else {
        currentLevel.push(node.id)
      }
    })
    if (currentLevel.length > 0) levels.push(currentLevel)
    
    const nodePositions = new Map<string, { x: number, y: number }>()
    
    // Scale spacing based on project size
    const isLarge = nodes.length > 25
    const colWidth = isLarge ? 180 : 220
    const rowHeight = isLarge ? 100 : 120
    const nodeScale = isLarge ? 0.85 : 1
    
    levels.forEach((level, xIdx) => {
      level.forEach((nodeId, yIdx) => {
        nodePositions.set(nodeId, {
          x: xIdx * colWidth + 50,
          y: yIdx * rowHeight + 50
        })
      })
    })
    
    return { positions: nodePositions, levels, nodeScale, colWidth, rowHeight }
  }, [nodes])

  if (nodes.length === 0) return <div className="text-center p-12 text-zinc-400 font-medium italic">No dependency data available</div>

  const width = layout.levels.length * layout.colWidth + 150
  const height = Math.max(...layout.levels.map(l => l.length)) * layout.rowHeight + 100
  return (
    <div className="w-full overflow-auto bg-zinc-50/50 rounded-2xl border border-zinc-200 p-8 custom-scrollbar">
      <svg 
        width={width} 
        height={height}
        className="mx-auto transition-all duration-500"
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" className="fill-zinc-300" />
          </marker>
          <marker id="arrow-critical" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" className="fill-zinc-900" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const start = layout.positions.get(edge.from)
          const end = layout.positions.get(edge.to)
          if (!start || !end) return null
          
          const startNode = nodes.find(n => n.id === edge.from)
          const endNode = nodes.find(n => n.id === edge.to)
          const isCritical = startNode?.is_critical && endNode?.is_critical
          
          const nodeWidth = 160 * layout.nodeScale
          
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={`M ${start.x + nodeWidth} ${start.y + 40 * layout.nodeScale} L ${end.x} ${end.y + 40 * layout.nodeScale}`}
              className={isCritical 
                ? "stroke-zinc-900" 
                : "stroke-zinc-200"}
              strokeWidth={isCritical ? 2.5 : 1}
              fill="none"
              markerEnd={isCritical ? "url(#arrow-critical)" : "url(#arrow)"}
              strokeDasharray={isCritical ? "0" : "4 2"}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = layout.positions.get(node.id)
          if (!pos) return null
          
          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y}) scale(${layout.nodeScale})`}>
              <rect
                width={160}
                height={80}
                rx={12}
                className={node.is_critical 
                  ? "fill-zinc-900 stroke-none shadow-2xl" 
                  : "fill-white stroke-zinc-200"}
              />
              {/* Node Header */}
              <text x={12} y={24} className={cn(
                "text-[10px] font-black uppercase tracking-tight",
                node.is_critical ? "fill-white" : "fill-zinc-900"
              )}>
                {node.title.length > 20 ? node.title.substring(0, 18) + '...' : node.title}
              </text>
              
              {/* Times */}
              <g className={cn(
                "text-[9px] font-bold",
                node.is_critical ? "fill-white/70" : "fill-zinc-400"
              )}>
                <text x={12} y={48}>ES: {Math.round(node.es)}h</text>
                <text x={84} y={48}>EF: {Math.round(node.ef)}h</text>
                <text x={12} y={64}>LS: {Math.round(node.ls)}h</text>
                <text x={84} y={64}>LF: {Math.round(node.lf)}h</text>
              </g>

              {/* Critical Indicator Dot */}
              {node.is_critical && (
                <circle cx={148} cy={12} r={3} className="fill-white animate-pulse" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default PertChart
