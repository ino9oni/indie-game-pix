import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "../utils/assetPath.js";

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

const NODE_HALF_WIDTH = 18;
const NODE_HALF_HEIGHT = 12;
const NODE_SIDE_DEPTH = 6;
const NODE_SIDE_RISE = 6;
const NODE_SHADOW_OFFSET_X = 6;
const NODE_SHADOW_OFFSET_Y = 6;
const NODE_SHADOW_RX = NODE_HALF_WIDTH + 6;
const NODE_SHADOW_RY = NODE_HALF_HEIGHT * 0.8;

const NODE_VARIANTS = {
  normal: {
    topGradient: "node-top-normal",
    frontSide: "#1b5fb8",
    backSide: "#0b3d74",
  },
  current: {
    topGradient: "node-top-current",
    frontSide: "#1f8f51",
    backSide: "#0f4f2b",
  },
  start: {
    topGradient: "node-top-start",
    frontSide: "#c05621",
    backSide: "#92400e",
  },
  end: {
    topGradient: "node-top-end",
    frontSide: "#7c3aed",
    backSide: "#4c1d95",
  },
};

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
const heroImg = assetPath("assets/img/character/hero/00083-826608146.png");

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
  const [activeEdge, setActiveEdge] = useState(null);

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

  const pathD = (fromId, toId) => {
    const fromNode = nodes[fromId];
    const toNode = nodes[toId];
    if (!fromNode || !toNode) return "";

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);

    const points = [[fromNode.x, fromNode.y]];

    if (dx !== 0) {
      const horizontalY = fromNode.y + (sx > 0 ? 3 : -3);
      const exitX = fromNode.x + sx * (NODE_HALF_WIDTH + 2);
      points.push([exitX, horizontalY]);

      const entryX = toNode.x - sx * (NODE_HALF_WIDTH + 2);
      points.push([entryX, horizontalY]);
    }

    if (dy !== 0) {
      const verticalX =
        dx !== 0
          ? toNode.x - sx * (NODE_HALF_WIDTH + 2)
          : fromNode.x + (dy > 0 ? 2 : -2);
      const exitY = fromNode.y + sy * (NODE_HALF_HEIGHT + 2);
      points.push([verticalX, exitY]);

      const entryY = toNode.y - sy * (NODE_HALF_HEIGHT + 2);
      points.push([verticalX, entryY]);
    }

    if (dx !== 0) {
      const entryX = toNode.x - sx * (NODE_HALF_WIDTH + 2);
      const finalY = dy !== 0 ? toNode.y - sy * (NODE_HALF_HEIGHT + 2) : fromNode.y + (sx > 0 ? 3 : -3);
      points.push([entryX, finalY]);
    }

    points.push([toNode.x, toNode.y]);

    const simplified = points.filter((point, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      return prev[0] !== point[0] || prev[1] !== point[1];
    });

    return simplified
      .map(([px, py], idx) => `${idx === 0 ? "M" : "L"} ${px} ${py}`)
      .join(" ");
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
      setActiveEdge(null);
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
      setActiveEdge(null);
      if (onArrive) onArrive(targetId);
      return;
    }

    setAnimating(true);
    setActiveEdge({ from: current, to: targetId });
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
            setActiveEdge(null);
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
            setActiveEdge(null);
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
          <defs>
            <linearGradient id="node-top-normal" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#4dd0ff" />
              <stop offset="100%" stopColor="#1671c4" />
            </linearGradient>
            <linearGradient id="node-top-current" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
            <linearGradient id="node-top-start" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="node-top-end" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="route-edge-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#9dd7ff" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {edges
            .filter((e) =>
              visibleNodes.has(e.from) && visibleNodes.has(e.to),
            )
            .map((e) => {
              const d = pathD(e.from, e.to);
              const key = `${e.from}-${e.to}`;
              const isActive =
                !!activeEdge &&
                ((activeEdge.from === e.from && activeEdge.to === e.to) ||
                  (activeEdge.from === e.to && activeEdge.to === e.from));
              return (
                <g key={key} className="route-edge-group">
                  <path
                    className="route-edge-shadow"
                    d={d}
                    transform="translate(4 -4)"
                    fill="none"
                  />
                  <path className="route-edge" d={d} fill="none" />
                  {isActive && animating && (
                    <path
                      className="route-edge-glow"
                      d={d}
                      fill="none"
                      pathLength={100}
                    />
                  )}
                </g>
              );
            })}
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
            const isCurrent = current === id;
            const variant = isCurrent
              ? "current"
              : id === "start"
              ? "start"
              : n.type === "end"
              ? "end"
              : "normal";
            const variantStyle = NODE_VARIANTS[variant] || NODE_VARIANTS.normal;
            const interactive = canClick(id);
            const topPoints = [
              [n.x, n.y - NODE_HALF_HEIGHT],
              [n.x + NODE_HALF_WIDTH, n.y],
              [n.x, n.y + NODE_HALF_HEIGHT],
              [n.x - NODE_HALF_WIDTH, n.y],
            ]
              .map(([px, py]) => `${px},${py}`)
              .join(" ");
            const backSidePoints = [
              [n.x, n.y - NODE_HALF_HEIGHT],
              [n.x + NODE_HALF_WIDTH, n.y - 1.5],
              [n.x + NODE_HALF_WIDTH + NODE_SIDE_DEPTH, n.y - NODE_SIDE_RISE - 1.5],
              [n.x + NODE_SIDE_DEPTH, n.y - NODE_HALF_HEIGHT - NODE_SIDE_RISE],
            ]
              .map(([px, py]) => `${px},${py}`)
              .join(" ");
            const frontSidePoints = [
              [n.x + NODE_HALF_WIDTH, n.y + 1.5],
              [n.x + NODE_HALF_WIDTH + NODE_SIDE_DEPTH, n.y + NODE_SIDE_RISE + 1.5],
              [n.x + NODE_SIDE_DEPTH, n.y + NODE_HALF_HEIGHT + NODE_SIDE_RISE],
              [n.x, n.y + NODE_HALF_HEIGHT],
            ]
              .map(([px, py]) => `${px},${py}`)
              .join(" ");
            const highlightFront = {
              x1: n.x + NODE_HALF_WIDTH,
              y1: n.y + 1.5,
              x2: n.x + NODE_HALF_WIDTH + NODE_SIDE_DEPTH,
              y2: n.y + NODE_SIDE_RISE + 1.5,
            };
            const highlightBack = {
              x1: n.x + NODE_HALF_WIDTH,
              y1: n.y - 1.5,
              x2: n.x + NODE_HALF_WIDTH + NODE_SIDE_DEPTH,
              y2: n.y - NODE_SIDE_RISE - 1.5,
            };
            const shadowCx = n.x + NODE_SHADOW_OFFSET_X;
            const shadowCy = n.y + NODE_HALF_HEIGHT + NODE_SHADOW_OFFSET_Y;
            return (
              <g
                key={id}
                onClick={() => {
                  if (!canClick(id)) return;
                  if (onMoveStart) onMoveStart(id);
                  beginTravel(id);
                }}
                onKeyDown={(event) => {
                  if (!interactive) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (onMoveStart) onMoveStart(id);
                    beginTravel(id);
                  }
                }}
                className={`route-node route-node-${variant}${
                  interactive ? " interactive" : ""
                }`}
                style={{
                  cursor: interactive ? "pointer" : "default",
                  opacity: interactive ? 1 : 0.6,
                }}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "button" : "presentation"}
                aria-label={label}
              >
                <ellipse
                  className="route-node-shadow"
                  cx={shadowCx}
                  cy={shadowCy}
                  rx={NODE_SHADOW_RX}
                  ry={NODE_SHADOW_RY}
                />
                <polygon
                  className="route-node-side route-node-side-back"
                  points={backSidePoints}
                  fill={variantStyle.backSide}
                />
                <polygon
                  className="route-node-side route-node-side-front"
                  points={frontSidePoints}
                  fill={variantStyle.frontSide}
                />
                <polygon
                  className="route-node-top"
                  points={topPoints}
                  fill={`url(#${variantStyle.topGradient})`}
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <line
                  className="route-node-highlight route-node-highlight-front"
                  x1={highlightFront.x1}
                  y1={highlightFront.y1}
                  x2={highlightFront.x2}
                  y2={highlightFront.y2}
                />
                <line
                  className="route-node-highlight route-node-highlight-back"
                  x1={highlightBack.x1}
                  y1={highlightBack.y1}
                  x2={highlightBack.x2}
                  y2={highlightBack.y2}
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
