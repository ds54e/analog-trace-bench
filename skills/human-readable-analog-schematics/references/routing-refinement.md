# 配線の簡素化：部品と取り出し点を合わせる

優先順位は、電気的同一性と明瞭な接続、回路の型、不要な曲げの削減、線長と余白。短くても記号を貫く線や、大きく迂回した少数の曲げは採用しない。作例と出典は [gallery-evidence.md](gallery-evidence.md) にまとめる。

## 1. 線を曲げる前に配置を変える

- 段間の送り側ノードの取り出し点と、受け側ゲートを同じ高さへ。独立した段を同じ素子行へ固定しない。
- 抵抗などの中間素子も両端の取り出し点と同じ行／列に置けないか試す。「横→縦→横」を最初から前提にしない。
- 多端子ネットは一本の共通幹線から短い枝を取る。各端子を任意の中心点へ別々の折れ線で集めない。同一ネットの重複配線を描かない。
- ゲート線が他の記号や無関係な端子を貫く場合は、鏡像・段の高さ・幹線位置を見直す。端子の見た目でD/S/Bを交換しない。
- ラベルだけが障害なら、先に文字を移す。特に横抵抗の名前と値は空いた側の2行へまとめる。
- Include the full displayed passive value when judging clearance to an adjacent MOS name. After compaction, widen only the competing local interval if moving the text would obscure its owner. The ATB LDO refinement required this around XM4 and C1; passing electrical diagnostics did not establish text clearance.
- Align a receiving gate with the available shared bias trunk when that removes a return bend without obscuring the current path. Do not require a tail device and an independent output sink to occupy the same row. Check foreign-terminal contact after moving either device.
- If a supply rail meets an existing source terminal exactly, terminate the native route at that terminal. Do not add a coincident junction and a zero-length route to simulate a separate connection.

## 2. T分岐と交差

このユーザーの方針として、同一ネットの四方向接続は二つのT分岐に分ける。点が重ならない最小限のずれから試し、部品間隔まで広げない。標準Analog Canvas記号では10描画単位を使ったが、別レンダラーへ固定流用しない。

分圧抵抗の共通の縦軸は維持する。CFFとFBの取り出し点だけを少しずらす。異なるネットの非接続交差をT字に変えてはならない。非接続交差は配置で減らし、残す場合は点なし交差など図全体で同じ規約を使う。対称なクロス結合を示す短い斜線は、対応関係が明瞭になる場合に限り検討する。

幾何検査では、routeの分割数ではなく実際の上下左右の導線を調べる。単なる直線の分割を分岐や曲げとして数えない。

## 3. ドレイン幹線とD–G枝を描き分ける

電気的に同じネットでも、合流位置は回路の読み方に影響する。局所的なD–G結線は短い枝として見せ、別の帰還線はドレイン側の幹線へ直接合流させる。

ATBの具体例は `RB VOUT NB` と `XMB NB NB VSS VSS`。RBからの戻りはRSとXMBドレインを結ぶ縦配線へ接続し、XMBのD–G接続用の横枝へ差し込まない。NBという同一ノードは保持する。

この分離のためにRBを下段へ固定して迂回させない。VOUT側の取り出し点、RB、RS–XMB幹線の合流点を同じ高さにそろえ、直線で結ぶ案を優先する。D–G枝は別の高さに残せる。微小なT分岐のずれと、機能上別の高さへ取る枝を混同しない。

## 4. 必須の簡素化パス

1. 主信号、補償、帰還、共有バイアスを端から端まで追う。各曲げ・折返し・広い隙間に理由があるか確認する。
2. 同一ネット上の取り出し点、文字、受け側素子、中間R/C、局所グループを動かす候補を比較する。部品を固定して線だけを短くする作業で終えない。
3. 記号貫通、曖昧な分岐、過密ラベルを増やさずに直線化・短縮できる案を採用する。必要なピン回避、局所D–G枝、差動対の共通点、明瞭な補償／帰還の形は残す。
4. 実際のネイティブ図を再描画し、通常表示と詳細表示で確認する。最後に保存・再オープンしたデータの接続と値を照合する。

「機能を追える」「診断が0」「曲げが少ない」だけで完了としない。残る迂回は具体的な障害物や読み取り上の理由で説明できること。総線長や自己採点だけを合否に使わない。
