import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

const HOLD_MS = 1200;
const FADE_MS = 200;

const Prologue = forwardRef(function Prologue(
  { onNext, focusIndex = 0, usingGamepad = false },
  ref,
) {
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

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  const finishPrologue = useCallback(() => {
    clearTimers();
    onNext?.();
  }, [clearTimers, onNext]);

  const advanceLine = useCallback(() => {
    clearTimers();
    if (index >= lines.length - 1) {
      finishPrologue();
      return true;
    }
    if (phase === "out") return false;
    setPhase("out");
    return true;
  }, [clearTimers, finishPrologue, index, lines.length, phase]);

  const skipPrologue = useCallback(() => {
    clearTimers();
    finishPrologue();
    return true;
  }, [clearTimers, finishPrologue]);

  useEffect(() => {
    clearTimers();

    if (phase === "in") {
      if (index < lines.length - 1) {
        timers.current.push(
          setTimeout(() => setPhase("out"), HOLD_MS),
        );
      } else {
        timers.current.push(setTimeout(finishPrologue, 2000));
      }
    } else if (phase === "out") {
      timers.current.push(
        setTimeout(() => {
          setIndex((i) => Math.min(i + 1, lines.length - 1));
          setPhase("in");
        }, FADE_MS),
      );
    }

    return clearTimers;
  }, [clearTimers, finishPrologue, index, lines.length, phase]);

  const text = lines[index] ?? "";

  const handleNext = useCallback(() => {
    advanceLine();
  }, [advanceLine]);

  useImperativeHandle(ref, () => ({
    advance: () => advanceLine(),
    skip: () => skipPrologue(),
  }));

  return (
    <main className="screen prologue">
      <div className="prologue-window">
        <div className="prologue-text">
          <p
            className={`fade-text ${phase === "in" ? "in" : ""}`}
            style={{ "--fade-target": 0.92 }}
          >
            {text === "" ? "\u00a0" : text}
          </p>
        </div>
        <div className="prologue-actions">
          <button
            className={`primary${usingGamepad && focusIndex === 0 ? " focused" : ""}`}
            type="button"
            onClick={handleNext}
          >
            Next
          </button>
          <button
            className={`ghost${usingGamepad && focusIndex === 1 ? " focused" : ""}`}
            type="button"
            onClick={skipPrologue}
          >
            Skip
          </button>
        </div>
      </div>
    </main>
  );
});

export default Prologue;
