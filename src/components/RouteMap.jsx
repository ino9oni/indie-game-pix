import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "../utils/assetPath.js";

// Route map with neighbor-only movement, hero sprite, and animated traversal
const CANVAS_MIN_WIDTH = 960;
const CANVAS_MIN_HEIGHT = 640;
const CANVAS_MARGIN = 24;
const INNER_PADDING_X = 48;
const INNER_PADDING_Y = 48;
const EDGE_ANGLE_DEG = 20;
const EDGE_SLOPE = Math.tan((EDGE_ANGLE_DEG * Math.PI) / 180);
const HERO_TRAVEL_MIN_MS = 600;
const HERO_TRAVEL_MAX_MS = 2000;
const START_VERTICAL_RATIO = 0.78;
const HORIZONTAL_STEP_SCALE = 0.5;

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
  showAllNodes = false,
  onArrive,
  onMoveStart,
}) {
  const rawNodes = graph?.nodes ?? {};
  const edges = graph?.edges ?? [];
  const parents = graph?.parents ?? {};
  const heroImg = assetPath("assets/img/character/hero/00083-826608146.png");

  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({
    width: CANVAS_MIN_WIDTH,
    height: CANVAS_MIN_HEIGHT,
  });

  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setCanvasSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        setCanvasSize({ width, height });
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const viewBox = useMemo(() => {
    const width = Math.max(1, canvasSize.width);
    const height = Math.max(1, canvasSize.height);
    return `0 0 ${width} ${height}`;
  }, [canvasSize]);

  const childMap = useMemo(() => {
    const map = {};
    Object.entries(parents).forEach(([child, parentId]) => {
      if (!parentId) return;
      (map[parentId] ||= []).push(child);
    });
    return map;
  }, [parents]);

  const nodes = useMemo(() => {
    const entries = Object.entries(rawNodes);
    if (!entries.length) return {};

    const rootId =
      entries.find(([id]) => !parents[id])?.[0] ||
      (Object.prototype.hasOwnProperty.call(rawNodes, "start") ? "start" : entries[0][0]);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    entries.forEach(([, node]) => {
      if (Number.isFinite(node?.x)) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
      }
      if (Number.isFinite(node?.y)) {
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    });

    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(maxX)) maxX = Object.keys(rawNodes).length;
    if (!Number.isFinite(minY)) minY = 0;
    if (!Number.isFinite(maxY)) maxY = Object.keys(rawNodes).length;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const innerWidth = Math.max(
      1,
      canvasSize.width - INNER_PADDING_X * 2,
    );
    const innerHeight = Math.max(
      1,
      canvasSize.height - INNER_PADDING_Y * 2,
    );

    const depthMap = {};
    const queue = [rootId];
    depthMap[rootId] = 0;
    while (queue.length) {
      const currentId = queue.shift();
      const children = childMap[currentId] || [];
      children.forEach((childId) => {
        if (depthMap[childId] != null) return;
        depthMap[childId] = (depthMap[currentId] || 0) + 1;
        queue.push(childId);
      });
    }

    const maxDepth = Math.max(...Object.values(depthMap));
    const baseStep =
      maxDepth > 0 ? innerWidth / maxDepth : innerWidth / 2;
    const horizontalStep = Math.max(
      baseStep * HORIZONTAL_STEP_SCALE,
      innerWidth * 0.12,
    );
    const slopeStep = horizontalStep * EDGE_SLOPE;

    const positioned = {};
    const startY = Math.min(
      INNER_PADDING_Y + innerHeight,
      INNER_PADDING_Y + innerHeight * START_VERTICAL_RATIO,
    );
    positioned[rootId] = {
      ...rawNodes[rootId],
      x: INNER_PADDING_X,
      y: startY,
    };

    const traversalQueue = [rootId];
    const visited = new Set([rootId]);
    while (traversalQueue.length) {
      const parentId = traversalQueue.shift();
      const parentNode = positioned[parentId];
      const children = childMap[parentId] || [];
      children.forEach((childId, index) => {
        if (!rawNodes[childId]) return;
        if (visited.has(childId)) return;
        const depth = depthMap[childId] ?? (depthMap[parentId] || 0) + 1;
        const normX = (rawNodes[childId].x - minX) / spanX;
        let targetX =
          INNER_PADDING_X + normX * innerWidth ||
          (INNER_PADDING_X + depth * horizontalStep);
        if (!Number.isFinite(targetX)) {
          targetX = INNER_PADDING_X + depth * horizontalStep;
        }
        const dx = targetX - parentNode.x;
        if (Math.abs(dx) < horizontalStep * 0.25) {
          targetX = parentNode.x + Math.sign(dx || 1) * horizontalStep;
        }

        const directionSign = (() => {
          const rawParent = rawNodes[parentId];
          const rawChild = rawNodes[childId];
          const rawDelta =
            Number(rawChild?.y) - Number(rawParent?.y);
          if (Math.abs(rawDelta) > 1) {
            return Math.sign(rawDelta);
          }
          if (children.length > 1) {
            return index % 2 === 0 ? 1 : -1;
          }
          return rawDelta === 0 ? 1 : Math.sign(rawDelta);
        })();

        const dy = Math.abs(dx || horizontalStep) * EDGE_SLOPE * directionSign;
        const targetY = Math.min(
          INNER_PADDING_Y + innerHeight,
          Math.max(INNER_PADDING_Y, parentNode.y + dy),
        );

        positioned[childId] = {
          ...rawNodes[childId],
          x: Math.min(
            INNER_PADDING_X + innerWidth,
            Math.max(INNER_PADDING_X, targetX),
          ),
          y: targetY,
        };
        visited.add(childId);
        traversalQueue.push(childId);
      });
    }

    // Fallback for any nodes not reached through parents map
    entries.forEach(([id, node]) => {
      if (positioned[id]) return;
      const nx = (node.x - minX) / spanX;
      const ny = (node.y - minY) / spanY;
      positioned[id] = {
        ...node,
        x: INNER_PADDING_X + nx * innerWidth,
        y: INNER_PADDING_Y + ny * innerHeight,
      };
    });

    return positioned;
  }, [rawNodes, parents, childMap, canvasSize]);

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
    if (showAllNodes) {
      return new Set(Object.keys(nodes));
    }
    const visible = new Set();
    if (nodes[current]) {
      visible.add(current);
    }
    const neighbors = Array.from(adj[current] || []);
    neighbors.forEach((id) => {
      if (!nodes[id]) return;
      if (last && id === last) return;
      visible.add(id);
    });
    return visible;
  }, [adj, current, debugMode, last, nodes, showAllNodes]);

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
    return `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
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

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const totalLength = Math.hypot(dx, dy);
    if (totalLength === 0) {
      setHeroPos(to);
      setAnimating(false);
      setActiveEdge(null);
      if (onArrive) onArrive(targetId);
      return;
    }

    setAnimating(true);
    setActiveEdge({ from: current, to: targetId });
    const duration = Math.min(
      HERO_TRAVEL_MAX_MS,
      Math.max(HERO_TRAVEL_MIN_MS, totalLength * 6),
    );
    const startRef = { value: null };

    const step = (timestamp) => {
      if (!startRef.value) startRef.value = timestamp;
      const progress = Math.min(1, (timestamp - startRef.value) / duration);
      const position = {
        x: from.x + dx * progress,
        y: from.y + dy * progress,
      };

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
        ref={canvasRef}
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
