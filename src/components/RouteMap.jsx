import React from 'react'

// Minimal route map using fixed layout + SVG
export default function RouteMap({ graph, current, onNode }) {
  const nodes = graph.nodes
  const edges = graph.edges
  return (
    <main className="screen route">
      <div className="route-canvas">
        <svg viewBox="0 0 800 400" className="route-svg">
          {edges.map((e, i) => (
            <path
              key={i}
              d={`M ${nodes[e.from].x} ${nodes[e.from].y} C ${(nodes[e.from].x + nodes[e.to].x)/2} ${nodes[e.from].y - 60}, ${(nodes[e.from].x + nodes[e.to].x)/2} ${nodes[e.to].y + 60}, ${nodes[e.to].x} ${nodes[e.to].y}`}
              className="route-edge"
              fill="none"
            />
          ))}
          {Object.entries(nodes).map(([id, n]) => (
            <g key={id} onClick={() => onNode(id)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={16} className={`route-node ${current===id?'current':''} ${n.type}`} />
              <text x={n.x} y={n.y - 22} textAnchor="middle" className="route-label">{n.label || id}</text>
            </g>
          ))}
        </svg>
      </div>
    </main>
  )
}

