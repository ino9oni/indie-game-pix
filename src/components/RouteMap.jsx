import React, { useEffect, useMemo, useRef, useState } from "react";

// Route map with neighbor-only movement, hero sprite, and animated traversal
const MAP_MARGIN = 48;
const MIN_VIEWBOX_WIDTH = 480;
const MIN_VIEWBOX_HEIGHT = 320;

const ENCOUNTER_SHARDS = [
  { key: "shard-1", rotate: -14, tx: "-12%", ty: "-6%", delay: "40ms" },
  { key: "shard-2", rotate: 9, tx: "8%", ty: "-10%", delay: "80ms" },
  { key: "shard-3", rotate: -4, tx: "-6%", ty: "10%", delay: "120ms" },
  { key: "shard-4", rotate: 16, tx: "10%", ty: "12%", delay: "160ms" },
  { key: "shard-5", rotate: 3, tx: "4%", ty: "-4%", delay: "0ms" },
];

export default function RouteMap({
  graph,
  current,
  last,
  cleared,
  debugMode,
  onArrive,
  onMoveStart,
}) {
  const nodes = graph?.nodes ?? {};
  const edges = graph?.edges ?? [];
  const parents = graph?.parents ?? {};
  const heroImg = "/assets/img/character/hero/00083-826608146.png";

  const viewBox = useMemo(() => {
    const points = Object.values(nodes).filter(
      (n) => Number.isFinite(n?.x) && Number.isFinite(n?.y),
    );
    if (points.length === 0) {
      return "0 0 800 400";
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const { x, y } of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    const paddedWidth = width + MAP_MARGIN * 2;
    const paddedHeight = height + MAP_MARGIN * 2;

    const finalWidth = Math.max(paddedWidth, MIN_VIEWBOX_WIDTH);
    const finalHeight = Math.max(paddedHeight, MIN_VIEWBOX_HEIGHT);

    const offsetX = minX - MAP_MARGIN - (finalWidth - paddedWidth) / 2;
    const offsetY = minY - MAP_MARGIN - (finalHeight - paddedHeight) / 2;

    return `${offsetX} ${offsetY} ${finalWidth} ${finalHeight}`;
  }, [nodes]);

  const adj = useMemo(() => {
    const m = {};
    for (const e of edges) {
      (m[e.from] ||= new Set()).add(e.to);
      (m[e.to] ||= new Set()).add(e.from);
    }
    return m;
  }, [edges]);

  const clearedSet = useMemo(() => {
    if (!cleared) return new Set();
    if (cleared instanceof Set) return new Set(cleared);
    return new Set(Array.isArray(cleared) ? cleared : []);
  }, [cleared]);

  const visibleNodes = useMemo(() => {
    if (debugMode) {
      return new Set(Object.keys(nodes));
    }
    const visible = new Set();
    const isVisible = (id) => {
      if (!id) return false;
      if (visible.has(id)) return true;
      if (id === "start") return true;
      if (clearedSet.has(id)) return true;
      if (id === current) return true;
      const parent = parents[id];
      if (!parent) return true;
      if (clearedSet.has(parent)) return true;
      if (parent === current) return true;
      return false;
    };
    Object.keys(nodes).forEach((id) => {
      if (isVisible(id)) visible.add(id);
    });
    return visible;
  }, [nodes, parents, clearedSet, current, debugMode]);

  const [animating, setAnimating] = useState(false);
  const [heroPos, setHeroPos] = useState(() => nodes[current] || { x: 0, y: 0 });
  const [bubble, setBubble] = useState(null);

  const [encountering, setEncountering] = useState(false);

  const heroPosRef = useRef(heroPos);
  useEffect(() => {
    heroPosRef.current = heroPos;
  }, [heroPos]);

  const bubbleTimerRef = useRef(null);
  const encounterTimerRef = useRef(null);
  const ENCOUNTER_DURATION_MS = 900;
  const animFrameRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (encounterTimerRef.current) clearTimeout(encounterTimerRef.current);
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
    if (encounterTimerRef.current) {
      clearTimeout(encounterTimerRef.current);
      encounterTimerRef.current = null;
    }
    setEncountering(false);
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
        const targetNode = nodes[targetId];
        const showEncounterBubble = targetNode?.type !== "end";
        const isEncounter = targetNode?.type === "elf";
        const nextBubble = showEncounterBubble ? { x: to.x, y: to.y } : null;

        if (bubbleTimerRef.current) {
          clearTimeout(bubbleTimerRef.current);
          bubbleTimerRef.current = null;
        }

        if (isEncounter) {
          setBubble(nextBubble);
          setEncountering(true);
          if (encounterTimerRef.current) {
            clearTimeout(encounterTimerRef.current);
          }
          encounterTimerRef.current = setTimeout(() => {
            encounterTimerRef.current = null;
            if (!mountedRef.current) return;
            setEncountering(false);
          }, ENCOUNTER_DURATION_MS);

          bubbleTimerRef.current = setTimeout(() => {
            bubbleTimerRef.current = null;
            if (!mountedRef.current) return;
            setBubble(null);
            setAnimating(false);
            if (onArrive) onArrive(targetId);
          }, ENCOUNTER_DURATION_MS);
        } else {
          if (encounterTimerRef.current) {
            clearTimeout(encounterTimerRef.current);
            encounterTimerRef.current = null;
          }
          setEncountering(false);
          setBubble(nextBubble);
          bubbleTimerRef.current = setTimeout(() => {
            bubbleTimerRef.current = null;
            if (!mountedRef.current) return;
            setBubble(null);
            setAnimating(false);
            if (onArrive) onArrive(targetId);
          }, 820);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  return (
    <main className="screen route">
      <div
        className={`route-canvas${encountering ? " encounter-zoom" : ""}`}
      >
        <div
          className={`route-encounter-overlay${encountering ? " active" : ""}`}
        >
          <div className="encounter-dimmer" />
          <div className="encounter-fracture" />
          {ENCOUNTER_SHARDS.map((shard) => (
            <span
              key={shard.key}
              className={`encounter-shard ${shard.key}`}
              style={{
                "--shard-rotate": `${shard.rotate}deg`,
                "--shard-tx": shard.tx,
                "--shard-ty": shard.ty,
                "--shard-delay": shard.delay,
              }}
            />
          ))}
        </div>
        <svg
          viewBox={viewBox}
          className="route-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {edges
            .filter((e) =>
              visibleNodes.has(e.from) && visibleNodes.has(e.to),
            )
            .map((e, i) => (
              <path
                key={i}
                d={pathD(e.from, e.to)}
                className="route-edge"
                fill="none"
              />
            ))}
          {Object.entries(nodes).map(([id, n]) => {
            if (!visibleNodes.has(id)) return null;
            const label = n.label || id;
            const chars = Array.from(label);
            const textWidth = Math.max(60, chars.length * 16);
            const padding = 3;
            const bubbleWidth = textWidth + padding * 2;
            const bubbleHeight = 24;
            const cornerRadius = 8;
            const bubbleX = n.x - bubbleWidth / 2;
            const bubbleY = n.y + 28;
            const pointerHeight = 10;
            const pointerHalf = 12;
            const pointerTop = bubbleY - pointerHeight;
            const pointerPoints = `${n.x - pointerHalf},${bubbleY} ${n.x + pointerHalf},${bubbleY} ${n.x},${pointerTop}`;
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
                {/* Location bubble under node */}
                <g className="route-label">
                  <rect
                    x={bubbleX}
                    y={bubbleY}
                    width={bubbleWidth}
                    height={bubbleHeight}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    className="route-label-bubble"
                  />
                  <polygon
                    points={pointerPoints}
                    className="route-label-bubble"
                  />
                  <text
                    x={n.x}
                    y={bubbleY + bubbleHeight / 2}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="route-label-text"
                  >
                    {label}
                  </text>
                </g>
              </g>
            );
          })}
          {bubble && (
            <g
              className="encount-bubble"
              transform={`translate(${bubble.x} ${bubble.y - 36})`}
              pointerEvents="none"
            >
              <rect x={-86} y={-28} width={172} height={28} rx={10} ry={10} />
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
