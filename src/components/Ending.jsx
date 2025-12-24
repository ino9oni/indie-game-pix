import React, { useEffect, useMemo, useState } from "react";
import { assetPath } from "../utils/assetPath.js";

const STORY_DURATION = 10000;
const FIN_DURATION = 4000;
const CREDIT_PER_LINE = 4200;
const ENDING_BACKGROUND = assetPath("assets/img/background/ending.png");

export default function Ending({ heroName = "主人公", endingNode = "elf-true-ending", onDone }) {
  const [stage, setStage] = useState("story");

  const resolvedHero = heroName || "主人公";
  const variant = endingNode === "elf-bad-ending" ? "bad" : "true";
  const storyLines = useMemo(
    () => {
      if (variant === "bad") {
        return [
          `試練の灯火は揺らぎ、${resolvedHero}は森の悲嘆を背負うこととなった。`,
          `けれど立ち止まらない。失った光を取り戻す旅が、ここから始まる。`,
        ];
      }
      return [
        `こうして最終試練を乗り越えた${resolvedHero}は、elpixに認められることとなった`,
        `新しいelfpixを探す${resolvedHero}の旅はまだ続く。`,
      ];
    },
    [resolvedHero, variant],
  );
  const finSubtitle = variant === "bad" ? "Another journey awaits" : "Thank you for playing";

  const credits = useMemo(
    () => [
      { role: "Sound Design", name: "ino9" },
      { role: "Illustration", name: "ChatGPT" },
      { role: "Scenario", name: "ChatGPT / gpt-5" },
      { role: "Programmer", name: "ChatGPT / codex-gpt-5" },
      // Special Thanks section
      { role: "Special Thanks", name: "" },
      { role: "TestPlayer", name: "sideofall" },
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
    <main
      className="screen ending"
      style={{ backgroundImage: `url(${ENDING_BACKGROUND})` }}
    >
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
          <div className="ending-fin-sub">{finSubtitle}</div>
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
