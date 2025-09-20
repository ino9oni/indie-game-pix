import React, { useMemo, useState } from "react";

// Layout based on GAMEDESIGN.md blocks (4 x 5x5), with control row
const BLOCKS = [
  ["アイウエオ", "カキクケコ", "サシスセソ", "タチツテト", "ナニヌネノ"],
  ["ハヒフヘホ", "マミムメモ", "ヤ　ユ　ヨ", "ワ　　　ヲ", "ン　　　ー"],
  ["ァィゥェォ", "ヵヶッャュ", "ョヮ０１２", "３４５６７", "８９！＃＄"],
  ["％＆（）＠", "　　　　　", "　　　　　", "　　　　　", "　　　　　"],
];

export default function NameEntry({ initial = "", onCancel, onConfirm }) {
  const [name, setName] = useState(initial);
  const [caret, setCaret] = useState(initial.length);
  const blocks = useMemo(
    () => BLOCKS.map((rows) => rows.map((r) => r.split(""))),
    [],
  );
  const maxLen = 8;

  const insert = (ch) => {
    if (!ch || ch === " ") return;
    setName((prev) => {
      if (prev.length >= maxLen) return prev;
      const left = prev.slice(0, caret);
      const right = prev.slice(caret);
      const next = left + ch + right;
      setCaret((c) => Math.min(next.length, c + ch.length));
      return next;
    });
  };

  const backspace = () => {
    if (caret <= 0) return;
    setName((prev) => {
      const left = prev.slice(0, caret);
      const right = prev.slice(caret);
      const next = left.slice(0, -1) + right;
      setCaret((c) => Math.max(0, c - 1));
      return next;
    });
  };

  const controls = [
    { key: "delete", label: "一文字削除", action: backspace },
    {
      key: "left",
      label: "←",
      action: () => setCaret((c) => Math.max(0, c - 1)),
    },
    {
      key: "right",
      label: "→",
      action: () => setCaret((c) => Math.min(name.length, c + 1)),
    },
    {
      key: "confirm",
      label: "決定",
      action: () => onConfirm(name || "ナナシ"),
      extraClass: "confirm",
    },
  ];

  if (onCancel) {
    controls.push({ key: "cancel", label: "戻る", action: onCancel });
  }

  return (
    <main className="screen name-entry">
      <div className="name-card">
        <div className="display">
          {name.slice(0, caret)}
          <span className="caret">|</span>
          {name.slice(caret)}
          {!name && "　"}
        </div>
        <div className="name-body">
          <div className="kana-grid">
            {blocks.map((rows, bi) => (
              <div className="kana-column" key={bi}>
                {rows.map((row, ri) => (
                  <div className="row" key={ri}>
                    {row.map((ch, ci) => (
                      <button
                        key={`${bi}-${ri}-${ci}`}
                        className="kana"
                        onClick={() => insert(ch.trim() === "" ? null : ch)}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="name-actions">
            {controls.map(({ key, label, action, extraClass }) => (
              <button
                key={key}
                className={`kana ${extraClass || ""}`.trim()}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
