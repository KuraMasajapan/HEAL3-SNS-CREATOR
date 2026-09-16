# HEAL3 SNS-Creator コア描画・アニメーション・書き出しエンジン 技術検証レポート (PoC)

本ドキュメントは、スマートフォン向けWebアプリケーション「HEAL3 SNS-Creator」のコア描画・アニメーション・書き出しエンジンのPoC（概念実証）において実施した技術選定、実装方式、実機検証結果、およびブラウザ仕様（特にiPhone Safari）に基づく技術評価をまとめたエンジニアリングレポートです。

---

## 1. 書き出しエンジンの再確認とブラウザ仕様分析

### 1-1. iPhone Safari で `canvas.captureStream()` → `MediaRecorder` → `video/mp4` が成立する条件
iPhone Safari（WebKit）において、このパイプラインが正常に完結するには以下の**すべて**を満たす必要があります：

1. **iOS 15.0 以上（推奨: iOS 16.4+）**:
   - `MediaRecorder` 自体は iOS 14.5 で実験的機能として導入されましたが、`isTypeSupported('video/mp4')` が実用的に動作し始めたのは iOS 15 以降です。
2. **キャンバスのDOMアクティブ状態（WebKit特有の重要制約）**:
   - WebKitの実装では、DOMツリーに接続されていない完全に孤立したCanvas（`document.createElement('canvas')` のみ）に対して `captureStream()` を呼び出すと、**WebKitのCompositorがフレーム更新イベントをディスパッチせず、MediaRecorderが0バイトのまま終了する**という既知の不具合・挙動が存在します。
   - **本PoCでの対策実装**: 書き出し用Canvasを一時的に画面外（`position: fixed; top: -9999px; opacity: 0; pointer-events: none`）で `document.body` にマウントし、録画完了後の `finally` 句で `removeChild` することで、Safariでも確実にフレームストリームを吸い込ませています。
3. **偶数ピクセル解像度の強制**:
   - H.264 (AVC) ハードウェアエンコーダは縦横ピクセルが偶数（2の倍数、できれば16の倍数）でないとエンコード初期化時にエラーをスローします。本PoCでは `Math.floor(dim / 2) * 2` を厳格に適用しています。
4. **リアルタイムタイムスタンプ間隔**:
   - `captureStream(fps)` はリアルタイムの時刻経過に依存します。本PoCでは各フレーム描画後に `await new Promise(r => setTimeout(r, frameIntervalMs))` を挟み、ストリームバッファに均等なタイムスタンプでフレームを供給しています。

### 1-2. iOS / Safari のバージョンによる違い
- **iOS 14.5 未満**: `MediaRecorder` 未サポート（完全不可 → 自動的に GIF fallback 発動）。
- **iOS 14.5 〜 14.8**: 実験的機能。`video/mp4` はサポートと返してもファイル生成でクラッシュまたは空データになる事例が多い。
- **iOS 15.0 〜 16.3**: `video/mp4;codecs=avc1` が動作。ただしDOM未接続キャンバスでの `captureStream` 空出力問題あり。
- **iOS 16.4+ 〜 iOS 17 / 18**: `video/mp4` が比較的安定動作。さらに **WebCodecs API (`window.VideoEncoder`)** が利用可能になり、ハードウェアH.264のダイレクトエンコードへの道が開かれました。

### 1-3. MIME / Codec の動的判定ロジック
本PoCの `getSupportedVideoMimeType()` は以下の順序で `MediaRecorder.isTypeSupported()` を動的にテストします：
1. `video/mp4;codecs=avc1`（iOS Safari最優先：H.264 Baseline/Main）
2. `video/mp4;codecs=h264`
3. `video/mp4`
4. `video/webm;codecs=vp9`（Android Chrome最優先）
5. `video/webm;codecs=vp8`
6. `video/webm`
端末が上記いずれにも `false` を返した場合、または `MediaRecorder` 自体が存在しない場合は即座に `null` を返し、安全に GIF fallback へ移行します。

### 1-4. 生成される MP4 のコンテナ・コーデックと SNS 投稿互換性
- **生成される形式**: `MediaRecorder` が出力する MP4 は **Fragmented MP4 (fMP4)**（`moof` + `mdat` ボックスの連続）です。
- **SNS互換性**:
  - **Instagram（ストーリーズ・リール）**: iOSの写真アプリに保存されたfMP4を投稿可能。
  - **X (旧Twitter)**: Web版・アプリ版ともにfMP4のアップロードを処理可能。
  - **注意点**: 従来の古いWeb動画プレーヤーや一部のレガシーサーバー側トランスコーダーでは、先頭に単一の `moov` アトムを持つ「FastStart MP4」を要求することがあります。本番で完全な互換性を目指す場合は、WebCodecs + クライアント側 MP4 Muxer（後述）による完全制御コンテナ出力が有利です。

### 1-5. `navigator.share({ files })` の iPhone Safari 上の挙動
- iOS 15+ の Mobile Safari では、`File` オブジェクトに `type: 'video/mp4'` が指定されている場合、標準共有シート（UIActivityViewController）が「ビデオ」として認識します。
- ユーザーはシート内の**「ビデオを保存」**をタップすることで、端末のカメラロール（写真アルバム）へ即座に保存できます。また、AirDrop、Instagram、X、LINE 等への直接共有もシームレスに起動します。
- `image/gif` の場合は「画像を保存」となり、写真アプリ内でアニメーション再生されます。

---

## 2. GIF fallback の位置付けと性能評価

GIFは「最終手段のセーフティネット」であり、標準出力形式ではありません。

| 評価指標 | 動画形式 (MP4 / H.264) | GIF fallback (gifenc) | 技術的評価・差異 |
| :--- | :--- | :--- | :--- |
| **フレームレート** | 30 fps (完全滑らか) | 18 fps (間引き) | 30fpsのGIFはファイルサイズが跳ね上がるため18fpsに制限。 |
| **色数** | 24bit フルカラー (1677万色) | 8bit パレット (128色量子化) | 最大256色の規格制約。PoCでは速度重視で128色。 |
| **解像度** | 最大 800px（SNS標準） | 最大 640px（安全制限） | 解像度を上げるとSafariのメモリ消費が指数関数的に増大。 |
| **ファイルサイズ** | 約 300KB 〜 800KB (H.264高圧縮) | 約 1.2MB 〜 2.5MB | フレーム内差分圧縮がないため動画の約3〜5倍の容量。 |
| **透明表現** | なし（BASE画像と合成） | 1bit 透過（抜きのみ） | アルファブレンド（滑らかな半透明）は不可。 |
| **Glow / Gradient** | 極めて滑らか | バンディング（トーンジャンプ）発生 | 微細な光彩グラデーションが等高線状・網点状に量子化される。 |
| **iPhoneエンコード時間** | 実時間（2.4秒） | 約 1.5 〜 3.0 秒（CPUパレット計算） | メインスレッドで計算するため非同期スライシングが必須。 |
| **メモリ使用量** | 極小（ハードウェアエンコーダ） | 約 15MB 〜 30MB | フレームバッファのJavaScriptヒープ保持。 |

- **UI表示**: GIF fallbackが発動した場合、Developer Infoに **`GIF FALLBACK: YES`**、完了画面に **`⚠️ GIF FALLBACK 発動`** バナーを表示し、理由を明示します。

---

## 3. WebCodecs + H.264 の可能性調査（将来の本命候補）

| 評価軸 | 現行方式: MediaRecorder | 将来本命: WebCodecs (`VideoEncoder`) |
| :--- | :--- | :--- |
| **iPhone Safari対応状況** | iOS 15.0+ | **iOS 16.4+**（macOS Safari 16.4+） |
| **H.264 利用可否** | ブラウザの実装依存（ブラックボックス） | `VideoEncoder.isConfigSupported({ codec: 'avc1.42001f' })` で明示判定可能 |
| **エンコード速度** | **実時間必須**（2.4秒作品は2.4秒待機が必要） | **非実時間・超高速**（2.4秒作品なら約 200〜400ms で完了可能） |
| **コンテナ (MP4) 生成** | 自動（ブラウザが fMP4 を出力） | **追加処理が必須**（RAWなH.264 NALUしか出ないため、MP4 Muxerが必要） |
| **ハードウェア支援** | あり（ただしSafariのパイプラインに癖あり） | **完全なハードウェアアクセラレーション**（Apple VideoToolbox） |
| **CPU / バッテリー負荷** | ストリーム同期のためやや高い | 最短時間でSoCが処理を終えるため**負荷・バッテリー消費最小** |
| **メモリ使用量** | 低 | 極めて低（ストリーミングChunk処理） |
| **実装複雑度** | 中（ストリーム管理・DOMハックが必要） | やや高（フレーム変換＋MP4ボックス構築が必要） |
| **外部ライブラリ** | なし（ブラウザ標準） | 極小の MP4 Muxer（純TS製、約300行）が必要 |

- **結論**: WebCodecs は非実時間エンコード（待機時間の大幅短縮）と安定性の面で圧倒的に優れており、iOS 16.4+ の普及率が高まる今後の本命アーキテクチャです。本PoCでは Developer Info に現在の端末における `WebCodecs available` および `H.264 Hardware` のサポート状況を表示できるようにしました。

---

## 4. 1280px リサイズは PoC 限定の安全策

- `src/engine/config.ts` に `POC_CONFIG.MAX_IMAGE_DIMENSION = 1280` として定数分離しました。
- 近年のスマートフォン（iPhone 14/15/16 等）は 4800 万画素（8064×6048）の写真を撮影可能であり、非圧縮でメモリ上に展開すると 1 枚で 150MB〜200MB の VRAM を消費します。
- 本PoCでは端末クラッシュを防ぐために 1280px に制限していますが、本番では端末性能や出力目的（ストーリーズ 1080×1920、正方形 1080×1080 等）に応じて動的決定する設計とします。

---

## 5. 表示 Canvas と書き出し Canvas の完全な独立性

- **プレビュー画面**:
  - `CanvasStage.tsx` 内の `<canvas>` で `requestAnimationFrame` により常時 60fps 駆動。
- **書き出し処理**:
  - `exporter.ts` 内で一時生成される別インスタンスの `<canvas>` で実行。
  - 書き出し中のフレーム間ループには非同期 yield（`await new Promise(r => setTimeout(r, ...))`）が組み込まれており、書き出し中も画面のプレビュー Canvas はフレーム落ちすることなくアニメーションを継続します。
- **Developer Info での個別表示**:
  - `Preview FPS (Live)`: 画面表示側の実測フレームレート
  - `Export FPS`: 書き出し処理の記録/目標フレームレート
  - `書き出し所要時間 (Duration)`: 処理にかかった総実時間（ms）

---

## 6. Motion の決定論的再現性 (Determinism)

画面プレビューと書き出し結果の Motion は、同一のコアロジックを共有しています：
- `src/engine/renderer.ts` の `renderScene(ctx, baseImage, stamps, width, height, timeMs, options)` を両者が直接呼び出します。
- `timeMs` を与えると、`src/engine/motion.ts` の各 Motion Recipe（Bounce, Rotate, Pulse）が数学的イージング関数に基づいて、**全く同一の位置・スケール・回転角・透明度・光彩強度** を算出します。
- 書き出し専用の別 Motion ロジックは一切存在せず、完全な一致（What You See Is What You Get）が保証されます。
