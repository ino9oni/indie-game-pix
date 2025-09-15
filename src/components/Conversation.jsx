import React, { useEffect, useMemo, useState } from "react";

const ENEMY_IMAGES = {
  "elf-practice": {
    normal: "/assets/img/character/enemies/practice/riene_normal.png",
    angry: "/assets/img/character/enemies/practice/riene_angry.png",
  },
  "elf-easy": {
    normal: "/assets/img/character/enemies/easy/efina_normal.png",
    angry: "/assets/img/character/enemies/easy/efina_angry.png",
  },
  "elf-middle": {
    normal: "/assets/img/character/enemies/normal/cerys_normal.png",
    angry: "/assets/img/character/enemies/normal/cerys_angry.png",
  },
  "elf-hard": {
    normal: "/assets/img/character/enemies/hard/floria_normal.png",
    angry: "/assets/img/character/enemies/hard/floria_angry.png",
  },
  "elf-ultra": {
    normal: "/assets/img/character/enemies/ultra/altina_normal.png",
    angry: "/assets/img/character/enemies/ultra/altina_angry.png",
  },
};
const HERO_IMAGES = {
  normal: "/assets/img/character/hero/hero_normal.png",
  angry: "/assets/img/character/hero/hero_angry.png",
};

function buildScript(difficultyId, heroName, enemyName) {
  if (difficultyId === "elf-practice") {
    return [
      { speaker: heroName, who: "hero", text: "あなたは…", emotion: "normal" },
      {
        speaker: enemyName,
        who: "enemy",
        text: "よくここまできたわね、あなたがelfpixに認められるにふさわしいかどうか…私が相手してあげましょう…",
        emotion: "normal",
      },
      { speaker: enemyName, who: "enemy", text: "あなた名前は？", emotion: "normal" },
      { speaker: heroName, who: "hero", text: `${heroName}と言います。`, emotion: "normal" },
      {
        speaker: enemyName,
        who: "enemy",
        text: `${heroName}と言うのね、いい名前ね。覚えておくわ。私は${enemyName}というの。`,
        emotion: "normal",
      },
      { speaker: enemyName, who: "enemy", text: "では準備はいい？いくわよ。", emotion: "angry" },
      { speaker: heroName, who: "hero", text: "お願いします。", emotion: "angry" },
    ];
  }
  // placeholders for other difficulties
  return [
    { speaker: enemyName, who: "enemy", text: `さあ、始めましょう、${heroName}。`, emotion: "normal" },
    { speaker: heroName, who: "hero", text: "受けて立つ！", emotion: "normal" },
  ];
}

export default function Conversation({
  heroName,
  enemyName,
  difficultyId,
  onDone,
  onSkip,
}) {
  const script = useMemo(
    () => buildScript(difficultyId, heroName, enemyName),
    [difficultyId, heroName, enemyName],
  );
  const [idx, setIdx] = useState(0);
  const [fadeReady, setFadeReady] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  useEffect(() => {
    const t = setTimeout(() => setFadeReady(true), 20);
    return () => clearTimeout(t);
  }, []);

  function advance() {
    if (idx + 1 >= script.length) {
      onDone && onDone();
    } else {
      setIdx((i) => i + 1);
    }
  }

  const current = script[idx] || {};
  const heroEmotion = current.who === "hero" && current.emotion === "angry" ? "angry" : "normal";
  const enemyEmotion = current.who === "enemy" && current.emotion === "angry" ? "angry" : "normal";
  const enemySet = ENEMY_IMAGES[difficultyId] || {};
  const enemyImg = enemySet[enemyEmotion] || enemySet.normal;

  return (
    <main className="screen dialog" onClick={advance}>
      <div style={{ width: "100%" }}>
        {/* Stage: portraits side by side, natural sizes, no overlap with dialog */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            padding: "8px 8px 0",
          }}
        >
          {/* Hero portrait (left) */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <div
              style={{
                background: "#1e3a8a",
                border: "3px solid #d1b464",
                borderRadius: 12,
                padding: 4,
              }}
            >
              <img
                src={HERO_IMAGES[heroEmotion] || HERO_IMAGES.normal}
                alt={heroName || "主人公"}
                style={{
                  display: "block",
                  opacity: fadeReady ? 1 : 0,
                  transition: "opacity 400ms ease",
                }}
              />
            </div>
            <div style={{ textAlign: "center", fontWeight: 800, marginTop: 4 }}>
              {heroName}
            </div>
          </div>

          {/* Enemy portrait (right) */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <div
              style={{
                background: "#1e3a8a",
                border: enemyImg ? "3px solid #d1b464" : "1px solid #2b2f55",
                borderRadius: 12,
                padding: enemyImg ? 4 : 0,
              }}
            >
              {enemyImg ? (
                <img
                  src={enemyImg}
                  alt={enemyName}
                  style={{
                    display: "block",
                    opacity: fadeReady ? 1 : 0,
                    transition: "opacity 400ms ease",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#dc2626",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontWeight: 800,
                  }}
                >
                  {enemyName}
                </div>
              )}
            </div>
            <div style={{ textAlign: "center", fontWeight: 800, marginTop: 4 }}>
              {enemyName}
            </div>
          </div>
        </div>

        {/* Dialog window below stage */}
        <div className="dialog-window" style={{ margin: "12px auto 0" }}>
          <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: 6 }}>
            {script[idx]?.speaker}
          </div>
          <div style={{ fontSize: 18 }}>{script[idx]?.text}</div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
              gap: 8,
            }}
          >
            <button
              className="primary"
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
            >
              Next
            </button>
            <button
              className="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIdx(script.length - 1);
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
