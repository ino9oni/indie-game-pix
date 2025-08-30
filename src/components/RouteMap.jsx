import React, { useEffect, useMemo, useRef, useState } from 'react'
import audio from '../audio/AudioManager.js'

// Route map with neighbor-only movement, hero sprite, and simple path animation
export default function RouteMap({ graph, current, last, onArrive }) {
  const nodes = graph.nodes
  const edges = graph.edges
  const [anim, setAnim] = useState(null) // { from, to, t }
  const rafRef = useRef(null)
  const heroImg = '/assets/img/character/hero/00083-826608146.png'

  const adj = useMemo(() => {
    const m = {}
    for (const e of edges) {
      ;(m[e.from] ||= new Set()).add(e.to)
      ;(m[e.to] ||= new Set()).add(e.from)
    }
    return m
  }, [edges])

  useEffect(() => {
    if (!anim) return
    const start = performance.now()
    const dur = 500
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setAnim((a) => (a ? { ...a, t } : null))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else {
        cancelAnimationFrame(rafRef.current)
        const to = anim.to
        setAnim(null)
        onArrive && onArrive(to)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [anim, onArrive])

  const canClick = (id) => {
    if (id === current) return false
    if (last && id === last) return false
    return Boolean(adj[current]?.has(id))
  }

  const pathD = (from, to) => {
    const a = nodes[from], b = nodes[to]
    const cx = (a.x + b.x) / 2
    return `M ${a.x} ${a.y} C ${cx} ${a.y - 60}, ${cx} ${b.y + 60}, ${b.x} ${b.y}`
  }

  const heroPos = () => {
    if (!anim) return nodes[current]
    const a = nodes[anim.from], b = nodes[anim.to]
    const t = anim.t
    const cx = (a.x + b.x) / 2
    const x = (1 - t) ** 3 * a.x + 3 * (1 - t) ** 2 * t * cx + 3 * (1 - t) * t ** 2 * cx + t ** 3 * b.x
    const y = (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * (a.y - 60) + 3 * (1 - t) * t ** 2 * (b.y + 60) + t ** 3 * b.y
    return { x, y }
  }

  return (
    <main className="screen route">
      <div className="route-canvas">
        <svg viewBox="0 0 800 400" className="route-svg">
          {edges.map((e, i) => (
            <path key={i} d={pathD(e.from, e.to)} className="route-edge" fill="none" />
          ))}
          {Object.entries(nodes).map(([id, n]) => {
            const label = n.label || id
            const w = Math.max(40, (label.length || 1) * 8)
            const h = 16
            const rx = 6
            const lx = n.x - w / 2
            const ly = n.y + 22
            return (
              <g
                key={id}
                onClick={() => {
                  if (!canClick(id) || anim) return
                  setAnim({ from: current, to: id, t: 0 })
                  audio.playMove()
                }}
                style={{ cursor: canClick(id) ? 'pointer' : 'default', opacity: canClick(id) ? 1 : 0.6 }}
              >
                <circle cx={n.x} cy={n.y} r={16} className={`route-node ${current === id ? 'current' : ''} ${n.type}`} />
                {/* Label box under node */}
                <rect x={lx} y={ly} width={w} height={h} rx={rx} ry={rx} fill="#fff" stroke="#000" strokeWidth="1" />
                <text x={n.x} y={ly + 12} textAnchor="middle" className="route-label" fill="#000">{label}</text>
              </g>
            )
          })}
          {(() => {
            const p = heroPos()
            return <image href={heroImg} x={p.x - 10} y={p.y - 30} width="20" height="60" preserveAspectRatio="xMidYMid meet" />
          })()}
        </svg>
      </div>
    </main>
  )
}
