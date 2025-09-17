import React, { useEffect, useMemo, useState } from "react";

const STORY_DURATION = 10000;
const FIN_DURATION = 4000;
const CREDIT_PER_LINE = 4200;

export default function Ending({ heroName = "主人公", onDone }) {
  const [stage, setStage] = useState("story");

  const resolvedHero = heroName || "主人公";
  const storyLines = useMemo(
    () => [
      `こうして最終試練を乗り越えた${resolvedHero}は、elpixに認められることとなった`,
      `新しいelfpixを探す${resolvedHero}の旅はまだ続く。`,
    ],
    [resolvedHero],
  );

  const credits = useMemo(
    () => [
      { role: "Sound Design", name: "ino9" },
      { role: "Illustration", name: "Stable Diffusion Automatic" },
      { role: "Scenario", name: "ChatGPT / gpt-5" },
      { role: "Programmer", name: "ChatGPT / codex-gpt-5" },
    ],
    [],
  );

  useEffect(() => {
    let timer;
    if (stage === "story") {
      timer = setTimeout(() => setStage("fin"), STORY_DURATION);
    } else if (stage === "fin") {
      timer = setTimeout(() => setStage("credits"), FIN_DURATION);
    } else if (stage === "credits") {
      const total = CREDIT_PER_LINE * credits.length + 1000;
      timer = setTimeout(() => {
        if (onDone) onDone();
      }, total);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [stage, credits.length, onDone]);

  return (
    <main className="screen ending">
      <div className="ending-content">
        <div className={`story-container ${stage === "story" ? "play" : ""}`}>
          <div className="story-scroll">
            {storyLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <div className={`ending-fin ${stage === "fin" ? "show" : ""}`}>
          <div className="ending-fin-title">FIN</div>
          <div className="ending-fin-sub">Thank you for playing</div>
        </div>

        <div className={`ending-credits ${stage === "credits" ? "show" : ""}`}>
          {stage === "credits" &&
            credits.map((credit, idx) => (
              <div
                key={credit.role}
                className="ending-credit-line"
                style={{
                  animationDelay: `${idx * CREDIT_PER_LINE}ms`,
                }}
              >
                <span className="ending-credit-role">{credit.role}</span>
                <span className="ending-credit-name">{credit.name}</span>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
