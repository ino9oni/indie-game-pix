import React, { useEffect, useMemo } from "react";

export default function PicrossClear({
  heroName,
  heroImage,
  boardEntries = [],
  unlockedIndices = [],
  newlyUnlocked = [],
  onContinue,
}) {
  const displayName = heroName && heroName.trim().length ? heroName.trim() : "主人公";

  const unlockedSet = useMemo(() => new Set(unlockedIndices), [unlockedIndices]);
  const newlyUnlockedSet = useMemo(() => new Set(newlyUnlocked), [newlyUnlocked]);
  const unlockedDetails = useMemo(
    () =>
      newlyUnlocked
        .map((index) => boardEntries.find((entry) => entry.collectionIndex === index))
        .filter(Boolean),
    [boardEntries, newlyUnlocked],
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

  return (
    <main className="screen picross-clear-screen">
      <div className="picross-clear-overlay">
        <div className="picross-clear-grid">
          <section className="picross-clear-hero">
            {heroImage && (
              <figure className="picross-clear-portrait">
                <img src={heroImage} alt={`${displayName} Smile`} />
                <span className="picross-clear-glow" aria-hidden="true" />
              </figure>
            )}
            <header className="picross-clear-header">
              <h1 className="picross-clear-title">{displayName} Win</h1>
              {unlockedDetails.length > 0 ? (
                <p className="picross-clear-subtitle">
                  新たな記号を獲得：
                  <span className="picross-clear-unlocks">
                    {unlockedDetails.map((entry) => entry.meaningText).join(" / ")}
                  </span>
                </p>
              ) : (
                <p className="picross-clear-subtitle">新規解放はありませんでした。</p>
              )}
              <p className="picross-clear-progress">
                コレクション進捗 {unlockedCount}/{totalSlots}
              </p>
            </header>
          </section>

          <section className="picross-clear-collection" aria-label="記号コレクション">
            <h2 className="picross-clear-collection-title">Symbol Codex</h2>
            <div className="picross-clear-board-wrapper">
              <div className="picross-clear-board" role="grid">
              {boardEntries.map((entry) => {
                const isUnlocked = unlockedSet.has(entry.collectionIndex);
                const isNew = newlyUnlockedSet.has(entry.collectionIndex);
                const label = isUnlocked ? entry.glyphLabel : "??";
                const shape =
                  Array.isArray(entry.grid) && entry.grid.length ? entry.grid : emptyShape;
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
                    title={`${entry.meaningText} / ${entry.difficulty.toUpperCase()}`}
                    role="gridcell"
                    aria-live={isNew ? "polite" : undefined}
                  >
                    <div className="slot-shape">
                      {shape.map((row, rowIndex) =>
                        row.map((filled, colIndex) => {
                          const cellKey = `${entry.collectionIndex}-${rowIndex}-${colIndex}`;
                          const cellClass = [
                            "slot-cell",
                            filled ? "is-filled" : "",
                            isUnlocked && filled ? "is-active" : "",
                            isNew && filled ? "is-new" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");
                          const delay = (rowIndex * 5 + colIndex) * 45;
                          return (
                            <span
                              key={cellKey}
                              className={cellClass}
                              style={isNew && filled ? { animationDelay: `${delay}ms` } : undefined}
                            />
                          );
                        }),
                      )}
                    </div>
                    <span className="slot-label">{label}</span>
                    <span className="slot-meta">{entry.difficulty.toUpperCase()}</span>
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
