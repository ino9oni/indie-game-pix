import React, { useEffect, useMemo, useRef, useState } from "react";

const HOLD_MS = 1200;
const FADE_MS = 200;

export default function Prologue({ onNext }) {
  const lines = useMemo(
    () => [
      "森深くに隠されたエルフの集落には、",
      "古から伝わる知恵遊び「elfpix」が存在した。",
      "",
      "これは、森に宿る精霊の力を象った図形を浮かび上がらせる、",
      "まるでピクロスのような試練。",
      "",
      "エルフは、森に迷い込んだ者にこの「elfpix」を課し、",
      "正しく解き明かした者だけが先へ進むことが許された。",
      "",
    ],
    [],
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in");
  const timers = useRef([]);

  useEffect(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];

    if (phase === "in") {
      if (index < lines.length - 1) {
        timers.current.push(
          setTimeout(() => setPhase("out"), HOLD_MS),
        );
      } else {
        timers.current.push(setTimeout(() => onNext && onNext(), 2000));
      }
    } else if (phase === "out") {
      timers.current.push(
        setTimeout(() => {
          setIndex((i) => Math.min(i + 1, lines.length - 1));
          setPhase("in");
        }, FADE_MS),
      );
    }

    return () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
  }, [index, phase, lines.length, onNext]);

  const text = lines[index] ?? "";

  return (
    <main className="screen prologue">
      <div className="prologue-window">
        <p
          className={`fade-text ${phase === "in" ? "in" : ""}`}
          style={{ "--fade-target": 0.92 }}
        >
          {text === "" ? "\u00a0" : text}
        </p>
      </div>
    </main>
  );
}
