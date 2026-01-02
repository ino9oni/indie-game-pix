import React, { useCallback, useEffect, useRef } from "react";
import audio from "../audio/AudioManager.js";
import { assetPath } from "../utils/assetPath.js";

const HERO_LOSE_IMAGE = assetPath("assets/img/character/hero/hero_lose.png");

export default function EnemyVictory({ heroName, onContinue, onQuit, soundOn }) {
  const defeatPlayedRef = useRef(false);
  const handleContinue = useCallback(() => {
    audio.stopGameOver?.();
    onContinue?.();
  }, [onContinue]);
  const handleQuit = useCallback(() => {
    audio.stopGameOver?.();
    onQuit?.();
  }, [onQuit]);

  useEffect(() => {
    let active = true;
    const playDefeat = async () => {
      if (!soundOn) return;
      if (defeatPlayedRef.current) return;
      try {
        await audio.enable?.();
      } catch {}
      if (!active || !audio.enabled) return;
      try {
        audio.stopPlayMusic?.();
        audio.stopGameOver?.();
        audio.playGameOver?.();
        defeatPlayedRef.current = true;
      } catch (err) {
        console.error("EnemyVictory: failed to trigger defeat audio", err);
      }
    };
    playDefeat();
    const handlePointerDown = () => {
      if (!defeatPlayedRef.current) playDefeat();
    };
    const handler = (event) => {
      if (
        !defeatPlayedRef.current &&
        !["Control", "Shift", "Alt", "Meta"].includes(event.key)
      ) {
        playDefeat();
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleContinue();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handleQuit();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handler);
    return () => {
      active = false;
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handler);
    };
  }, [handleContinue, handleQuit, soundOn]);

  const resolvedName = heroName?.trim() || "主人公";

  return (
    <main className="screen enemy-victory">
      <h1 className="headline">GAMEISOVER</h1>
      <p className="sub">敵がすべてのお題を解き明かした！</p>
      <div className="portrait">
        <img src={HERO_LOSE_IMAGE} alt={`${resolvedName} defeat portrait`} />
      </div>
      <div className="actions">
        <button className="ghost" onClick={handleContinue}>
          Continue
        </button>
        <button className="primary" onClick={handleQuit}>
          Quit
        </button>
      </div>
    </main>
  );
}
