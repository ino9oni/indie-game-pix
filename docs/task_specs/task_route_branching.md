# タスク仕様: ルートモードの難易度分岐対応

## 背景
- ルートモードは `start → elf-practice → elf-easy → elf-middle → elf-hard → elf-ultra` という一本道構成。
- GAMEDESIGNの要求では、practice の先で難易度別に分岐し、各難易度の試練を乗り越えてエンディングに繋がる構造が望まれている。
- 今後の追加実装（難易度ごとの物語分岐・再挑戦）に対応できるレイアウトとデータ構造が必要。

## 目的
- practice → easy の後に middle / hard の二方向へ分岐し、各ルートの先でエンディングノードに収束する新しいルート構造へ刷新する。
- 分岐後も移動制限（隣接ノードのみ、戻れない）が自然に機能し、現在のUIやアニメーション演出を維持する。

## 要件
1. ルートノード構成を以下に変更する（ID / ラベル / 推奨座標）。
   - `start` (Start) — 100,300
   - `elf-practice` (Practice) — 240,250
   - `elf-easy` (Easy) — 400,190
   - `elf-middle` (Middle) — 560,120
   - `elf-hard` (Hard) — 560,260
   - `elf-ending` (Ending) — 720,190
2. エッジ定義は以下の双方向接続を持つ。
   - start ↔ elf-practice
   - elf-practice ↔ elf-easy
   - elf-easy ↔ elf-middle
   - elf-middle ↔ elf-ending
   - elf-easy ↔ elf-hard
   - elf-hard ↔ elf-ending
   - その他の直結は持たない。
3. `RouteMap` のアニメーション・クリック処理で新構造が利用され、practice 以降で middle か hard を選択する際に正しく分岐できる。
4. 最終試練ノード ID を `elf-ending` に統一し、クリア時にエンディングモードへ遷移する既存処理を `elf-ending` 判定へ更新する。
5. スコアボーナス、キャラクター設定、会話スクリプト、パズルサイズなど、旧 `elf-ultra` を参照していた箇所を `elf-ending` へ置き換える。
6. ロード/セーブ（localStorage）の互換性を考慮し、旧データ (`elf-ultra`) を保持している場合は最終ノード到達時に `elf-ending` へ移行できるよう安全策を加える。
7. GAMEDESIGN.md のルート構造・用語（ultra → ending 等）を更新し、分岐図例とノード解説を反映させる。

## 非機能要件
- 既存のMAP_MARGINベースの viewBox 生成と整合するよう座標を設定し、中央寄せが保持されること。
- 新ノードIDは英小文字・ハイフン形式で統一し、既存の命名規則と整合する。
- 定数やマップは1か所に集約し、IDの分岐が増えてもメンテしやすい構成を保つ。

## テスト観点
- ルート画面で practice → easy → middle → ending、および practice → easy → hard → ending の双方を辿れるか確認。
- クリア済みノードの再訪がデバッグモードでのみ許可される既存仕様を保てているか。
- `elf-ultra` を含む旧セーブデータで起動した場合でも破綻しない（例: 安全に start へ戻れる、endingへ遷移する）こと。
- エンディング突入後のリセットで再び start から進行できる。
- スコアボーナス、会話キャラ、ピクロス難易度が意図したノードに結び付いているか。
