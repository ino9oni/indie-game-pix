# タスク仕様: マップモードのエンディング分岐修正

## 背景
- 現在のルート構造は `start → practice → easy → {middle, hard} → ending` の二股で、最終ノードが単一の `elf-ending` となっている。
- TASKLIST のバグ項目では "bad-ending" と "true-ending" を分岐させることが求められており、ルート表示・挙動ともに仕様とズレが生じている。

## 目的
- マップモードを仕様通り `bad-ending` と `true-ending` の二系統に分岐させ、プレイヤーが選択した道筋に応じたエンディングへ遷移できるようにする。

## 要件
1. ルート構造を以下に変更する。
   - start → elf-practice → elf-easy → elf-middle → elf-bad-ending
   - start → elf-practice → elf-easy → elf-hard → elf-ultra → elf-true-ending
2. ルートノード情報（座標・ラベル）とエッジ定義を更新し、中央寄せレイアウトでも整った見た目になるようにする。
3. `elf-ultra` ノードを復活させ、25x25 パズルと既存キャラクター情報を関連付ける。
4. `elf-bad-ending` と `elf-true-ending` はマップ上では終端ノードとして表示し、クリア時にそれぞれ個別のエンディングへ遷移させる。
5. 旧バージョンのセーブデータ（`elf-ending` を保持しているケース）を読み込んだ際にも破綻しないよう、互換処理を実装する。
6. エンディング画面では到達したエンディング種別に応じてメッセージや演出テキストを切り替える。
7. GAMEDESIGN のルート構成・ノード解説・エンディング仕様を新しい分岐構造に合わせて更新する。

## 非機能要件
- 新規追加ノードの ID は英小文字 + ハイフンで統一し、既存コードスタイルに合わせる。
- ルート再描画や BGM/SE 制御など既存の副作用に影響を与えないよう注意する。

## テスト観点
- ルートモードで middle→bad-ending, hard→ultra→true-ending の双方が選択可能で表示も崩れない。
- `elf-bad-ending` クリア時にはバッドエンディング用テキストが表示され、終了後にタイトルへ戻れる。
- `elf-true-ending` クリア時にはグッドエンディング用テキストが表示される。
- 旧セーブデータ（`routeNode` や `clearedNodes` に `elf-ending` を含む）の読み込みが可能で、必要に応じて `elf-true-ending` へマイグレーションされる。
