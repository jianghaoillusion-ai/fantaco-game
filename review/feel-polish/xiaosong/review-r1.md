VERDICT: FAIL

# 小頌審查：FANTACO 手感修正（feel1，第 1 次）

審的是分支 `xiaoxia/feel-polish`，commit `43c5a62`（程式在 `42e7fc8`），起點 `80359c4`。我只做審查，沒改程式、沒 commit、沒 push。

**一句話結論：六項裡五項過，第 1 項「震動研究」沒過，所以整輪 FAIL。** 程式本身沒有發現會壞的地方，要補的主要是研究結論與測試頁上的標示，另外動畫參考來源有一個缺口請我的王決定要不要補。

## 逐項結果

| 項目 | 結果 | 重點 |
|---|---|---|
| 1 震動 | **FAIL** | 版本門檻寫「未確認」，但官方有寫；一個來源連結是 404；測試頁沒標 iOS 版本 |
| 2 拖曳落點 | PASS | 我重跑 1,575 次拖放，誤判 0 格 |
| 3 音效 | PASS | 三個音效都在、短、原創、比 BGM 小聲很多（可能太小聲） |
| 4 動畫 | PASS（有缺口） | 沒補幀、沒掉幀；但彈簧參數全是「自己調的」，沒有任何商用遊戲的 60/120fps 拆解 |
| 5 交付 | PASS | 公開網址打得開、沒有 JS 錯誤；報告沒說 iPhone 測過 |
| 6 分支 | PASS | PR #9 是 draft；main、bgm-cute、mobile-fix 遠端都沒動 |

## 1. 震動（FAIL）

**對的部分（我逐一查證過）：**
- iOS Safari 沒有 `navigator.vibrate`：正確，來源連結可開。
- WebKit commit `fc1ef83` 真的存在，標題就是「switch 的觸覺可以被程式點 label 觸發」的修正，新增的測試叫 `HapticFeedbackRequiresUserGestureAndTrustedEvent`。小夏說「修正後程式 `label.click()` 不會震，就算在真實點擊事件裡也一樣」是對的。
- 我讀了 WebKit `CheckboxInputType.cpp`：觸覺要「真實（trusted）點擊＋開關沒被停用＋有畫在畫面上」，跟小夏寫的一致。
- 遊戲實作我用無頭瀏覽器實測（把 `navigator.vibrate` 拿掉模擬 iPhone）：
  - 拿起：在 `pointerdown` 裡同步觸發；合成：在 `pointerup` 裡同步觸發。都是真實手勢事件內。
  - 點「交付」：真實點擊會轉給隱藏的原生開關，該點擊是 trusted、開關還在畫面上、只交單 1 次。
  - 震動開關關掉：拿起／合成觸發 0 次、原生開關不切換、`vibrate` 呼叫 0 次。
  - 有 `vibrate` 的裝置（Android 路徑）：8／24／32 毫秒各一次。
  - 全程沒有 JS 錯誤。
- 報告、README、研究檔都有寫「沒有 iPhone 實機測試」。

**沒過的原因：**
1. **版本門檻寫錯方向。** 小夏寫「觸覺最早出貨的 iOS 版本未確認」。但 WebKit 官方部落格〈WebKit Features in Safari 18.0〉白紙黑字寫：「WebKit for Safari on iOS 18 adds haptic feedback for `<input type=checkbox switch>`」。也就是：開關控制項是 17.4 才有，**觸覺是 iOS 18.0 才有**，不是 18.4，也不是未知。這篇官方文小夏沒引用。來源：https://webkit.org/blog/15865/webkit-features-in-safari-18-0/
2. **一個來源連結打不開。** `https://docs.flarum.org/en/extend/haptic-feedback/` 回 404。正確網址是 `https://docs.flarum.org/extend/haptic-feedback/`（沒有 `/en`）。驗收要求每條來源可查。
3. **測試頁沒有標 iOS 版本需求。** `haptic-test.html` 按鈕都有、做不到的也有寫原因，這部分是好的。但旁邊小字寫的是「舊引擎」「fc1ef83 修正後」這種工程代號，我的王看不懂、也對不到自己手機。「直接點 switch」那格只寫「Safari 17.4 起有此控制項」，那是控制項的版本，不是會震的版本。

**我的王最需要知道的白話版：**
- iPhone 網頁沒有「叫手機震一下」的功能。唯一的門路是系統開關被「真的手指點到」時會順便震一下。
- 以前有個偷吃步（程式假裝點開關），多個第三方資料說 iOS 26.5 起被蘋果封掉了（這個版本號我只查到第三方說法，沒有官方出處）。
- 所以如果我的王的 iPhone 是新系統：**拿起、合成很可能還是不會震**，只有直接點「交付」那顆有機會震。這不是小夏沒做，是蘋果不給。請先用測試頁確認自己手機哪幾顆會震。

## 2. 拖曳落點（PASS）

我自己寫腳本重跑（`review/feel-polish/xiaosong/drop-check.mjs`）。跟小夏不同的地方：用 Safari 實際可視大小（不是整個螢幕高度）、每格打 5 個點（中心＋上下左右邊緣內縮 3px），不是只打中心。

### 落點誤差表

| 情境 | 格子大小 | 拖放次數 | 誤判格數 | 高亮格≠落格 | 圖示相對手指位置 | 相對「手指上方 32px」的殘差（平均／最大） |
|---|---|---:|---:|---:|---|---|
| iPhone SE 320×568、DPR2 | 25px | 315 | **0** | 0 | 正上方 32.00px | 0.000006／0.000011 px |
| iPhone 13 390×664、DPR3 | 35px | 315 | **0** | 0 | 正上方 32.00px | 0.000013／0.000022 px |
| iPhone 15 Pro 393×659、DPR3 | 35px | 315 | **0** | 0 | 正上方 32.00px | 0.000013／0.000022 px |
| iPhone SE、DPR2、頁面捲動 80px | 25px | 315 | **0** | 0 | 正上方 32.00px | 0.000007／0.000011 px |
| iPhone 13、DPR3、頁面捲動 120px | 35px | 315 | **0** | 0 | 正上方 32.00px | 0.000011／0.000022 px |

合計 1,575 次，誤判 0。捲動情境我有確認棋盤真的在螢幕上往上移了 80／120px。

- 手指點的格＝高亮的格＝實際落下的格，三者一致。
- 圖示固定浮在手指正上方 32px，這是刻意設計。因為格子只有 25–35px，圖示中心有 84–100% 的時候「看起來」在上一格，但高亮框會標出真正會落下的格。
- 判定基準用「手指點」：依據是開源專案 Unity_MergeGame 的 `GameController.cs`，我打開原始碼確認第 85–89、134 行確實是放開時用 `Input.mousePosition` 打射線決定格子。連結可開。Travel Town／Merge Mansion 本身沒查到，小夏有老實寫。
- 環境限制：這是 Mac 上的無頭 Chromium 模擬，不是 iPhone 實機。

## 3. 音效（PASS）

| 音效 | 長度 | 檔案峰值 | 檔案 RMS | 遊戲裡播放後的峰值 | 最大瞬時響度（播放後） |
|---|---:|---:|---:|---:|---:|
| sfx-merge | 0.30 秒 | −15.9 dBFS | −27.4 dB | 約 −33.2 dBFS | 約 −45.7 LUFS |
| sfx-generate | 0.18 秒 | −15.9 dBFS | −26.8 dB | 約 −33.2 dBFS | 約 −47.5 LUFS |
| sfx-order | 0.42 秒 | −15.9 dBFS | −27.1 dB | 約 −33.3 dBFS | 約 −43.6 LUFS |
| BGM（14 首） | — | −4.1 ～ −8.2 dBFS | −18.8 ～ −20.4 dB | 約 −13 ～ −17 dBFS | 整體約 −25.3 LUFS |

（播放音量：音效 0.16×0.85＝0.136；BGM 0.5×0.72＝0.36，都是預設設定。）

- 音效比 BGM 小約 16 dB（RMS）、峰值小約 16–20 dB：**確定不會蓋過音樂**。
- 原創：`make-sfx.py` 是用 numpy 疊正弦波做的上行小鈴聲，沒有用任何取樣或外部服務。
- Web Audio：預先解碼成 buffer，用 `AudioBufferSourceNode` 播。我實測合成／生成／交單各播 1 次，長度 0.30／0.18／0.42 秒，gain 0.136。
- 音效開關：關掉後三個動作重做，短音效新增 0 次、其他提示音新增 0 次。
- 受保護音檔：32 個 `bgm-*`、`feixiang-sting`、`sting-clear` 的 git 內容雜湊在 80359c4 與 HEAD 完全相同；合併 sha256 我算出來是 `e65b03a7dcb61eb3`，跟腳本附註一致。
- 可不可愛我聽不到，請我的王用耳朵判斷。

## 4. 動畫（PASS，有缺口）

### 來源 fps 核對

| 來源 | 我用 ffprobe 量到的 | 小夏寫的 | 用途 |
|---|---|---|---|
| `game-rec.mp4`（我的王的錄影） | HEVC 1320×2868，r_frame_rate 60/1，avg 837/14≈59.79，279 幀；幀間隔 16.67ms×276、25ms×2，輕微 VFR | 完全一致 | 只拿來看「拖曳跟手」 |
| `before.webm`／`after.webm` | VP8 390×844，25fps | 一致，有標「只供外觀比較，不當時間曲線依據」 | 前後對照 |
| Unity_MergeGame 原始碼 | 不是影片，fps 不適用 | 一致 | 判定基準 |

- 沒有補幀：所有腳本與文件我搜過，沒有 minterpolate、RIFE、任何重取樣參數；`reference-curve.csv` 的時間間隔是 16.666ms 一格，跟原生時間戳吻合。
- 低於 60fps 的來源（25fps 對照片）沒有被拿來當曲線依據。
- 參數表 8 個動作都有時長、曲線、overshoot、延遲、來源欄。
- 實作跟參數表對得上：吸附 100ms、合成 320ms（0.55→1.22→0.95→1）、生成落格 280ms、拋物線 260ms 弧高 36px、交單 360ms 弧高 40px、粒子 400ms 8 顆。
- 我在動畫進行中逐格抓「正在動的屬性」：只有 `transform` 和 `opacity`。拖曳跟手用 rAF。

### fps 數字（我自己量，CPU 4 倍節流，iPhone 13 尺寸 DPR3，每個動作 6 輪，不開錄影）

| 版本 | 動作 | 平均 fps | 最低 fps | 最長一格 | 掉幀數／總幀數 |
|---|---|---:|---:|---:|---:|
| 修後 | 閒置（對照） | 60.24 | 29.24 | 34.2ms | 1／252 |
| 修後 | 合成 | 59.52 | 30.49 | 32.8ms | 9／276 |
| 修後 | 生成 | 60.88 | 29.67 | 33.7ms | 7／295 |
| 修前 | 閒置（對照） | 62.63 | 27.78 | 36.0ms | 28／260 |
| 修前 | 合成 | 63.87 | 29.15 | 34.3ms | 18／294 |
| 修前 | 生成 | 65.03 | 34.84 | 28.7ms | 21／310 |

- 修後每輪動畫平均掉 1–1.5 格，每次都只掉單格（最長 33ms），沒有連續卡頓。修前版本和「完全不節流」的對照組掉得一樣多甚至更多（不節流：合成 16、生成 15），所以這是無頭瀏覽器本身的抖動，不是新動畫造成的。**結論：沒有明顯掉幀。**
- 這不是 iPhone 實機的 fps。

### 缺口（沒有違規，但沒達到原本的期待）
- 我的王的錄影我看過了：是我們自己遊戲的拖曳畫面加控制中心，沒有合成或彈跳可以量。所以小夏說「只能支持拖曳觀察」是實話。
- **Travel Town／Merge Mansion 的 60/120fps 錄影一支都沒拆。** 彈簧、overshoot、拋物線全部標「本次調校」，也就是小夏自己調的數字。報告只寫「未取得」，沒寫有沒有試過下載、卡在哪。原本的要求是「做不到要說明」。
- 抽幀用的 ffmpeg 指令沒有留在 repo 裡（只留了 ffprobe 結果和量測程式），我只能從數據反推它沒補幀。

## 5. 交付（PASS）

- 前後對照片是真的：我抽格看過，`before.webm` 是舊版（生成物直接出現），`after.webm` 是新版，畫面不同；兩支都 390×844。
- 公開網址我自己打：
  - `https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/42e7fc837f5a398bf18c6c93feb9846fcf5bcbea/index.html`：curl 200；無頭瀏覽器載入後棋盤 63 格、JS 錯誤 0、失敗資源 0、破圖 0。
  - `.../review/feel-polish/haptic-test.html`：curl 200；9 顆按鈕＋3 個開關、JS 錯誤 0。
  - 線上的 `js/fx.js` 內容與 commit `42e7fc8` 完全相同。
  - 注意：githack 第一次開會先跳一頁「Open the page」的提醒，要點一下才進去。小夏的測試步驟第 1 步有寫。
- iPhone 測試步驟 5 步，繁體中文。
- 報告沒有宣稱 iPhone 已測，反而多處寫明沒測。

## 6. 分支（PASS）

- PR #9：draft、OPEN、目標 main、來源 `xiaoxia/feel-polish`、head `43c5a62`。
- 遠端 main 仍是 `80359c4`。
- 遠端 `xiaoxia/bgm-cute` 仍是 `364d093`、`xiaoxia/mobile-fix` 仍是 `5216312`，沒被推。

## 問題清單

**必修（修完才能過）：**
1. `haptics-research.md`：把「觸覺最早出貨版本未確認」改成「iOS 18.0（Safari 18.0）起有 switch 觸覺」，補上官方來源 https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ 。
2. `haptics-research.md` 與報告：Flarum 連結改成 `https://docs.flarum.org/extend/haptic-feedback/`。
3. `haptic-test.html`：每顆按鈕旁改用看得懂的 iOS 版本寫法，例如「直接點開關：iOS 18 以上應該會震」「程式點 label：iOS 18 到 26.4 可能會震，26.5 起被封（版本號為第三方說法）」。

**請我的王決定要不要補：**
4. 動畫參數沒有任何商用遊戲的 60/120fps 拆解依據。要補的話，請小夏實際試一次下載 Travel Town／Merge Mansion 的 60fps 實機片，寫明成功或卡在哪；並把抽幀的 ffmpeg 指令留在 repo。

**不擋這輪，但建議處理：**
5. 新音效可能太小聲。它比 BGM 小 16 dB 以上，而且比「拿起」那個舊提示音（播放峰值約 −29 dBFS）還小 4 dB。合成成功的聲音比拿起還小，手感上可能反過來。請我的王開音樂實際聽，聽不到就請小夏把播放音量從 0.16 往上調。
6. 既有版面問題（不是這次改出來的）：Safari 實際可視高度下，棋盤最後一列被下方面板蓋掉一部分——iPhone 13 尺寸約 6px、15 Pro 約 11px、小螢幕 SE 約 12px（格子才 25px）。手指點在被蓋住的那條會放不下去、彈回原位。我第一次跑時就是在這裡出現 7 個放不下去的點，確認是被蓋住而不是判定錯格。
7. 格子只有 25–35px，圖示浮起 32px 幾乎剛好是一整格。判定是對的，但我的王看到的會是「圖示在上一格、亮框在這一格」。這可能就是原本覺得「偏移」的來源之一，請實機感受後決定浮起量要不要再降（例如 16–20px）。
8. 拿起的震動在手指一碰到物品就觸發（包含只是點一下產生器），不是真的開始拖才觸發。

## 我的量測檔與圖（repo 相對路徑）

- `review/feel-polish/xiaosong/drop-check.mjs`、`review/feel-polish/xiaosong/drop-check.json`：落點重跑腳本與 1,575 筆原始資料
- `review/feel-polish/xiaosong/anim-audio-haptic-check.mjs`、`review/feel-polish/xiaosong/anim-audio-haptic-check.json`：fps、動畫屬性、音效開關、震動開關
- `review/feel-polish/xiaosong/public-check.json`：公開網址檢查結果
- `review/feel-polish/xiaosong/drag-scrolled-iphone13.png`：捲動 120px 時拖曳中（紅點是手指位置）
- `review/feel-polish/xiaosong/layout-iPhone13-scroll0.png`、`review/feel-polish/xiaosong/layout-iPhoneSE-scroll0.png`：最後一列被蓋住的版面
- `review/feel-polish/xiaosong/merge-mid-1.png`、`review/feel-polish/xiaosong/merge-mid-2.png`、`review/feel-polish/xiaosong/spawn-mid.png`：合成與生成動畫中途
- `review/feel-polish/xiaosong/public-game.png`、`review/feel-polish/xiaosong/public-haptic-test.png`：公開網址實際畫面

## 我沒做到／沒辦法確認的

- 沒有 iPhone 實機：會不會震、聽起來如何、實機 fps，都要我的王自己試。
- 「iOS 26.5 起封掉程式觸發」只有第三方資料，沒有蘋果官方出處。
- 只用 Chromium 模擬，沒有用 Safari 引擎跑。
- 頁面雙指放大的狀態沒測（驗收沒要求；小夏也只測了隔離頁）。

## 收尾

- 暫存已刪：基線快照、暫存腳本、抽格圖都清掉；我開的 8923／8924 本機伺服器已關。
- 沒開 Photoshop／Illustrator／MOSS／可見瀏覽器。
- worktree 只多了未追蹤的 `review/feel-polish/xiaosong/`，沒有 git add／commit。
