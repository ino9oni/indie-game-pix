import React, { useCallback, useEffect, useMemo, useState } from "react";
import { assetPath } from "../utils/assetPath.js";
import tutorialStrings from "../strings/tutorial.json";

const HERO_SMILE = assetPath("assets/img/character/tutorial/fiene_smile.png");
const BOARD_SIZE = 5;
const SOLUTION = [
  [0, 1, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 0, 0],
  [0, 1, 1, 0, 0],
  [0, 0, 0, 0, 1],
];
const ROW_HINTS = [[2], [1, 1, 1], [3], [2], [1]];
const COL_HINTS = [[2], [1, 2], [4], [0], [1, 1]];

const STEP_TITLES = ["ゴールを理解しよう", "ヒントの読み方", "実践してみよう"];
const COMBO_MEMORY_KEY = "tutorialComboTipsSeen";
const comboLessonStrings = tutorialStrings?.comboLesson ?? {};
const COMBO_SLIDES = comboLessonStrings.slides ?? [];
const COMBO_SUBTITLE = comboLessonStrings.subtitle ?? "コンボ・スペル・ジャマーの遊び方を詳しく見てみましょう。";
const PREFACE_COPY = comboLessonStrings.preface ?? {};
const BRANCH_COPY = comboLessonStrings.branch ?? {};
const COMPLETION_COPY = comboLessonStrings.completion ?? {};
const COMBO_SKIP_LABEL = comboLessonStrings.skip ?? "Skip";
const COMBO_BADGE = comboLessonStrings.badgeCombo ?? "Combo Lesson";
const BONUS_BADGE = comboLessonStrings.badgeBonus ?? "Bonus Lesson";

const getComboTipsSeen = () => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return false;
  return window.localStorage.getItem(COMBO_MEMORY_KEY) === "true";
};

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function isSolved(board) {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const expected = SOLUTION[r][c] === 1;
      const actual = board[r][c] === 1;
      if (expected !== actual) return false;
    }
  }
  return true;
}

function TutorialBoard({
  grid,
  interactive = false,
  onCellChange,
  highlightRow = null,
  highlightCol = null,
  showMarkers = false,
}) {
  const normalizeHint = (hint) => {
    if (!hint || hint.length === 0) return [""];
    if (hint.length === 1 && hint[0] === 0) return [""];
    return hint;
  };

  const handleClick = (r, c, event) => {
    if (!interactive) return;
    event.preventDefault();
    const mode = event.shiftKey ? "maybe" : "fill";
    onCellChange?.(r, c, mode);
  };

  const handleContextMenu = (r, c, event) => {
    if (!interactive) return;
    event.preventDefault();
    onCellChange?.(r, c, "cross");
  };

  const renderCell = (value, r, c) => {
    const classes = ["tutorial-cell"];
    if (value === 1) classes.push("filled");
    else if (value === -1) classes.push("cross");
    else if (value === 2) classes.push("maybe");

    if (highlightRow === r || highlightCol === c) classes.push("highlight");
    const content = value === -1 ? "×" : value === 2 ? "?" : "";
    if (interactive) {
      return (
        <button
          key={`cell-${r}-${c}`}
          type="button"
          className={classes.join(" ")}
          onClick={(event) => handleClick(r, c, event)}
          onContextMenu={(event) => handleContextMenu(r, c, event)}
          aria-label={`row ${r + 1}, col ${c + 1}`}
          role="gridcell"
        >
          {showMarkers ? content : ""}
        </button>
      );
    }
    return (
      <div key={`cell-${r}-${c}`} className={classes.join(" ")} role="gridcell">
        {content}
      </div>
    );
  };

  return (
    <div className="tutorial-board" role="grid" aria-label="ピクロスの練習盤面">
      <div className="tutorial-corner" aria-hidden="true" />
      <div className="tutorial-top" role="rowgroup">
        {COL_HINTS.map((hint, idx) => {
          const values = normalizeHint(hint);
          return (
            <div
              key={`col-hint-${idx}`}
              className={`tutorial-hint col-clue ${highlightCol === idx ? "tutorial-highlight" : ""}`}
              role="columnheader"
            >
              {values.map((value, spanIdx) => (
                <span key={`col-hint-${idx}-${spanIdx}`}>{value}</span>
              ))}
            </div>
          );
        })}
      </div>
      <div className="tutorial-left" role="rowgroup">
        {ROW_HINTS.map((hint, idx) => {
          const values = normalizeHint(hint);
          return (
            <div
              key={`row-hint-${idx}`}
              className={`tutorial-hint row-clue ${highlightRow === idx ? "tutorial-highlight" : ""}`}
              role="rowheader"
            >
              {values.map((value, spanIdx) => (
                <span key={`row-hint-${idx}-${spanIdx}`}>{value}</span>
              ))}
            </div>
          );
        })}
      </div>
      <div className="tutorial-grid" role="rowgroup">
        {grid.map((row, r) =>
          row.map((cell, c) => renderCell(cell, r, c)),
        )}
      </div>
    </div>
  );
}

export default function Tutorial({ onExit, onComplete }) {
  const [step, setStep] = useState(0);
  const [demoBoard, setDemoBoard] = useState(() => createEmptyBoard());
  const [hintHighlight, setHintHighlight] = useState({ row: null, col: null });
  const [practiceBoard, setPracticeBoard] = useState(() => createEmptyBoard());
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [comboTipsSeen, setComboTipsSeen] = useState(() => getComboTipsSeen());
  const [phase, setPhase] = useState(() => (getComboTipsSeen() ? "preface" : "core"));
  const [comboSlide, setComboSlide] = useState(0);

  useEffect(() => {
    if (step !== 0) {
      setDemoBoard(createEmptyBoard());
      return undefined;
    }
    const sequence = [];
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (SOLUTION[r][c] === 1) sequence.push([r, c]);
      }
    }
    const timers = [];
    setDemoBoard(createEmptyBoard());
    sequence.forEach(([r, c], index) => {
      timers.push(
        setTimeout(() => {
          setDemoBoard((prev) => {
            const next = prev.map((row) => row.slice());
            next[r][c] = 1;
            return next;
          });
        }, index * 500),
      );
    });
    timers.push(
      setTimeout(() => {
        setShowCelebrate(true);
      }, sequence.length * 500 + 300),
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      setShowCelebrate(false);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 1) {
      setHintHighlight({ row: null, col: null });
      return undefined;
    }
    const sequence = [
      { row: 0 },
      { row: 1 },
      { col: 2 },
      { row: 3 },
      { col: null, row: null },
    ];
    const timers = sequence.map((entry, idx) =>
      setTimeout(() => setHintHighlight(entry), idx * 1600),
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      setHintHighlight({ row: null, col: null });
    };
  }, [step]);

  useEffect(() => {
    if (step !== 2) {
      setPracticeBoard(createEmptyBoard());
      setPracticeComplete(false);
      setShowCelebrate(false);
      return undefined;
    }
    const solved = isSolved(practiceBoard);
    setPracticeComplete(solved);
    if (solved) {
      setShowCelebrate(true);
    } else {
      setShowCelebrate(false);
    }
    return undefined;
  }, [practiceBoard, step]);

  const handleCellChange = (r, c, mode) => {
    setPracticeBoard((prev) => {
      const next = prev.map((row) => row.slice());
      const current = next[r][c];
      if (mode === "fill") {
        next[r][c] = current === 1 ? 0 : 1;
      } else if (mode === "cross") {
        next[r][c] = current === -1 ? 0 : -1;
      } else if (mode === "maybe") {
        next[r][c] = current === 2 ? 0 : 2;
      }
      return next;
    });
  };

  const persistComboFlag = useCallback(() => {
    if (comboTipsSeen) return;
    try {
      window.localStorage?.setItem(COMBO_MEMORY_KEY, "true");
    } catch {
      /* noop */
    }
    setComboTipsSeen(true);
  }, [comboTipsSeen]);

  const beginComboLesson = useCallback(() => {
    setComboSlide(0);
    setPhase("combo");
  }, []);

  const handleComboNext = useCallback(() => {
    if (comboSlide >= COMBO_SLIDES.length - 1) {
      persistComboFlag();
      setPhase("comboComplete");
      return;
    }
    setComboSlide((prev) => Math.min(prev + 1, COMBO_SLIDES.length - 1));
  }, [comboSlide, persistComboFlag]);

  const handleComboBack = useCallback(() => {
    setComboSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleComboSkip = useCallback(() => {
    setPhase("comboComplete");
  }, []);

  const startCoreLesson = useCallback(() => {
    setPhase("core");
    setStep(0);
  }, []);

  useEffect(() => {
    if (phase === "combo" && COMBO_SLIDES.length === 0) {
      persistComboFlag();
      setPhase("comboComplete");
    }
  }, [phase, persistComboFlag]);

  const goNext = () => {
    if (step === 2) {
      if (practiceComplete) {
        setPhase("branch");
      }
      return;
    }
    setStep((prev) => Math.min(prev + 1, 2));
  };

  const goBack = () => {
    if (step === 0) {
      onExit?.();
    } else {
      setStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const resetPractice = () => {
    setPracticeBoard(createEmptyBoard());
    setPracticeComplete(false);
    setShowCelebrate(false);
  };

  const boardForStep = useMemo(() => {
    if (step === 0) return demoBoard;
    if (step === 1) return SOLUTION;
    return practiceBoard;
  }, [demoBoard, practiceBoard, step]);

  const highlightForStep = step === 1 ? hintHighlight : { row: null, col: null };
  const interactive = step === 2;

  if (phase === "preface") {
    const infoLines = Array.isArray(PREFACE_COPY.body) ? PREFACE_COPY.body : [];
    return (
      <main className="screen tutorial-screen">
        <div className="tutorial-layout">
          <section className="tutorial-hero-card">
            <div className="tutorial-step-badge">{COMBO_BADGE}</div>
            <h1 className="tutorial-title">{PREFACE_COPY.title ?? "コンボ解説ショートカット"}</h1>
            <img src={HERO_SMILE} alt="案内役のキャラクター" className="tutorial-hero-image" />
            <p className="tutorial-description">{PREFACE_COPY.description ?? COMBO_SUBTITLE}</p>
          </section>

          <section className="tutorial-content tutorial-preface">
            <div className="tutorial-dialog">
              <div className="tutorial-dialog-body">
                {infoLines.length > 0 && (
                  <ul>
                    {infoLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="tutorial-options-column">
                <button type="button" className="primary" onClick={startCoreLesson}>
                  {PREFACE_COPY.startFull ?? "通常チュートリアルから始める"}
                </button>
                <button type="button" className="ghost" onClick={beginComboLesson}>
                  {PREFACE_COPY.jumpCombo ?? "コンボ解説のみを見る"}
                </button>
                <button type="button" className="ghost" onClick={onExit}>
                  {PREFACE_COPY.exit ?? "オープニングに戻る"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "branch") {
    const branchLines = Array.isArray(BRANCH_COPY.body) ? BRANCH_COPY.body : [];
    return (
      <main className="screen tutorial-screen">
        <div className="tutorial-layout">
          <section className="tutorial-hero-card">
            <div className="tutorial-step-badge">{BONUS_BADGE}</div>
            <h1 className="tutorial-title">{BRANCH_COPY.title ?? "次に学ぶ内容"}</h1>
            <img src={HERO_SMILE} alt="案内役のキャラクター" className="tutorial-hero-image" />
            <p className="tutorial-description">{COMBO_SUBTITLE}</p>
          </section>
          <section className="tutorial-content tutorial-branch">
            <div className="tutorial-dialog">
              <div className="tutorial-dialog-body">
                {branchLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="tutorial-options-column">
                <button type="button" className="primary" onClick={beginComboLesson}>
                  {BRANCH_COPY.primary ?? "コンボ・スペルの説明に移る"}
                </button>
                <button type="button" className="ghost" onClick={onComplete}>
                  {BRANCH_COPY.secondary ?? "このままオープニングに戻る"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "combo") {
    const slideIndex = Math.min(comboSlide, Math.max(COMBO_SLIDES.length - 1, 0));
    const slide = COMBO_SLIDES[slideIndex] ?? {};
    const slideBody = Array.isArray(slide.body) ? slide.body : [];
    const progressTotal = COMBO_SLIDES.length || 1;
    return (
      <main className="screen tutorial-screen">
        <div className="tutorial-layout">
          <section className="tutorial-hero-card">
            <div className="tutorial-step-badge">{COMBO_BADGE}</div>
            <h1 className="tutorial-title">{slide.title ?? "Combo Lesson"}</h1>
            <img src={HERO_SMILE} alt="案内役のキャラクター" className="tutorial-hero-image" />
            <p className="tutorial-description">{COMBO_SUBTITLE}</p>
          </section>
          <section className="tutorial-content tutorial-combo">
            <div className="tutorial-combo-header">
              <span className="tutorial-progress">
                {comboSlide + 1} / {progressTotal}
              </span>
              <button type="button" className="ghost" onClick={handleComboSkip}>
                {COMBO_SKIP_LABEL}
              </button>
            </div>
            <div className="tutorial-dialog">
              <div className="tutorial-dialog-body">
                {slideBody.length > 0 && (
                  <ul>
                    {slideBody.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {slide.illustration && (
                  <div
                    className="tutorial-illustration"
                    role="img"
                    aria-label={slide.illustrationLabel || slide.illustration}
                  >
                    {slide.illustration}
                  </div>
                )}
              </div>
              <div className="tutorial-actions">
                <button type="button" className="ghost" onClick={handleComboBack} disabled={comboSlide === 0}>
                  Back
                </button>
                <div className="tutorial-actions-right">
                  <button type="button" className="primary" onClick={handleComboNext}>
                    {comboSlide === progressTotal - 1 ? "完了する" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "comboComplete") {
    const completionLines = [];
    if (COMPLETION_COPY.title) completionLines.push(COMPLETION_COPY.title);
    if (COMPLETION_COPY.description) completionLines.push(COMPLETION_COPY.description);
    return (
      <main className="screen tutorial-screen">
        <div className="tutorial-layout">
          <section className="tutorial-hero-card">
            <div className="tutorial-step-badge">{COMBO_BADGE}</div>
            <h1 className="tutorial-title">{COMPLETION_COPY.title ?? "コンボ・スペル解説"}</h1>
            <img src={HERO_SMILE} alt="案内役のキャラクター" className="tutorial-hero-image" />
            <p className="tutorial-description">{COMPLETION_COPY.description ?? COMBO_SUBTITLE}</p>
          </section>
          <section className="tutorial-content tutorial-branch">
            <div className="tutorial-dialog">
              <div className="tutorial-dialog-body">
                {completionLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="tutorial-options-column">
                <button type="button" className="primary" onClick={onComplete}>
                  {COMPLETION_COPY.confirm ?? "オープニングに戻る"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="screen tutorial-screen">
      <div className="tutorial-layout">
        <section className="tutorial-hero-card">
          <div className="tutorial-step-badge">Step {step + 1} / 3</div>
          <h1 className="tutorial-title">{STEP_TITLES[step]}</h1>
          <img src={HERO_SMILE} alt="案内役のキャラクター" className="tutorial-hero-image" />
          <p className="tutorial-description">
            {step === 0 && "盤面をすべて正しいマスで埋めるとクリアです。自動デモを見ながらゴールのイメージを掴みましょう。"}
            {step === 1 &&
              "行と列の数字は、どのくらいマスを埋めるのかを教えてくれます。色が付いたヒントに注目して読み方を確認しましょう。"}
            {step === 2 &&
              "実際に盤面を操作してみましょう。左クリックで塗り、右クリックで ×、Shift+クリックで Maybe を切り替えられます。完成したら「完了する」で次へ進めます。"}
          </p>
        </section>

        <section className="tutorial-content">
          <TutorialBoard
            grid={boardForStep}
            interactive={interactive}
            onCellChange={interactive ? handleCellChange : undefined}
            highlightRow={highlightForStep.row}
            highlightCol={highlightForStep.col}
            showMarkers={interactive}
          />

          <div className="tutorial-dialog">
            {step === 0 && (
              <div className="tutorial-dialog-body">
                <p>
                  盤面の正解マスを順番に塗りつぶすと、最後に輝く演出が流れてクリアになります。まずはゴールの様子を確認しましょう。
                </p>
                {showCelebrate && <p className="tutorial-celebrate">✨ ゴールすると演出が発生します！</p>}
              </div>
            )}
            {step === 1 && (
              <div className="tutorial-dialog-body">
                <ul>
                  <li>数字は「連続した塗りマスの数」を表します。複数あれば、1マス以上の間隔を空けて配置します。</li>
                  <li>大きい数字から埋めると手がかりを作りやすくなります。</li>
                  <li>埋まらないと判断したマスには × や ? を付け、可能性を整理しましょう。</li>
                </ul>
              </div>
            )}
            {step === 2 && (
              <div className="tutorial-dialog-body">
                <p>左クリックで塗る / 右クリックで × / Shift+クリックで ? を付けられます。完成したと思ったらチェックしてみましょう。</p>
                {practiceComplete && (
                  <p className="tutorial-celebrate">よくできました！「完了する」を押して次の選択に進みましょう。</p>
                )}
              </div>
            )}

            <div className="tutorial-actions">
              <button type="button" className="ghost" onClick={goBack}>
                Back
              </button>
              {step === 2 && (
                <button type="button" className="ghost" onClick={resetPractice}>
                  Reset
                </button>
              )}
              <div className="tutorial-actions-right">
                <button type="button" className="ghost" onClick={onExit}>
                  Skip
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={goNext}
                  disabled={step === 2 && !practiceComplete}
                >
                  {step === 2 ? "完了する" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
