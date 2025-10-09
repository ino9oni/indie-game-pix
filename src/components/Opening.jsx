import React from "react";

export default function Opening({
  onStart,
  onNewGame,
  focusedIndex = 0,
  usingGamepad = false,
}) {
  const buttons = [
    {
      label: "New Game",
      description: "進行状況を消去して新しく開始",
      onPress: onNewGame,
    },
    {
      label: "Continue",
      description: "セーブデータをロードします",
      onPress: onStart,
    },
  ];

  return (
    <main className="screen opening">
      <div className="opening-hero">
        <h1 className="headline opening-title cute">elfpix</h1>
        <p className="sub">エルフ達と心を通わせるピクロスの旅</p>
      </div>

      <div className="actions">
        {buttons.map((btn, index) => {
          const selected = usingGamepad && focusedIndex === index;
          const variant = index === 0 ? "primary" : "ghost";
          return (
            <button
              key={btn.label}
              className={`${variant}${selected ? " focused" : ""}`}
              title={btn.description}
              data-selected={selected}
              onClick={btn.onPress}
            >
              {btn.label}
              {selected && usingGamepad ? <span className="sr-only"> (selected)</span> : null}
            </button>
          );
        })}
      </div>
    </main>
  );
}
