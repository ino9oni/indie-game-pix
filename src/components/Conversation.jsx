import React, { useEffect, useMemo, useRef, useState } from "react";

const ENEMY_IMAGES = {
  "elf-practice": {
    normal: "/assets/img/character/enemies/practice/riene_normal.png",
    angry: "/assets/img/character/enemies/practice/riene_angry.png",
  },
  "elf-easy": {
    normal: "/assets/img/character/enemies/easy/efina_normal.png",
    angry: "/assets/img/character/enemies/easy/efina_angry.png",
  },
  "elf-middle": {
    normal: "/assets/img/character/enemies/normal/cerys_normal.png",
    angry: "/assets/img/character/enemies/normal/cerys_angry.png",
  },
  "elf-hard": {
    normal: "/assets/img/character/enemies/hard/floria_normal.png",
    angry: "/assets/img/character/enemies/hard/floria_angry.png",
  },
  "elf-ending": {
    normal: "/assets/img/character/enemies/ultra/altina_normal.png",
    angry: "/assets/img/character/enemies/ultra/altina_angry.png",
  },
};
const HERO_IMAGES = {
  normal: "/assets/img/character/hero/hero_normal.png",
  angry: "/assets/img/character/hero/hero_angry.png",
};

function buildScript(difficultyId, heroName, enemyName) {
  const hero = heroName?.trim() ? heroName : "主人公";
  const enemy = enemyName?.trim() ? enemyName : "敵";

  const scripts = {
    "elf-practice": [
      {
        speaker: enemy,
        who: "enemy",
        text: "……この森に足を踏み入れる者よ。elfpixの知恵比べに挑まずして進むことは許されません。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "知恵比べ？私が解かなければ、森は通してくれないというの？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "その通り。この試練は、森に迷い込んだ者の心を映し出します。失敗すれば森に拒まれ、二度と光を見られぬでしょう。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "厳しいわね……だが構わないわ。私のこの目で真実を見抜いてみせる。",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "ならば、この最初のelfpixで示しなさい。あなたの歩む道が、森に受け入れられるものであるかを――。",
        emotion: "angry",
      },
    ],
    "elf-easy": [
      {
        speaker: enemy,
        who: "enemy",
        text: "わぁ！　人間がここまで来たのね。面白そう！",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "あなたがこの先の試練を与えるエルフなの？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "そうだよ！　今回は“森の小鹿”を描き出すelfpix。うまくいけば、精霊たちもきっと喜ぶよ！",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "小鹿……？　なぜそんな題材を？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "ふふっ、可愛いでしょ？　でもね、この図形を読み解けなければ、鹿たちが君を森の奥へは導かないからね。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "遊び心に見えて、深い試練……面白い。",
        emotion: "angry",
      },
    ],
    "elf-middle": [
      {
        speaker: enemy,
        who: "enemy",
        text: "ここまで来たのなら、軽い遊び心では済まされぬ。これからは“古代の紋章”そのものが題材となる。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "紋章……この森に眠る秘密を示している？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "答えはelfpixが浮かび上がらせる。正しく解ければ紋章は輝き、道は拓かれる。だが、誤れば虚無へと飲まれるのみ。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "……やはりただのパズルではないわね。これは、試練であり同時に鍵でもある…。",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "理解が早い。それならば、知恵を示してみせよ。さもなくば、この森はあなたを拒む。",
        emotion: "angry",
      },
    ],
    "elf-hard": [
      {
        speaker: enemy,
        who: "enemy",
        text: "ようこそ……ここは精霊と花々が囁く場所。あなたは、森の声を聞き取れるかしら？",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "精霊の声……それをelfpixで形にするってこと？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "そう。ひとつひとつの点は、花びらの露。線は精霊の歌。完成すれば、森の命そのものが浮かび上がるでしょう。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "もし失敗すれば？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "花は枯れ、精霊は背を向ける。あなたがここで消えるか、進むかは……花の裁きに委ねられるのです。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "……美しいけど、容赦ないね。",
        emotion: "normal",
      },
    ],
    "elf-ending": [
      {
        speaker: enemy,
        who: "enemy",
        text: "ここまで辿り着いたのか。ならば最後のelfpixを前に立ち尽くすがいい。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "これが…最後の試練…？",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "そう。この絵は「森そのもの」。点と線で構築された生命の記憶。解ける者だけが、真実へ至る。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "……私が解けば、森の奥にある“古代の泉”へ行けるのね。",
        emotion: "normal",
      },
      {
        speaker: enemy,
        who: "enemy",
        text: "ただ行くだけではない。正しく解き明かした時、森はあなたを“仲間”として迎えるだろう。",
        emotion: "normal",
      },
      {
        speaker: hero,
        who: "hero",
        text: "わかった。すべてを懸けて、この最後の謎に挑む。",
        emotion: "normal",
      },
    ],
  };

  if (scripts[difficultyId]) return scripts[difficultyId];

  return [
    {
      speaker: enemy,
      who: "enemy",
      text: `さあ、始めましょう、${hero}。`,
      emotion: "normal",
    },
    { speaker: hero, who: "hero", text: "受けて立つ！", emotion: "normal" },
  ];
}

export default function Conversation({
  heroName,
  enemyName,
  difficultyId,
  onDone,
  onSkip,
}) {
  const script = useMemo(
    () => buildScript(difficultyId, heroName, enemyName),
    [difficultyId, heroName, enemyName],
  );
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [portraitSize, setPortraitSize] = useState({ w: 380, h: 487 });
  const [phase, setPhase] = useState("in");
  const timers = useRef([]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, phase, script.length]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Responsive portrait sizing: shrink on narrow screens
  useEffect(() => {
    const RATIO = 487 / 380; // h/w
    function recalc() {
      const ww = window.innerWidth || 1024;
      let w = 380;
      if (ww <= 480) w = 240; // phones
      else if (ww <= 768) w = 300; // tablets / small screens
      const h = Math.round(w * RATIO);
      setPortraitSize({ w, h });
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  }, []);

  const queueTimeout = (handler, ms) => {
    const id = setTimeout(handler, ms);
    timers.current.push(id);
    return id;
  };

  const clearTimers = () => {
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
  };

  function advance() {
    if (phase === "out") return;
    if (idx + 1 >= script.length) {
      clearTimers();
      setPhase("out");
      queueTimeout(() => {
        onDone && onDone();
      }, 200);
    } else {
      clearTimers();
      setPhase("out");
      queueTimeout(() => {
        setIdx((i) => Math.min(i + 1, script.length - 1));
        setPhase("in");
      }, 200);
    }
  }

  const current = script[idx] || {};
  const heroEmotion =
    current.who === "hero" && current.emotion === "angry" ? "angry" : "normal";
  const enemyEmotion =
    current.who === "enemy" && current.emotion === "angry" ? "angry" : "normal";
  const enemySet = ENEMY_IMAGES[difficultyId] || {};
  const enemyImg = enemySet[enemyEmotion] || enemySet.normal;

  const heroActive = current.who === "hero";
  const enemyActive = current.who === "enemy";
  const heroOpacity = mounted ? (heroActive ? 1 : 0.45) : 0;
  const enemyOpacity = mounted ? (enemyActive ? 1 : 0.45) : 0;

  return (
    <main className="screen dialog" onClick={advance}>
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: "70vh",
        }}
      >
        {/* Stage: portraits side by side, natural sizes, no overlap with dialog */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            padding: "8px 8px 0",
          }}
        >
          {/* Hero portrait (left) */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <div
              style={{
                background: "#1e3a8a",
                border: "3px solid #d1b464",
                borderRadius: 12,
                padding: 4,
                width: portraitSize.w,
                height: portraitSize.h,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                boxShadow: heroActive
                  ? "0 0 32px #60a5fa66"
                  : "0 6px 20px #03081566",
                transition: "box-shadow 320ms ease",
              }}
            >
              <img
                key={`${heroEmotion}-${idx}`}
                src={HERO_IMAGES[heroEmotion] || HERO_IMAGES.normal}
                alt={heroName || "主人公"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                  opacity: heroOpacity,
                  transform: heroActive
                    ? "translateY(-2px) scale(1.02)"
                    : "translateY(6px) scale(0.96)",
                  filter: heroActive
                    ? "drop-shadow(0 0 14px #7dd3fc88) saturate(1.05)"
                    : "grayscale(18%) brightness(0.82)",
                  transition:
                    "opacity 260ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 360ms ease",
                }}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                fontWeight: heroActive ? 800 : 700,
                marginTop: 4,
                opacity: mounted ? (heroActive ? 1 : 0.7) : 0,
                transition: "opacity 240ms ease, transform 240ms ease",
                transform: heroActive ? "translateY(0)" : "translateY(2px)",
              }}
            >
              {heroName}
            </div>
          </div>

          {/* Enemy portrait (right) */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <div
              style={{
                background: "#1e3a8a",
                border: enemyImg ? "3px solid #d1b464" : "1px solid #2b2f55",
                borderRadius: 12,
                padding: enemyImg ? 4 : 0,
                width: portraitSize.w,
                height: portraitSize.h,
                display: "grid",
                placeItems: "center",
                overflow: enemyImg ? "hidden" : "visible",
                boxShadow: enemyActive
                  ? "0 0 32px #f9731699"
                  : "0 6px 20px #03081566",
                transition: "box-shadow 320ms ease",
              }}
            >
              {enemyImg ? (
                <img
                  key={`${enemyEmotion}-${idx}`}
                  src={enemyImg}
                  alt={enemyName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                    opacity: enemyOpacity,
                    transform: enemyActive
                      ? "translateY(-2px) scale(1.02)"
                      : "translateY(6px) scale(0.96)",
                    filter: enemyActive
                      ? "drop-shadow(0 0 14px #fb923c99) saturate(1.05)"
                      : "grayscale(18%) brightness(0.82)",
                    transition:
                      "opacity 260ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 360ms ease",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#dc2626",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontWeight: 800,
                  }}
                >
                  {enemyName}
                </div>
              )}
            </div>
            <div
              style={{
                textAlign: "center",
                fontWeight: enemyActive ? 800 : 700,
                marginTop: 4,
                opacity: mounted ? (enemyActive ? 1 : 0.7) : 0,
                transition: "opacity 240ms ease, transform 240ms ease",
                transform: enemyActive ? "translateY(0)" : "translateY(2px)",
              }}
            >
              {enemyName}
            </div>
          </div>
        </div>

        {/* Dialog window placed to lower third */}
        <div className="dialog-window" style={{ margin: "24px auto 0", marginTop: "auto" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            <span
              className={`fade-text ${phase === "in" ? "in" : ""}`}
              style={{ "--fade-target": 0.92 }}
            >
              {script[idx]?.speaker}
            </span>
          </div>
          <div
            className={`fade-text dialog-body ${phase === "in" ? "in" : ""}`}
            style={{ "--fade-target": 0.92 }}
          >
            {script[idx]?.text}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
              gap: 8,
            }}
          >
            <button
              className="primary"
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
            >
              Next
            </button>
            <button
              className="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (phase === "out") return;
                clearTimers();
                setPhase("out");
                queueTimeout(() => {
                  setIdx(script.length - 1);
                  setPhase("in");
                  onSkip && onSkip();
                }, 200);
              }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
