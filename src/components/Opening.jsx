import React from "react";

export default function Opening({
  onStart,
  onNewGame,
  onTutorial,
  onEndless,
  focusedIndex = 0,
  usingGamepad = false,
}) {
  const buttons = [
    {
      label: "Story Mode",
      description: "ストーリーに沿って elfpix を進めるモードです",
      onPress: onNewGame,
      variant: "primary",
    },
    {
      label: "Endless Mode",
      description: "エンドレスな elfpix にチャレンジするモードです",
      onPress: onEndless,
      variant: "ghost",
    },
    {
      label: "Tutorial",
      description: "基本操作をガイド付きで学びます",
      onPress: onTutorial,
      variant: "ghost",
    },
    {
      label: "Continue",
      description: "セーブデータをロードします",
      onPress: onStart,
      variant: "ghost",
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
      const variant = btn.variant || "ghost";
      return (
        <button
          key={btn.label}
          className={`${variant}${selected ? " focused" : ""}`}
          data-selected={selected}
          onClick={btn.onPress}
          aria-describedby={`tooltip-${btn.label}`}
          onMouseEnter={() => {
            const tip = document.getElementById(`tooltip-${btn.label}`);
            if (tip) tip.hidden = false;
          }}
          onFocus={() => {
            const tip = document.getElementById(`tooltip-${btn.label}`);
            if (tip) tip.hidden = false;
          }}
          onMouseLeave={() => {
            const tip = document.getElementById(`tooltip-${btn.label}`);
            if (tip) tip.hidden = true;
          }}
          onBlur={() => {
            const tip = document.getElementById(`tooltip-${btn.label}`);
            if (tip) tip.hidden = true;
          }}
        >
          {btn.label}
          {selected && usingGamepad ? <span className="sr-only"> (selected)</span> : null}
          <span id={`tooltip-${btn.label}`} className="opening-tooltip" hidden>
            {btn.description}
          </span>
        </button>
      );
    })}
      </div>
    </main>
  );
}
