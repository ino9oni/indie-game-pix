# elfpix

Stylish, colorful Picross (nonogram) game built with React + Vite.

Current release: v9.7.1

## Release Highlights (v9.7.1)

前回リリース (v9.7.0) からの主な変更:

- 森林マップの背景画像を採用し、ノードとエッジをオブジェクト位置に合わせて配置。
- ストーリーパネルを左側に移動し、マップとの横幅バランスを調整。
- ヘッダ上部の余白を margin 10px に統一し、詰まり感を解消。

## Previous Release Highlights (v9.7.0)

前回リリース (v9.6.0) からの主な変更:

- ヘッダメニューの上余白を追加し、トップ領域の詰まり感を解消。
- エンディングのイラストクレジット表記を「ChatGPT」に統一。
- マップ初期表示でプロローグ/スタート直後ストーリーを事前表示。
- 画像・音楽アセットを起動時にプリロードし、キャッシュから高速化。

## Previous Release Highlights (v9.6.0)

前回リリース (v9.5.0) からの主な変更:

- 勝利画面のコレクション枠を実数に合わせ、未解放は枠のみ表示して進捗の整合性を改善。
- プロローグ画面では共通ヘッダーを非表示にし、演出とBGM操作の一貫性を確保。
- マップモードのノードとエッジを拡大して視認性を向上。
- ENEMYスペルの発動が安定するよう調整。
- Reset/Submit/Quit ボタンを非表示化。
- エピローグに Special Thanks を追加。

## Previous Release Highlights (v9.5.0)

前回リリース (v9.4.0) からの主な変更:

- マップモード右側に「ここまでのストーリー」パネルを追加し、本風UI・章カードの文字フェード・枠内スクロール・自動最下部スクロールに対応。
- ストーリーはクリア済みルートのみを蓄積表示し、未踏分岐は表示しないようにして進行の整合性を担保。
- HERO スペル発動時の効果イメージ表示を追加し、シネマ演出の見栄えを改善。
- HERO/ENEMY ピクロス画面の高さズレを解消し、HUDの揃いを安定化。
- HERO ジャマー適用後の ENEMY 進捗バー再計算を修正し、進捗表示の不整合を解消。
- HARD/ULTRA(10x10) の決定的ヒントを強化し、解法の足がかりを増やす難易度調整を反映。

## Previous Release Highlights (v9.4.0)

前回リリース (v9.3.0) からの主な変更:

- ENEMY AI を全難易度で安定化し、進捗停滞時の自動リカバリ、?マークの暫定解答、強制脱出フェイルセーフを追加。
- ENEMY 進捗バーの再計算を解答一致セル数ベースに修正し、誤答やロールバック時の過大/過小カウントを解消。
- ENEMY 勝利判定を「盤面完全一致」必須に統一し、ブラックアウトや途中クリアを防ぐ安全ガードを強化。

## Previous Release Highlights (v9.3.0)

前回リリース (v9.2.0) からの主な変更:

- ENEMY AI を難易度/敵ごとのパラメータ制御に再構築し、ヒント優先で一手ずつ進める安定ロジックに変更。Hard/Ultra を含む手番間隔・正誤率を再調整し、プレイヤーと独立したタイマーで動作。
- エンドレスモードを改良し、アンカーヒント必須・一意解の出題、重複防止のバルク生成、非同期補充、進捗バー表示を追加。開始サイズ選択と大容量バッチでゲーム停止を防止。
- 敵スペル発動を難易度/敵パラメータで確率制御し、敵盤面の更新は1手1セルに限定して暴走を防止。

## Previous Release Highlights (v9.1.0)

前回リリース (v9.0.0) からの主な変更:

- ガイド付きチュートリアルモードを追加し、新規背景アートとチュートリアルBGMを同梱。
- ヒーロー／エネミーの全身・勝利/敗北ポートレートを刷新し、エネミー勝利画面を追加。
- ファンファーレやチュートリアルBGM、コレクションアンロックSEなど音源を更新し、10x10対応を含むピクロス/ルートの演出を調整。

## Previous Release Highlights (v9.0.0)

前回リリース (v8.1.0) からの主な変更:

- チュートリアル完了後にコンボ／スペル／ジャマー解説レッスンを追加し、6枚構成のスライドで選択的に学べる分岐を導入。
- レッスン内にピクロスミニボード図解を描画し、スペル発動やジャマーが盤面へ与える影響を視覚的に説明。
- HARD/ULTRA の 10x10 お題生成を再調整し、行列ヒント分布とテンプレート正規化を難度ごとに最適化。

## Previous Release Highlights (1.0.0)

- タイトル画面とゲーム開始フローを刷新し、ゲームパッドでも操作できるフルコントローラサポートを追加。
- 会話・ピクロス画面でのポートレート配置やナビゲーションを調整し、視認性と操作感を改善。
- ゲーム全体の背景・BGM 設定をアップデートし、統一感のあるアートデザインと演出を実現。

## Quickstart

- Install deps: `make install`
- Dev server: `make dev` then open http://localhost:15173
- Build: `make build` and `make preview`

## Game Flow & Rules

- Opening: Shows the elfpix title, a vertically scrolling Story (like movie credits), and two buttons.
  - Buttons: "Continue" (go to level select), and "New Game" (clear progress then go to level select).
  - Place your generated title image at `public/title.png` (e.g., from Sora). The app will load it automatically on the Opening screen.
  - The header has a Sound toggle. Default is Off. Turn it On to enable SFX and start BGM (WAV). BGM keeps playing across screens.

- Choose a level: `easy` (5x5), `middle` (5x5), `high` (15x15).
- Story battles (practice/easy/middle/hard/ultra) now share 5x5 boards for both HERO and ENEMY to keep matches brisk.
- Each level has 5 puzzles. Pick one to start.
- You have 20 minutes. Submit anytime to check your answer.
- If your grid matches the solution at end/submit: Clear. Otherwise: Game Over.
- Clear all 5 in a level to see a level clear screen. For `easy` and `middle`, you’ll be guided to the next level.
- On failure, you can return to puzzle select or end the game. Ending the game shows a Game Over screen with closing music and a button back to Title.

## Controls

- Left click: toggle Fill
- Right click: toggle X (mark)
- Shift + Click: toggle Maybe (保留)

## Music (WAV)

- Place BGM files under `assets/bgm/` (wav/mp3/ogg). You can also place audio files under `assets/img/` if desired. One is chosen at random and played continuously while Sound is On.
- BGM persists across screen transitions. No per-screen music switching.
- Autoplay notes: browsers require a user interaction before audio playback. After your first click/keypress, BGM starts. Sound Off mutes/suspends both BGM and SFX.

## Repo Structure

- Code: `src/` (components, game logic)
- Public: `public/` (index.html)
  - Add `public/title.png` for the Opening screen hero image.
  - Optional background images: place files under `assets/img/` (png/jpg/webp/gif). One will be shown behind the UI at random, and it changes each time you start a puzzle play. If none exist, the gradient background is used.
  - BGM WAV files: place under `assets/bgm/` (wav/mp3/ogg). Files are auto-discovered.
- Config: `.env.example`, `vite.config.js`
- Scripts: `Makefile`
- Tests: `tests/` (none yet)

## Development

- Lint: `make lint`
- Format: `make fmt`
- Tests: `make test`

## Notes

- Progress is kept in `localStorage` per browser.
- Right-click a cell to place a cross (or toggle the Cross tool).
- UI aims for a colorful, sleek look with subtle glows.
