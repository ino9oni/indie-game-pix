import React, { useEffect } from "react";
import audio from "../audio/AudioManager.js";
import { assetPath } from "../utils/assetPath.js";

const HERO_LOSE_IMAGE = assetPath("assets/img/character/hero/hero_lose.png");

export default function GameOver({ heroName, onContinue, onQuit }) {
  useEffect(() => {
    try {
      audio.stopPlayMusic?.();
      audio.playGameOver?.();
    } catch (err) {
      console.error("GameOver: failed to trigger defeat audio", err);
    }
    const handler = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onContinue?.();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onQuit?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onContinue, onQuit]);

  const resolvedName = heroName?.trim() || "主人公";

  return (
    <main className="screen gameover">
      <h1 className="headline">{`${resolvedName} LOSE`}</h1>
      <p className="sub">時間切れ、または解答が一致しませんでした。</p>
      <div className="portrait">
        <img src={HERO_LOSE_IMAGE} alt={`${resolvedName} defeat portrait`} />
      </div>
      <div className="actions">
        <button className="ghost" onClick={onContinue}>
          Continue
        </button>
        <button className="primary" onClick={onQuit}>
          Quit
        </button>
      </div>
    </main>
  );
}
