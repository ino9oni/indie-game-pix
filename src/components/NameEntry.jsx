import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

// Layout based on GAMEDESIGN.md blocks (4 x 5x5), with control row
const BLOCKS = [
  ["アイウエオ", "カキクケコ", "サシスセソ", "タチツテト", "ナニヌネノ"],
  ["ハヒフヘホ", "マミムメモ", "ヤ　ユ　ヨ", "ワ　　　ヲ", "ン　　　ー"],
  ["ァィゥェォ", "ヵヶッャュ", "ョヮ０１２", "３４５６７", "８９！＃＄"],
  ["％＆（）＠", "　　　　　", "　　　　　", "　　　　　", "　　　　　"],
];

const BLOCK_COUNT = BLOCKS.length;
const ROW_COUNT = BLOCKS[0].length;
const ROW_COLS = BLOCKS[0][0].length;
const MAX_NAME_LENGTH = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isBlankChar(ch) {
  return !ch || ch === " " || ch === "　";
}

function createDefaultFocus() {
  return { kind: "grid", block: 0, row: 0, col: 0 };
}

const NameEntry = forwardRef(function NameEntry(
  { initial = "", onCancel, onConfirm, usingGamepad = false },
  ref,
) {
  const [name, setName] = useState(initial);
  const [caret, setCaret] = useState(initial.length);

  const blocks = useMemo(
    () => BLOCKS.map((rows) => rows.map((r) => r.split(""))),
    [],
  );

  const nameRef = useRef(initial);
  const caretRef = useRef(caret);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);
  useEffect(() => {
    caretRef.current = caret;
  }, [caret]);

  const focusRef = useRef(createDefaultFocus());
  const lastGridFocusRef = useRef(focusRef.current);
  const [focus, setFocus] = useState(focusRef.current);

  const setFocusState = useCallback((next) => {
    focusRef.current = next;
    if (next.kind === "grid") {
      lastGridFocusRef.current = next;
    }
    setFocus(next);
  }, []);

  const resetFocus = useCallback(() => {
    const initialFocus = createDefaultFocus();
    setFocusState(initialFocus);
  }, [setFocusState]);

  useEffect(() => {
    resetFocus();
  }, [resetFocus]);

  useEffect(() => {
    if (!usingGamepad) return;
    resetFocus();
  }, [resetFocus, usingGamepad]);

  const insert = useCallback((ch) => {
    if (isBlankChar(ch)) return false;
    if (nameRef.current.length >= MAX_NAME_LENGTH) return false;
    const pos = caretRef.current;
    const next = nameRef.current.slice(0, pos) + ch + nameRef.current.slice(pos);
    nameRef.current = next;
    setName(next);
    const updatedCaret = Math.min(next.length, pos + ch.length);
    caretRef.current = updatedCaret;
    setCaret(updatedCaret);
    return true;
  }, []);

  const backspace = useCallback(() => {
    if (caretRef.current <= 0) return false;
    const pos = caretRef.current;
    const next = nameRef.current.slice(0, pos - 1) + nameRef.current.slice(pos);
    nameRef.current = next;
    setName(next);
    const updatedCaret = Math.max(0, pos - 1);
    caretRef.current = updatedCaret;
    setCaret(updatedCaret);
    return true;
  }, []);

  const moveCaretBy = useCallback((delta) => {
    const len = nameRef.current.length;
    const updated = clamp(caretRef.current + delta, 0, len);
    if (updated === caretRef.current) return false;
    caretRef.current = updated;
    setCaret(updated);
    return true;
  }, []);

  const confirmName = useCallback(() => {
    const value = nameRef.current.trim() || "ナナシ";
    onConfirm?.(value);
    return true;
  }, [onConfirm]);

  const cancelEntry = useCallback(() => {
    onCancel?.();
    return true;
  }, [onCancel]);

  const controls = useMemo(() => {
    const top = [{ key: "delete", label: "一文字削除", action: backspace }];
    if (onCancel) {
      top.push({ key: "cancel", label: "戻る", action: cancelEntry });
    }
    const bottom = [
      { key: "left", label: "←", action: () => moveCaretBy(-1) },
      { key: "right", label: "→", action: () => moveCaretBy(1) },
      { key: "confirm", label: "決定", action: confirmName, extraClass: "confirm" },
    ];
    return { top, bottom };
  }, [backspace, cancelEntry, confirmName, moveCaretBy, onCancel]);

  const getChar = useCallback(
    (blockIndex, rowIndex, colIndex) => blocks[blockIndex]?.[rowIndex]?.[colIndex] ?? "",
    [blocks],
  );

  const findFirstCharInRow = useCallback(
    (blockIndex, rowIndex) => {
      for (let colIndex = 0; colIndex < ROW_COLS; colIndex += 1) {
        if (!isBlankChar(getChar(blockIndex, rowIndex, colIndex))) {
          return colIndex;
        }
      }
      return null;
    },
    [getChar],
  );

  const ensureGridFocus = useCallback(
    (blockIndex, rowIndex, colIndex) => {
      let nextCol = clamp(colIndex, 0, ROW_COLS - 1);
      const char = getChar(blockIndex, rowIndex, nextCol);
      if (isBlankChar(char)) {
        const candidate = findFirstCharInRow(blockIndex, rowIndex);
        if (candidate != null) {
          nextCol = candidate;
        }
      }
      return { kind: "grid", block: blockIndex, row: rowIndex, col: nextCol };
    },
    [findFirstCharInRow, getChar],
  );

  const moveGridHorizontal = useCallback(
    (delta) => {
      if (delta === 0) return false;
      if (focus.kind !== "grid") return false;

      if (
        delta > 0 &&
        focus.block === BLOCK_COUNT - 1 &&
        focus.col === ROW_COLS - 1 &&
        (controls.bottom.length || controls.top.length)
      ) {
        if (controls.bottom.length) {
          setFocusState({ kind: "bottom", index: 0 });
        } else {
          setFocusState({ kind: "top", index: 0 });
        }
        return true;
      }

      let blockIndex = focus.block;
      let colIndex = focus.col;
      let attempts = 0;
      while (attempts < BLOCK_COUNT * ROW_COLS) {
        colIndex += delta;
        if (colIndex < 0) {
          blockIndex = (blockIndex - 1 + BLOCK_COUNT) % BLOCK_COUNT;
          colIndex = ROW_COLS - 1;
        } else if (colIndex >= ROW_COLS) {
          blockIndex = (blockIndex + 1) % BLOCK_COUNT;
          colIndex = 0;
        }
        const candidate = ensureGridFocus(blockIndex, focus.row, colIndex);
        const char = getChar(candidate.block, candidate.row, candidate.col);
        if (!isBlankChar(char)) {
          setFocusState(candidate);
          return true;
        }
        attempts += 1;
      }
      return false;
    },
    [controls.bottom.length, controls.top.length, ensureGridFocus, focus, getChar, setFocusState],
  );

  const moveGridVertical = useCallback(
    (delta) => {
      if (delta === 0) return false;
      if (focus.kind !== "grid") return false;

      if (delta > 0 && focus.row === ROW_COUNT - 1 && controls.bottom.length) {
        setFocusState({ kind: "bottom", index: 0 });
        return true;
      }
      if (delta < 0 && focus.row === 0 && controls.top.length) {
        setFocusState({ kind: "top", index: controls.top.length - 1 });
        return true;
      }

      let rowIndex = focus.row;
      let attempts = 0;
      while (attempts < ROW_COUNT) {
        rowIndex = (rowIndex + delta + ROW_COUNT) % ROW_COUNT;
        const candidate = ensureGridFocus(focus.block, rowIndex, focus.col);
        const char = getChar(candidate.block, candidate.row, candidate.col);
        if (!isBlankChar(char)) {
          setFocusState(candidate);
          return true;
        }
        attempts += 1;
      }
      return false;
    },
    [controls.bottom.length, controls.top.length, ensureGridFocus, focus, getChar, setFocusState],
  );

  const moveHorizontal = useCallback(
    (delta) => {
      if (delta === 0) return false;
      if (focus.kind === "grid") {
        return moveGridHorizontal(delta);
      }
      if (focus.kind === "bottom" && controls.bottom.length) {
        if (delta < 0 && focus.index === 0) {
          const fallback = lastGridFocusRef.current || createDefaultFocus();
          setFocusState(fallback);
          return true;
        }
        const len = controls.bottom.length;
        const next = (focus.index + len + delta) % len;
        setFocusState({ kind: "bottom", index: next });
        return true;
      }
      return false;
    },
    [controls.bottom.length, focus, moveGridHorizontal, setFocusState],
  );

  const moveVertical = useCallback(
    (delta) => {
      if (delta === 0) return false;
      if (focus.kind === "grid") {
        return moveGridVertical(delta);
      }
      if (focus.kind === "top" && controls.top.length) {
        if (delta < 0) {
          const fallback = lastGridFocusRef.current || createDefaultFocus();
          setFocusState(fallback);
          return true;
        }
        if (delta > 0) {
          if (focus.index < controls.top.length - 1) {
            setFocusState({ kind: "top", index: focus.index + 1 });
          } else if (controls.bottom.length) {
            setFocusState({ kind: "bottom", index: 0 });
          } else {
            setFocusState({ kind: "top", index: 0 });
          }
          return true;
        }
        return false;
      }
      if (focus.kind === "bottom" && controls.bottom.length) {
        if (delta < 0) {
          if (controls.top.length) {
            const mapped = clamp(focus.index, 0, controls.top.length - 1);
            setFocusState({ kind: "top", index: mapped });
          } else {
            const fallback = lastGridFocusRef.current || createDefaultFocus();
            setFocusState(fallback);
          }
          return true;
        }
        if (delta > 0) {
          const len = controls.bottom.length;
          const next = (focus.index + len + delta) % len;
          setFocusState({ kind: "bottom", index: next });
          return true;
        }
      }
      return false;
    },
    [controls.bottom.length, controls.top.length, focus, moveGridVertical, setFocusState],
  );

  const activateFocused = useCallback(() => {
    if (focus.kind === "grid") {
      const ch = getChar(focus.block, focus.row, focus.col);
      return insert(ch);
    }
    if (focus.kind === "top") {
      const item = controls.top[focus.index];
      return item?.action() ?? false;
    }
    if (focus.kind === "bottom") {
      const item = controls.bottom[focus.index];
      return item?.action() ?? false;
    }
    return false;
  }, [controls.bottom, controls.top, focus, getChar, insert]);

  const cancelFromGamepad = useCallback(() => backspace(), [backspace]);

  useImperativeHandle(ref, () => ({
    moveHorizontal,
    moveVertical,
    confirm: activateFocused,
    cancel: cancelFromGamepad,
    resetFocus,
  }));

  return (
    <main className="screen name-entry">
      <div className="name-card">
        <div className="display">
          {name.slice(0, caret)}
          <span className="caret">|</span>
          {name.slice(caret)}
          {!name && "　"}
        </div>
        <div className="name-body">
          <div className="kana-grid">
            {blocks.map((rows, blockIndex) => (
              <div className="kana-column" key={blockIndex}>
                {rows.map((row, rowIndex) => (
                  <div className="row" key={`${blockIndex}-${rowIndex}`}>
                    {row.map((ch, colIndex) => {
                      const blank = isBlankChar(ch);
                      const isFocused =
                        usingGamepad &&
                        focus.kind === "grid" &&
                        focus.block === blockIndex &&
                        focus.row === rowIndex &&
                        focus.col === colIndex;
                      return (
                        <button
                          type="button"
                          key={`${blockIndex}-${rowIndex}-${colIndex}`}
                          className={`kana${blank ? " blank" : ""}${isFocused ? " focused" : ""}`}
                          disabled={blank}
                          onClick={blank ? undefined : () => insert(ch)}
                        >
                          {ch}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="name-actions">
            {controls.top.length > 0 && (
              <div className="name-actions-top">
                {controls.top.map(({ key, label, action, extraClass }, index) => {
                  const isFocused =
                    usingGamepad && focus.kind === "top" && focus.index === index;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`kana ${extraClass || ""}${isFocused ? " focused" : ""}`.trim()}
                      onClick={action}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="name-actions-bottom">
              {controls.bottom.map(({ key, label, action, extraClass }, index) => {
                const isFocused =
                  usingGamepad && focus.kind === "bottom" && focus.index === index;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`kana ${extraClass || ""}${isFocused ? " focused" : ""}`.trim()}
                    onClick={action}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
});

export default NameEntry;
