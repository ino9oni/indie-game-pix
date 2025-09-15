import React, { useEffect, useMemo, useState } from "react";

export default function Prologue({ onNext }) {
  const allLines = useMemo(
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
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < allLines.length) {
      const id = setTimeout(() => setVisibleCount((n) => n + 1), 800);
      return () => clearTimeout(id);
    }
    // all shown: wait 2s then move to opening
    const to = setTimeout(() => onNext && onNext(), 2000);
    return () => clearTimeout(to);
  }, [visibleCount, allLines.length, onNext]);

  return (
    <main className="screen prologue">
      <div className="prologue-window">
        {allLines.slice(0, visibleCount).map((t, i) => (
          <p
            key={i}
            style={{ opacity: 0.92, transition: "opacity 300ms ease" }}
          >
            {t}
          </p>
        ))}
      </div>
    </main>
  );
}
