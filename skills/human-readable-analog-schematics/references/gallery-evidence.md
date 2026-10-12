# Gallery evidence / 作例から得た判断

## Native editor comparison, 2026-10-12

Signed in to the community gallery and opened these four existing examples in
the browser's native editor. These are new visual observations, not electrical
qualification of the gallery circuits. The `/g/` URLs below opened successfully
in that authenticated session; sign-in may be required. No circuit was published
or changed in the gallery.

| Opened example | Observed placement, wiring and labels | Applied judgment / limit |
|---|---|---|
| [current mirror — 56a67nmqbb](https://analog-canvas.tokenzhang.com/g/56a67nmqbb) | Inward-facing gates share a horizontal trunk; the diode-connected drain joins it through a short local branch. M1/M2 names sit outside the pair, while current arrows sit on the drain branches. | Keep OTA XMbn mirrored, its D–G tie local and its gate connection to XMtl continuous. Do not import the example's arrows or dimensions into the submitted circuit. |
| [Two-stage op amp with single-ended output — x5jaqe94t7](https://analog-canvas.tokenzhang.com/g/x5jaqe94t7) | Intermediate drain taps meet M5/M6 gates at their respective heights. The lower common-gate trunk is separated from the input stage. MOS names follow each body, and inputs remain near their gates. | Favor pin-to-trunk alignment over a uniform device row. In ATB, shifting the independent output sink aligns its gate with the existing bias route and removes a return bend. This example has a different load/bias topology and no matching ATB compensation branch. |
| [LDO regulator's core structure — pes3mh8swm](https://analog-canvas.tokenzhang.com/g/pes3mh8swm) | Error amplifier, buffer and output stage proceed left to right. The output divider is directly below the pass drain, with nearby parallel output branches. Vfb is a labeled discontinuity. | Retain the output/divider relationship and close neighboring parts. ATB has no separate buffer; show its actual direct gate drive and continuous FB return. |
| [LDO regulator — 8qatzztvzk](https://analog-canvas.tokenzhang.com/g/8qatzztvzk) | The output divider shares the pass-drain column. Its midpoint returns along a dedicated lower corridor to the input side; the signal path uses a different height. The return has sparse labeling and crosses other branches. | Separate the visible feedback corridor from the NB return without sending either to a distant page edge. Keep ATB's FB/NB labels and no-dot crossing convention; do not treat the example's apparent input opening as verified connectivity. |

The ATB native renders were reviewed independently at reading size after these
comparisons. An initially tighter XM4/C1 interval caused the MOS name and
capacitor value to compete; local separation resolved it without smaller text.
Moving the OTA sink also required checking its source endpoint: a coincident
source/junction created a zero-length route, and a different candidate bias
height touched the tail source. The final recipe uses an actual source endpoint
and avoids foreign-terminal contact. These are verified tool/layout findings;
the circuit coordinates remain only in the pilot recipe.

観察日：2026-10-11。ユーザーのログイン後、[指定ギャラリー](https://analog-canvas.tokenzhang.com/?ai=0)の `ai=0` 絞り込みを確認。表示件数889件、取得した先頭ページ60件から、OTA・補償・LDO・バイアスを含む13件を選び、SVGプレビューをブラウザーで表示して目視比較した。全件を評価したものではない。

`ai=0` は保存された `ai_generated=0` に対応する（[実装](https://github.com/cascode-ai/analog-canvas/blob/37bccd4012764dce53b34927fa606c6f430296a2/worker/gallery-store-wall.ts#L206)）。個々の制作過程・著者性を別途確認したわけではない。作例の回路動作・接続・値の正しさを検証する調査ではなく、図の読みやすさを観察した。閲覧リンクはログインを要する場合がある。

「観察」は図から読み取れる特徴、「次回への示唆」はそこから導いた作図上の判断。読みやすさの保証や公式規格ではない。表示著者名はギャラリーの記載であり、論文・教科書の原著者とは限らない。

## 差動枝の対称性

[Continuous-Time Comparator with Preamplifier](https://analog-canvas.tokenzhang.com/api/gallery/8nm6fak8ez/preview.svg) — 表示著者：Magic Li、ID `8nm6fak8ez`。

**観察／採用したい特徴：** 左右のMOSが行ごとに揃い、対応する枝と共通点が形で読める。主回路と後段・スイッチが空間的に分かれる。

**注意／適用の限界：** 密な中央のVCM・抵抗周辺は文字の余裕が少ない。対称性を採用し、文字密度まで真似ない。

## ミラーの共通ゲート

[Self Bias Circuit](https://analog-canvas.tokenzhang.com/api/gallery/zp3r9haqg7/preview.svg) — 表示著者：Zengchun Chen、ID `zp3r9haqg7`。

**観察／採用したい特徴：** 上部のM1/M2/M5の共通ゲートと短いD–G帰還、右側の二つのバイアス出力が見える。

**注意／適用の限界：** 左右対称そのものが目的ではない。自己バイアスの戻り経路があるため、単純な左→右の図に変形しない。

## 補償の接続先

[Miller Compensation of Two Stage AMP with Voltage Buffer](https://analog-canvas.tokenzhang.com/api/gallery/fy4qb94fzy/preview.svg) — 表示著者：Zengchun Chen、ID `fy4qb94fzy`。

**観察／採用したい特徴：** 入力と出力を左右に置き、主増幅の線とCcの枝を上下に分ける。Ccがバッファ側へつながることを線で追える。

**注意／適用の限界：** これは電圧バッファ付き補償の作例。ATBの直列RCへトポロジーを転用しない。

## 主経路と補助枝

[Miller Compensation With Current Buffer](https://analog-canvas.tokenzhang.com/api/gallery/a2nn9n6pbn/preview.svg) — 表示著者：Zengchun Chen、ID `a2nn9n6pbn`。

**観察／採用したい特徴：** 下側の入力から次段ゲートへ向かう線と、上側のCcの枝を分離。局所電源・接地記号で大きな外枠を作らない。

**注意／適用の限界：** 図が簡潔でも値やモデルを省略した概念図である。実ネットリストからの図には全値を保持する別表や詳細表示が必要。

## 機能だけを補助色で強調

[OTA including passives for frequency compensation.](https://analog-canvas.tokenzhang.com/api/gallery/xd4knhb9f5/preview.svg) — 表示著者：Magic Li、ID `xd4knhb9f5`。

**観察／採用したい特徴：** 主回路の黒に対し、補償の受動素子を緑、gmブロックを青で示す。入力側から出力側へ段が並ぶ。

**注意／適用の限界：** 色枠と配線が密になる箇所もある。色は説明用で、接続や極性を色だけに任せない。

## 大回路の分割

[Two Stage OTA with Flying Cap CMFB](https://analog-canvas.tokenzhang.com/api/gallery/cwmesegne8/preview.svg) — 表示著者：Zengchun Chen、ID `cwmesegne8`。

**観察／採用したい特徴：** 主OTAを左、スイッチトキャパシタCMFBを右上、バイアスを右下に配置。主OTAの左右の対称な対応が残る。

**注意／適用の限界：** ブロック間はラベル参照になる。主ループの説明を目的とする場合は全体の接続図も添える。短い斜めクロス線は対応を示す例外。

## 機能と補助回路の階層

[Telescopic OTA with CMFB and Bias](https://analog-canvas.tokenzhang.com/api/gallery/cbmzkzbr8x/preview.svg) — 表示著者：Zengchun Chen、ID `cbmzkzbr8x`。

**観察／採用したい特徴：** 左に積み重ねた対称なOTA、中ほどにCMFB、右に独立したバイアス回路。局所ごとの電源範囲を保つ。

**注意／適用の限界：** 横長なので小さい画面では文字が小さくなる。詳細ビューの分割も必要。色枠の重なりまで作図ルールにしない。

## 複雑さに対する段組み

[amplifier including a folded cascode differential gain stage, the biasing circuit and second gain stage.](https://analog-canvas.tokenzhang.com/api/gallery/dsf2ff78pp/preview.svg) — 表示著者：Magic Li、ID `dsf2ff78pp`。

**観察／採用したい特徴：** 左のバイアス、中央の入力・増幅部、右の出力段へ配置が進む。同じ素子段を水平に揃える。

**注意／適用の限界：** 多数の横断配線が残り、ひと目で理解できる万能な作例ではない。ATBの少数素子回路ではもっと短くまとめられる。

## LDOの機能順

[LDO regulator’s core structure](https://analog-canvas.tokenzhang.com/api/gallery/pes3mh8swm/preview.svg) — 表示著者：Magic Li、ID `pes3mh8swm`。

**観察／採用したい特徴：** 誤差増幅器→バッファ→出力段を左から右へ並べ、分圧器を出力の下に置く。

**注意／適用の限界：** Vfbはラベルで分断される。この作例の段配置を採用しつつ、閉ループ説明用のATB図では帰還線を見せる。

## LDOの帰還通路

[LDO regulator](https://analog-canvas.tokenzhang.com/api/gallery/8qatzztvzk/preview.svg) — 表示著者：Magic Li、ID `8qatzztvzk`。

**観察／採用したい特徴：** 右側の分圧器中点から入力側へ下端の戻り線を確保している。入力・増幅・パス段の並びと合わせ、帰還先を追える。

**注意／適用の限界：** 試験用と思われる開口・ラベルが入力近傍にある。電気的連続性をこのプレビューだけで保証しない。中央の交差が多い点も残る。

## 局所対称と外周配線

[low-dropout regulator](https://analog-canvas.tokenzhang.com/api/gallery/g6b58gnemm/preview.svg) — 表示著者：Magic Li、ID `g6b58gnemm`。

**観察／採用したい特徴：** 左の対称な増幅部、上部の補償枝、右側の出力側回路が空間的に分かれる。長い線を外周へ逃がしている。

**注意／適用の限界：** C4表記が複数あり、VOUTも別位置のラベル参照になっている。見た目を元に接続・識別子の正しさまで信用しない。

## 過密化の比較例

[LDO](https://analog-canvas.tokenzhang.com/api/gallery/66fgy9aetr/preview.svg) — 表示著者：Magic Li、ID `66fgy9aetr`。

**観察／採用したい特徴：** 縦の枝と素子行が揃うので、各局所構造は認識できる。

**注意／適用の限界：** 全体の素子数と横幅が大きく、複数のVoutラベルもある。全体図＋詳細図を分ける判断の参考にする。小回路でこの密度・横幅を再現しない。

## バイアスの役割分け

[Bias structure](https://analog-canvas.tokenzhang.com/api/gallery/ck79hnz2xw/preview.svg) — 表示著者：Magic Li、ID `ck79hnz2xw`。

**観察／採用したい特徴：** 左・中央・右の部分に役割を示し、共通ゲートの横線と枝の縦線を整える。

**注意／適用の限界：** 色枠の外にも関連素子があり、見出しだけでは全接続を説明しきれない。機能境界の正しさは元ネットリストで確認する。

## 配線と局所密度を比較した追加作例

同日、ミラー・小規模OTA・2段増幅器を8件追加し、LDOを2件再確認した際の観察。初回と重なる作例も、ここでは配線に着目している。新たな閲覧や電気検証を意味しない。

| 作例 | 観察と採用する点 | 注意 |
|---|---|---|
| [current mirror — 56a67nmqbb](https://analog-canvas.tokenzhang.com/api/gallery/56a67nmqbb/preview.svg) | M1/M2のゲートが向かい合い、一本の水平線。D–Gだけ短い局所戻り | この短いD–G接続まで無駄な曲げとして消さない |
| [5T-OTA — 9sc926amjy](https://analog-canvas.tokenzhang.com/api/gallery/9sc926amjy/preview.svg) | 上の負荷ゲート線、下の共通ソース線が単純な水平線。テールは中央から縦に接続 | 多段・補助バイアスのない小回路なので、そのまま大回路へ外挿しない |
| [Five Transistor OTA Active Load — vqdg9y347r](https://analog-canvas.tokenzhang.com/api/gallery/vqdg9y347r/preview.svg) | 同じ局所形を再確認。枝の対応と中央のT分岐が明確 | ダイオード側の小さな戻りは意図のある線 |
| [Simple implementation of a two-stage op amp — 6qg2h7weje](https://analog-canvas.tokenzhang.com/api/gallery/6qg2h7weje/preview.svg) | 中間ノードX/Yと外側の次段ゲートが同じ高さで、段間接続は直線 | 出力段PMOSを上の負荷PMOSと同じ高さに揃えていないことが重要 |
| [Two-stage op amp with single-ended output — x5jaqe94t7](https://analog-canvas.tokenzhang.com/api/gallery/x5jaqe94t7/preview.svg) | M6ゲートを送り側のノードへ合わせた直線接続。下のミラーも共通線を一本化 | ATBとはトポロジーが異なる。配置関係だけを参考にする |
| [2stage miller amp wi bias — vys6p4zc7s](https://analog-canvas.tokenzhang.com/api/gallery/vys6p4zc7s/preview.svg) | 左右の補償RCが直列の水平枝、分布バイアスが共通線になっている | ゲート共通線と記号の境界が密な箇所もある。共通線でMOS本体を貫通させない |
| [Basic Structure of Two-Stage OTA — aztzpg4vhj](https://analog-canvas.tokenzhang.com/api/gallery/aztzpg4vhj/preview.svg) | 二つの中間ノードの高さに合わせて次段ゲートを別々の高さへ置き、段間は直線 | 全てを同じ行へ揃えることより接続を優先した例。交差は残るため規約確認が必要 |
| [Current Mirror — r3s2w9jkm3](https://analog-canvas.tokenzhang.com/api/gallery/r3s2w9jkm3/preview.svg) | カスコードの縦枝を揃え、遠い補助バイアスはラベルへ分けている | ラベルを一律禁止すると、かえって巨大な横断線が増える |
| [LDO regulator — 8qatzztvzk](https://analog-canvas.tokenzhang.com/api/gallery/8qatzztvzk/preview.svg) | 主信号を水平、帰還を下端の一本の通路に分ける | 試験用と思われる入力付近の開口などは参考対象外。配線の電気的正しさは未検証 |
| [LDO regulator’s core structure — pes3mh8swm](https://analog-canvas.tokenzhang.com/api/gallery/pes3mh8swm/preview.svg) | 増幅部出力とバッファM13ゲートを同じ高さに置く。出力段入口も近接接続 | Vfbはラベルで分断。ATBの主帰還を隠す理由としては使わない |
