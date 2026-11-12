# 動作參數與可追溯依據

## 來源
- `game-rec.mp4`：1320×2868 HEVC，r_frame_rate **60/1**，avg_frame_rate **837/14 = 59.7857**；279 幀、4.66 秒；276 個 16.67ms 間隔、2 個 25ms 間隔，輕微 VFR。依原生時間戳逐格抽出，**沒有重取樣、補幀或插幀**。名目 60fps 來源，平均略低已明示。`reference-probe.json` 是完整 ffprobe 資料，`reference-curve.csv` 是第 8–43 幀青色藥水色區位置／面積平方根縮放代理量。代理量會受遮擋與色彩閾值影響，並非整張物品的精確邊界。
- 開源 [dev-lime/Unity_MergeGame / GameController.cs](https://github.com/dev-lime/Unity_MergeGame/blob/375bb00a0e07b5c945137b6e1350d96d1bd07d66/Assets/Scripts/GameField/GameController.cs)：Update 的 GetMouseButtonUp 呼叫 SendRayCast，使用 Input.mousePosition；放下依手指／游標，不依畫面上滯後的物品中心。OnItemSelected 以 `10 * deltaTime * distance` 的 MoveTowards 跟隨；合成直接換物品、沒有可引用的彈簧時間。這是原始碼參考，fps **不適用**，並非錄影。
- Travel Town／Merge Mansion 沒有取得足以確認其命中座標或 60/120fps 曲線的原始碼／影片。本次採使用者允許的開源 merge 原始碼替代研究，**不宣稱複製兩款商用遊戲的參數**，也沒有把低幀率片當曲線來源。

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
