# 動作參數與可追溯依據

## 來源
- `game-rec.mp4`：1320×2868 HEVC，r_frame_rate **60/1**，avg_frame_rate **837/14 = 59.7857**；279 幀、4.66 秒；276 個 16.67ms 間隔、2 個 25ms 間隔，輕微 VFR。依原生時間戳逐格抽出，**沒有重取樣、補幀或插幀**。名目 60fps 來源，平均略低已明示。`reference-probe.json` 是完整 ffprobe 資料，`reference-curve.csv` 是第 8–43 幀青色藥水色區位置／面積平方根縮放代理量。代理量會受遮擋與色彩閾值影響，並非整張物品的精確邊界。
- 開源 [dev-lime/Unity_MergeGame / GameController.cs](https://github.com/dev-lime/Unity_MergeGame/blob/375bb00a0e07b5c945137b6e1350d96d1bd07d66/Assets/Scripts/GameField/GameController.cs)：Update 的 GetMouseButtonUp 呼叫 SendRayCast，使用 Input.mousePosition；放下依手指／游標，不依畫面上滯後的物品中心。OnItemSelected 以 `10 * deltaTime * distance` 的 MoveTowards 跟隨；合成直接換物品、沒有可引用的彈簧時間。這是原始碼參考，fps **不適用**，並非錄影。
- 第一輪 Travel Town／Merge Mansion 沒有取得足以確認其命中座標或 60/120fps 曲線的原始碼／影片（第 2 輪補證見下）。本次採使用者允許的開源 merge 原始碼替代研究，**不宣稱複製兩款商用遊戲的參數**，也沒有把低幀率片當曲線來源。

錄影可支持「連續跟手」的觀察，沒有可可靠識別的合成、生成 impulse，因此下表彈簧外觀是本次調校，不是測得的商用數值。

| 動作 | 時長／延遲 ms | 曲線／參數 | overshoot | 來源與選擇理由 |
|---|---|---|---|---|
| 拿起 | 超過 8 CSS px 後下一 rAF；觸覺在 down | 位移無緩動，scale 1.2 | 20% 浮起尺寸 | 調校；原錄影 8–43 幀跟手；門檻沿用 |
| 拖曳跟手 | 下一畫面、0 人工延遲 | clientX/Y 1:1，手指上方 32 CSS px；不乘 DPR | 固定 scale 1.2 | 開源 Input.mousePosition 命中，32px 是本次遮擋折衷；高亮和 drop 同手指點 |
| 吸附／兩物合攏 | 100／0 | cubic-bezier(.4,0,1,1)，兩快照往目的格縮至 .65 | 無 | 本次調校；狀態同步提交，只有視覺等待 |
| 合成 | 320／吸附後 100 | 線性 keyframes：0=.55，40%=1.22，70%=.95，100%=1 | 22% | 本次彈簧外觀調校（非物理 stiffness/damping） |
| 生成彈出 | 280／落格後 260 | 線性 keyframes .72→1.16@42%→.96@72%→1 | 16% | 本次調校 |
| 拋物線落格 | 260／0 | x 線性、y 線性減 36×4t(1−t)，21 keyframes；scale .55→1 | 高點 36px | 本次調校；飛的是新物品，不是產生器快照 |
| 交單飛走 | 360／0 | p=1−(1−t)²；弧高 40×4t(1−t)，scale 1→.35，opacity 1→.2 | 無 | 本次調校；交單立即提交，防重複領取 |
| 粒子 | 400／合成顯示時 | 8 粒，半徑32→42px，y 終點+10px，opacity 1→0 | scale .3→1→.1 | 本次調校；只 transform/opacity |

fixed ghost 的 left/top/width/height 僅建立時定位，動畫逐幀只 transform/opacity；不再用 left/top transition。prefers-reduced-motion 使用 80ms opacity，略過吸附位移與粒子。32px 是預期的視覺偏移，誤差表量「圖示中心相對手指−32px」，不把它藏在零誤差裡。safe-area 已含於 DOM rect；client 座標與 elementFromPoint 同坐標系，不另加 scroll、visualViewport.offset 或 DPR。

## 第 2 輪：實際取得 60fps 商用遊戲參考
來源：[Merge Mansion 4K 60FPS First Look](https://www.youtube.com/watch?v=pLBNXe7lqYM)。用既有外接碟 yt-dlp，選 `bestvideo[fps>=60]`，先試 00:30–00:40（是劇情），再試 05:00–05:10（棋盤）。1080p 限制那次因 challenge／格式不可用而失敗，取消高度限制後取得 format 315。下載紀錄 `reference-download-r2.txt`（1080p 失敗）、`reference-download-play-r2.txt`（棋盤段成功）；首段成功由 probe 與抽幀圖存證；簽名 CDN 暫存網址已去除。

兩段 ffprobe：r_frame_rate=60/1、avg_frame_rate=60/1。首段 880 幀，16ms×292、17ms×587；棋盤段 664 幀，16ms×220、17ms×443。這是 WebM 毫秒時間戳的 60fps 量化，沒有較長跳幀，並非使用者影片那種 25ms VFR。切片 stream copy 會保留前置關鍵幀，所以實際解碼長於指定 10 秒；以 `merge-play-probe.json` 時間戳和抽幀的 1-based 檔名為準，不把片段第 1 幀誤認成精準 05:00。

抽幀重現：`sh review/feel-polish/extract-native-frames.sh <影片> /Volumes/外接資料碟/ai-lab/fantaco-feel-ref/<輸出>`。逐格 `-fps_mode passthrough`；只有空間縮為 540px 寬，沒有改幀率或補幀。原始使用者片也可用同一指令重現。

拆解：`merge-play-contact.jpg` 是全段定位；`merge-play-detail.jpg` 是第 35–92 幀局部。已逐格讀第 60–100 幀，金色產生器提示圖案做 HSV 色區量測，`merge-play-curve.csv` 保留每幀位置與面積平方根縮放代理。第 65 幀相對末 5 幀平均約 1.113、第 85 幀 1.039、第 95 幀 1.002，65→95 約 500ms 回到常態。這是**提示圖案的脈動**，混有 TAP 字樣／閃光，不能當成新物品落格或合成的精確縮放。可支持「短促放大後回復」的方向，但不能從這段推導拋物線／吸附參數。故上表 16%／22% 與各時長仍誠實標「本次調校」，本輪沒有把提示脈動硬套成合成曲線。未取得 120fps；Travel Town 未拆解。
