import React, { useEffect, useMemo } from "react";

export default function PicrossClear({
  heroName,
  heroImage,
  boardEntries = [],
  unlockedIndices = [],
  solvedGrids,
  newlyUnlockedEntries = [],
  onContinue,
}) {
  const displayName = heroName && heroName.trim().length ? heroName.trim() : "主人公";
  const heroTitle = `${displayName} WIN`;

  const unlockedSet = useMemo(() => new Set(unlockedIndices), [unlockedIndices]);
  const newlyUnlockedSet = useMemo(
    () => new Set(newlyUnlockedEntries.map((entry) => entry.collectionIndex)),
    [newlyUnlockedEntries],
  );
  const unlockedDetails = useMemo(
    () =>
      newlyUnlockedEntries.map((entry) => ({
        ...entry,
        unlockedAt: entry?.unlockedAt ?? null,
      })),
    [newlyUnlockedEntries],
  );
  const emptyShape = useMemo(
    () => Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false)),
    [],
  );

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onContinue]);

  const unlockedCount = unlockedSet.size;
  const totalSlots = boardEntries.length;
  const isComplete = totalSlots > 0 && unlockedCount >= totalSlots;
  const unlockedNames = useMemo(
    () => unlockedDetails.map((entry) => entry.meaningText).filter(Boolean),
    [unlockedDetails],
  );
  const unlockList = unlockedDetails.map((entry) => ({
    collectionIndex: entry.collectionIndex,
    meaningText: entry.meaningText || "新規シンボル",
  }));
  const unlockSummary = unlockedNames.length
    ? `新たな記号：${unlockedNames.join("、")}`
    : "新規解放はありませんでした。";
  const codexNeedsScroll = boardEntries.length > 30;
  const codexWrapperClass = [
    "picross-clear-board-wrapper",
    codexNeedsScroll ? "picross-clear-board-wrapper--scroll" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const codexGridClass = [
    "picross-clear-board",
    codexNeedsScroll ? "picross-clear-board--scroll" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <main className="screen picross-clear-screen">
      <div className="picross-clear-overlay">
        <div className="picross-clear-grid">
          <div className="picross-clear-left">
            <section className="picross-clear-hero">
              {heroImage && (
                <figure className="picross-clear-portrait">
                  <img src={heroImage} alt={`${displayName} Smile`} />
                  <span className="picross-clear-glow" aria-hidden="true" />
                </figure>
              )}
              <header className="picross-clear-header">
                <h1 className="picross-clear-title">{heroTitle}</h1>
                <p
                  className={`picross-clear-subtitle${
                    unlockedNames.length ? " picross-clear-subtitle--highlight" : ""
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {unlockSummary}
                </p>
                <p className="picross-clear-progress">
                  コレクション進捗 {unlockedCount}/{totalSlots}
                </p>
              </header>
            </section>

            <section className="picross-clear-unlock-list" aria-label="今回の新規アンロック">
              <h2 className="picross-clear-unlock-title">新規アンロック</h2>
              {unlockList.length > 0 ? (
                <ul className="picross-clear-unlock-items">
                  {unlockList.map((entry) => (
                    <li key={`unlock-list-${entry.collectionIndex}`}>{entry.meaningText}</li>
                  ))}
                </ul>
              ) : (
                <p className="picross-clear-unlock-empty">今回の新規解放はありませんでした。</p>
              )}
            </section>
          </div>

          <section className="picross-clear-collection" aria-label="Elfpix Symbol">
            <h2 className="picross-clear-collection-title">Elfpix Symbol</h2>
            <div className={codexWrapperClass}>
              {isComplete && (
                <div className="picross-clear-complete" role="status" aria-live="polite">
                  <span className="complete-ribbon">COMPLETE!</span>
                  <span className="complete-stars" aria-hidden="true" />
                </div>
              )}
              <div className={codexGridClass} role="grid">
                {boardEntries.map((entry) => {
                  const isUnlocked = unlockedSet.has(entry.collectionIndex);
                  const isNew = newlyUnlockedSet.has(entry.collectionIndex);
                  const displayText = isUnlocked
                    ? entry.meaningText || entry.glyphLabel || "記号"
                    : "??";
                  const storedRecord =
                    solvedGrids instanceof Map ? solvedGrids.get(entry.collectionIndex) : null;
                  const storedGrid = storedRecord?.grid;
                  const baseShape =
                    Array.isArray(entry.grid) && entry.grid.length ? entry.grid : emptyShape;
                  const shape =
                    isUnlocked && Array.isArray(storedGrid) && storedGrid.length
                      ? storedGrid
                      : baseShape;
                  const className = [
                    "picross-clear-slot",
                    `slot-${entry.difficulty}`,
                    isUnlocked ? "is-unlocked" : "is-locked",
                    isNew ? "is-new" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={entry.collectionIndex}
                      className={className}
                      data-difficulty={entry.difficulty}
                      title={entry.meaningText || undefined}
                      role="gridcell"
                      aria-live={isNew ? "polite" : undefined}
                    >
                      {isNew && <span className="slot-badge">NEW</span>}
                      <div className="slot-shape">
                        {shape.map((row, rowIndex) =>
                          row.map((filled, colIndex) => {
                            const cellKey = `${entry.collectionIndex}-${rowIndex}-${colIndex}`;
                            const cellClass = [
                              "slot-cell",
                              filled ? "is-filled" : "",
                              isUnlocked && filled ? "is-active" : "",
                              !isUnlocked && filled ? "is-locked" : "",
                              isNew && filled ? "is-new" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");
                            const delay = (rowIndex * 5 + colIndex) * 45;
                            return (
                              <span
                                key={cellKey}
                                className={cellClass}
                                style={
                                  isNew && filled ? { animationDelay: `${delay}ms` } : undefined
                                }
                              />
                            );
                          }),
                        )}
                      </div>
                      <span className="slot-meaning">{displayText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <div className="picross-clear-actions">
          <button className="primary" type="button" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
