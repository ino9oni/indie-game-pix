# Issue: ルートモードに難易度分岐を追加する

## 背景
- 現状ルートモードは一直線のノード列で、難易度選択の自由度がない。
- GAMEDESIGNで指定された practice → easy → {middle, hard} → ending 構造に対応させる必要がある。

## 要件
- ノード構成を start, elf-practice, elf-easy, elf-middle, elf-hard, elf-ending へ更新し、easy の先で middle / hard に分岐させる。
- 各ノードの座標とラベルを改修し、画面中央で分岐が視認できるようにする。
- 最終ノードIDを `elf-ending` とし、クリア時にエンディングモードへ遷移させる処理を更新する。
- スコアボーナス・キャラ情報・会話スクリプト・パズルサイズの参照先を `elf-ending` に統合する。
- 旧 `elf-ultra` を保持したセーブデータに対し、互換性のあるフォールバックを実装する。

## 完了条件
- ルート画面で practice → easy → middle → ending、practice → easy → hard → ending の双方を進行できる。
- `elf-ending` をクリアするとエンディングへ遷移し、リセット後に再挑戦できる。
- スコアボーナスと敵キャラの表示が各ノードと整合する。
- 旧セーブデータでも正常にプレイを継続できる。
