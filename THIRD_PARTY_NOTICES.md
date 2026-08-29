# Third-party notices

このリポジトリの DSP は Bfxr / sfxr 系の挙動・数式・設計を参照した独立実装です。**現時点では参照元のソースを直接取り込んでいません。**

44100 Hz 固定の時間計算は継承しません。

## 参照実装とライセンス

| 参照 | ライセンス | 原文 | 用途 |
| --- | --- | --- | --- |
| [increpare/bfxr2](https://github.com/increpare/bfxr2) | MIT | [licenses/bfxr2-MIT.txt](licenses/bfxr2-MIT.txt) | 現行 Web 実装のパラメータ体系確認 |
| [increpare/bfxr](https://github.com/increpare/bfxr) | Apache-2.0 | [licenses/bfxr-Apache-2.0.txt](licenses/bfxr-Apache-2.0.txt) | `SfxrSynth.as` のアルゴリズム確認 |
| [FigBug/bfxr](https://github.com/FigBug/bfxr) | BSD-3-Clause | [licenses/figbug-bfxr-BSD-3-Clause.txt](licenses/figbug-bfxr-BSD-3-Clause.txt) | C++ / Emscripten 化の実装参考 |
| [chr15m/jsfxr](https://github.com/chr15m/jsfxr) | Unlicense | [licenses/jsfxr-Apache-2.0.txt](licenses/jsfxr-Apache-2.0.txt) | 最小 DSP 構造の理解 |

`increpare/bfxr` にはルートの `LICENSE` ファイルがなく、`readme.MD` およびソースヘッダが Apache License 2.0 を示すため、Apache 2.0 公式全文を `licenses/bfxr-Apache-2.0.txt` に保存しています（代表著作権表示: Copyright 2010 Thomas Vian, `SfxrSynth.as`）。

`chr15m/jsfxr` の公式ライセンスファイルは `UNLICENSE`（The Unlicense）です。タスク T010 で定めたファイル名 `jsfxr-Apache-2.0.txt` にその原文を保存しています。

## ソースを取り込む場合

参照実装のコードを本リポジトリに直接取り込む場合は、次を行ってください。

1. 取り込み元と派生関係を本ファイルおよび `licenses/` に追記する
2. 各ファイルに元の著作権表示とライセンス条件を保持する（削除・短縮しない）
3. 改変したファイルには改変箇所が分かるようにする
4. 取り込みに伴い `core/` や `src/` を変更した場合、該当パスと由来を PR / コミット説明に明記する

ライセンス原文は `licenses/` に置き、本ファイルからリンクします。
