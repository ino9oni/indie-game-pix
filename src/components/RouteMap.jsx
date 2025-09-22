import React, { useEffect, useMemo, useRef, useState } from "react";

// Route map with neighbor-only movement, hero sprite, and animated traversal
export default function RouteMap({
  graph,
  current,
  last,
  debugMode,
  onArrive,
  onMoveStart,
}) {
  const nodes = graph.nodes;
  const edges = graph.edges;
  const heroImg = "/assets/img/character/hero/00083-826608146.png";

  const adj = useMemo(() => {
    const m = {};
    for (const e of edges) {
      (m[e.from] ||= new Set()).add(e.to);
      (m[e.to] ||= new Set()).add(e.from);
    }
    return m;
  }, [edges]);

  const [animating, setAnimating] = useState(false);
  const [heroPos, setHeroPos] = useState(() => nodes[current] || { x: 0, y: 0 });
  const [bubble, setBubble] = useState(null);

  const heroPosRef = useRef(heroPos);
  useEffect(() => {
    heroPosRef.current = heroPos;
  }, [heroPos]);

  const bubbleTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (animating) return;
    const node = nodes[current];
    if (!node) return;
    const { x, y } = heroPosRef.current;
    if (x !== node.x || y !== node.y) {
      setHeroPos(node);
    }
  }, [current, nodes, animating]);

  const canClick = (id) => {
    if (animating) return false;
    if (id === current) return false;
    if (debugMode) return true;
    if (last && id === last) return false;
    return Boolean(adj[current]?.has(id));
  };

  const pathD = (from, to) => {
    const a = nodes[from];
    const b = nodes[to];
    if (!a || !b) return "";
    return `M ${a.x} ${a.y} L ${b.x} ${a.y} L ${b.x} ${b.y}`;
  };

  const cancelAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    }
  };

  const beginTravel = (targetId) => {
    cancelAnimation();
    setBubble(null);

    const from = heroPosRef.current || nodes[current];
    const to = nodes[targetId];
    if (!from || !to) {
      setHeroPos(to || from || { x: 0, y: 0 });
      setAnimating(false);
      if (onArrive) onArrive(targetId);
      return;
    }

    const horizontal = to.x - from.x;
    const vertical = to.y - from.y;
    const segments = [];
    if (horizontal !== 0) {
      segments.push({
        axis: "x",
        start: { x: from.x, y: from.y },
        end: { x: to.x, y: from.y },
        length: Math.abs(horizontal),
      });
    }
    if (vertical !== 0) {
      segments.push({
        axis: "y",
        start: { x: to.x, y: from.y },
        end: { x: to.x, y: to.y },
        length: Math.abs(vertical),
      });
    }

    const totalLength = segments.reduce((acc, seg) => acc + seg.length, 0);
    if (totalLength === 0) {
      setHeroPos(to);
      setAnimating(false);
      if (onArrive) onArrive(targetId);
      return;
    }

    setAnimating(true);
    const duration = 2000; // ms
    const startRef = { value: null };

    const step = (timestamp) => {
      if (!startRef.value) startRef.value = timestamp;
      const progress = Math.min(1, (timestamp - startRef.value) / duration);
      let distance = totalLength * progress;
      let position = { x: from.x, y: from.y };

      for (const seg of segments) {
        if (seg.length === 0) {
          position = { ...seg.end };
          continue;
        }
        if (distance <= seg.length) {
          const ratio = distance / seg.length;
          if (seg.axis === "x") {
            position = {
              x: seg.start.x + (seg.end.x - seg.start.x) * ratio,
              y: seg.start.y,
            };
          } else {
            position = {
              x: seg.start.x,
              y: seg.start.y + (seg.end.y - seg.start.y) * ratio,
            };
          }
          break;
        }
        distance -= seg.length;
        position = { ...seg.end };
      }

      if (mountedRef.current) {
        setHeroPos(position);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        animFrameRef.current = null;
        if (!mountedRef.current) return;
        setHeroPos(to);
        setBubble({ x: to.x, y: to.y });
        bubbleTimerRef.current = setTimeout(() => {
          bubbleTimerRef.current = null;
          if (!mountedRef.current) return;
          setBubble(null);
          setAnimating(false);
          if (onArrive) onArrive(targetId);
        }, 820);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  return (
    <main className="screen route">
      <div className="route-canvas">
        <svg viewBox="0 0 800 400" className="route-svg">
          {edges.map((e, i) => (
            <path
              key={i}
              d={pathD(e.from, e.to)}
              className="route-edge"
              fill="none"
            />
          ))}
          {Object.entries(nodes).map(([id, n]) => {
            const label = n.label || id;
            const w = Math.max(40, (label.length || 1) * 8);
            const h = 16;
            const rx = 6;
            const lx = n.x - w / 2;
            const ly = n.y + 22;
            return (
              <g
                key={id}
                onClick={() => {
                  if (!canClick(id)) return;
                  if (onMoveStart) onMoveStart(id);
                  beginTravel(id);
                }}
                style={{
                  cursor: canClick(id) ? "pointer" : "default",
                  opacity: canClick(id) ? 1 : 0.6,
                }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={16}
                  className={`route-node ${current === id ? "current" : ""} ${n.type}`}
                />
                {/* Label box under node */}
                <rect
                  x={lx}
                  y={ly}
                  width={w}
                  height={h}
                  rx={rx}
                  ry={rx}
                  fill="#fff"
                  stroke="#000"
                  strokeWidth="1"
                />
                <text
                  x={n.x}
                  y={ly + 12}
                  textAnchor="middle"
                  className="route-label"
                  fill="#000"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {bubble && (
            <g
              className="encount-bubble"
              transform={`translate(${bubble.x} ${bubble.y - 36})`}
              pointerEvents="none"
            >
              <rect x={-56} y={-28} width={112} height={28} rx={10} ry={10} />
              <polygon points="0,0 -8,12 8,12" className="bubble-tail" />
              <text x={0} y={-10} textAnchor="middle">
                Enemy Encount!
              </text>
            </g>
          )}
          {(() => {
            const p = heroPos || nodes[current] || { x: 0, y: 0 };
            return (
              <image
                href={heroImg}
                x={p.x - 10}
                y={p.y - 30}
                width="20"
                height="60"
                preserveAspectRatio="xMidYMid meet"
              />
            );
          })()}
        </svg>
      </div>
    </main>
  );
}
