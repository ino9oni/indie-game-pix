import React, { useEffect } from "react";

export default function PicrossClear({ heroName, heroImage, onContinue }) {
  const displayName = heroName && heroName.trim().length ? heroName.trim() : "主人公";

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

  return (
    <main className="screen picross-clear-screen">
      <div className="picross-clear-overlay">
        <div className="picross-clear-card">
          {heroImage && (
            <figure className="picross-clear-portrait">
              <img src={heroImage} alt={`${displayName} Smile`} />
              <span className="picross-clear-glow" aria-hidden="true" />
            </figure>
          )}
          <h1 className="picross-clear-title">{displayName} Win</h1>
          <button className="primary" type="button" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}
