# 可愛風 BGM 試聽樣本（第一階段，第 2 輪）

只改 review/bgm/，未修改 js/audio.js 或 assets/，feixiang-sting、sting-clear 未碰。尚未接入遊戲。

## 回應小頌第 1 輪審查

1. 三首伴奏已分開：A 是無鼓的鐵琴音樂盒，只用木琴琶音伴奏；B 是搖擺反拍刷弦、四拍分解和弦低音與沙鈴；C 是口哨、小鼓進行曲、短風琴與木琴應答。沒有三首共用的低音／打擊骨架。A 的琶音和 C 的低音／應答共用 wood 合成音色，但節奏、音域與寫法不同。
2. 三首旋律全部重寫，加入長音、休止與問答。每首 24 小節為 A（1–8）、B（9–16）、A 變奏（17–24）；B 段使用不同旋律、節奏和和弦，不再把八小節原樣重複三次。三首各有 7／8／7 種小節節奏。
3. A、B 的共用九音片段已移除；新曲兩兩比較，最長相同音階音符／音程走向只有 4–5 音。原審查提醒的 A 兩段旋律也已移除。這是三首之間的檢查，不代表全球曲庫比對。
4. 樂器表依實際程式更新；名稱是合成音色方向。鐵琴增加高泛音、B 主奏降到 F4 起的撥弦音域、口哨加入輕氣聲與起音滑音。
5. 保留固定增益、100 Hz 週期高通與音尾折回處理，六檔重新量測。另補上首頁與 village 共用的盤點提醒。

## 試聽與量測

48 kHz 雙聲道、4/4、24 小節；MP3 192 kbps、OGG Vorbis quality 5。數字量測自最終編碼檔。

| 樣本 | 樂器 | 調性 | BPM | 秒數 | MP3 LUFS／dBTP | OGG LUFS／dBTP |
|---|---|---|---:|---:|---:|---:|
| 鐵琴泡泡音樂盒 | 合成鐵琴、柔木琴琶音；無鼓、無沙鈴、無獨立低音 | C 大調 | 120 | 48.000000 | -16.26／-5.13 | -15.94／-4.95 |
| 烏克麗麗搖擺跳跳 | 合成撥弦主奏、反拍刷弦、分解和弦撥弦低音、輕沙鈴；無木塊與鼓 | F 大調 | 112 | 51.428562 | -16.27／-4.67 | -15.95／-4.49 |
| 口哨氣球小遊行 | 帶氣聲滑音的合成口哨、短風琴、木琴應答、輕小鼓與木質短低音；無沙鈴 | G 大調 | 128 | 45.000000 | -16.26／-9.06 | -15.94／-8.68 |

鐵琴泡泡音樂盒：[MP3](cute-a-glock-bubbles.mp3)／[OGG](cute-a-glock-bubbles.ogg)。repo 相對路徑：`review/bgm/cute-a-glock-bubbles.mp3`、`review/bgm/cute-a-glock-bubbles.ogg`。

烏克麗麗搖擺跳跳：[MP3](cute-b-uke-hop.mp3)／[OGG](cute-b-uke-hop.ogg)。repo 相對路徑：`review/bgm/cute-b-uke-hop.mp3`、`review/bgm/cute-b-uke-hop.ogg`。

口哨氣球小遊行：[MP3](cute-c-whistle-parade.mp3)／[OGG](cute-c-whistle-parade.ogg)。repo 相對路徑：`review/bgm/cute-c-whistle-parade.mp3`、`review/bgm/cute-c-whistle-parade.ogg`。

## 原創與重現

音符、節奏、和弦排列由小夏自行編寫，未參考或模仿既有歌曲。聲音完全以 Python/numpy 正弦、泛音、衰減包絡及固定種子噪音產生，沒有外部音檔、取樣、soundfont 或模型參與作曲，沒有浮水印、語音或 AI 註記。只用免費本機工具，未用即夢或付費 API。沒有全球曲庫比對，不能保證排除所有巧合。

A 段／B 段和弦：A 樣本 C–Am–F–G–Dm–F–G–G／F–C–Dm–Am–F–Dm–G–G；B 樣本 F–F–Bb–Gm–C–Bb–Gm–C／Dm–Gm–Bb–C–F–Dm–Gm–C；C 樣本 G–C–Am–D–G–Em–Am–D／C–Am–G–Em–Am–C–D–D。最後八小節是首段變奏，最後以屬和弦接回主和弦。

合成只需 Python 3、numpy、ffmpeg／ffprobe；驗證圖另用本機既有 matplotlib，沒有安裝新套件。

```sh
export TMPDIR="/Volumes/外接資料碟/AI工作/暫存/bgm-cute"
mkdir -p "$TMPDIR"
export PYTHONDONTWRITEBYTECODE=1
export MPLCONFIGDIR="$TMPDIR/mpl"
~/media-tools/venv/bin/python review/bgm/compose_cute.py
~/media-tools/venv/bin/python review/bgm/verify_cute.py
```

旋律表是音符池；每小節節奏決定實際音數，多出的音符截去、不足時從池頭循環。驗證與圖均取 bar_events() 的實際播放音符。

合成程式只覆寫本資料夾六音檔與 validation.json。TemporaryDirectory 自動清掉中間 WAV；圖形快取在 TMPDIR，驗證完可刪。不同編碼器版本可能導致微小差異。

## 循環與驗證

循環從 0 到檔尾（不含終點）：A 48 秒、B 51.4285625 秒、C 45 秒。完整 96 拍，B 取整誤差不到一個樣本。音尾與殘響折回開頭，高通與低通使用週期頻域處理；沒有淡出或附加空拍。固定增益校到母帶 −16 LUFS，編碼後再用 loudnorm、ebur128 量測。

| 檔案 | 解碼樣本 | 接點樣本差 | 相鄰樣本差 P99 | 尾／頭 100ms RMS | 能量差 dB | 削波 |
|---|---:|---:|---:|---:|---:|---:|
| cute-a-glock-bubbles.mp3 | 2304000 | 0.004319 | 0.049253 | 0.05504／0.17744 | 10.17 | 0 |
| cute-a-glock-bubbles.ogg | 2304000 | 0.003296 | 0.050980 | 0.05727／0.18410 | 10.14 | 0 |
| cute-b-uke-hop.mp3 | 2468571 | 0.000685 | 0.043449 | 0.09211／0.22024 | 7.57 | 0 |
| cute-b-uke-hop.ogg | 2468571 | 0.003844 | 0.044889 | 0.09529／0.22823 | 7.59 | 0 |
| cute-c-whistle-parade.mp3 | 2160000 | 0.000851 | 0.055158 | 0.00670／0.12149 | 25.16 | 0 |
| cute-c-whistle-parade.ogg | 2160000 | 0.001507 | 0.057151 | 0.00695／0.12625 | 25.19 | 0 |

loudnorm 與 ebur128 均符合響度／峰值標準；兩者最大響度差 0.14 LU、峰值差 0.05 dB。六檔 ffprobe／解碼長度核對通過、無削波、LUFS 在 −16±1 內、true peak ≤ −1 dBTP。100 Hz 以下能量皆小於 0.001%。接點樣本差均低於 0.006；能量差代表弱拍尾音接第一拍，C 尾端留白較多，100ms 能量差約 25 dB，並非瞬間樣本跳變。B 的 MP3 初次補查有編碼瞬變，已對母帶首尾各 3ms 加半餘弦平滑，不增減任何樣本；這是極短接點處理，不是歌曲淡出。重測二階差分最大值由 0.04508 降為 0.00555，低於曲內小節線最大 0.02051。壓縮檔接點仍需耳聽確認。

[旋律與段落比較圖](r2-melody-sections.png)、[六檔接點放大圖](r2-seams.png)、[完整音訊量測](validation.json)、[節奏／音程／低頻驗證](r2-structure-check.json)。xiaosong/ 內是第一輪舊音檔的審查證據，不能當成新版量測。

mp3 依賴播放器正確讀取 gapless 資訊；ffmpeg 解碼樣本數與母帶一致。HTMLAudioElement loop，尤其 iPhone Safari，仍需第二階段實機驗證。沒有聲稱已用耳朵聽過；可愛程度與音色喜好由我的王試聽。

## 第 2 輪互審補查

小頌判定原第 1 輪 FAIL 已解決（PASS），本輪為程式、圖及數據核對，沒有獨立重測音檔或耳聽。後續要求的文字與量測已補齊：分解和弦低音、木質短低音、實際音符產生規則、23 條曲內小節線比較、5 kHz 以上能量。B 追加接點平滑後的數字如下；小頌 PASS 是追加平滑前的版本，最新修正由小夏重測，未冒稱再次獨立互審。

| 檔案 | 接點二階差分最大值 | 曲內小節線中位／最大值 | 8→9／16→17 小節能量差 dB | 5kHz 以上能量 % |
|---|---:|---:|---:|---:|
| cute-a-glock-bubbles.mp3 | 0.020665 | 0.010797／0.028637 | 4.47／8.89 | 0.1089 |
| cute-a-glock-bubbles.ogg | 0.007428 | 0.010451／0.029964 | 4.44／8.90 | 0.1080 |
| cute-b-uke-hop.mp3 | 0.005548 | 0.011547／0.020512 | 5.05／38.42 | 0.0309 |
| cute-b-uke-hop.ogg | 0.005217 | 0.011920／0.020505 | 5.08／38.39 | 0.0298 |
| cute-c-whistle-parade.mp3 | 0.003206 | 0.000635／0.002554 | 26.05／25.64 | 0.0269 |
| cute-c-whistle-parade.ogg | 0.000934 | 0.000731／0.002517 | 26.11／25.68 | 0.0255 |

C 的接點能量差約 25 dB，曲內兩次換段約 26／25.6 dB，屬相同程度的換氣留白；MP3 接點二階差分 0.00321 稍高於曲內最大 0.00255，但絕對值低，OGG 無此增加。C 變奏最高 G7（約 3.1 kHz），試聽時須確認是否刺耳。

本機 MOSS 僅做補充描述，沒有參與作曲。A 到輸出上限未產生描述；B（接點平滑前，編曲相同）辨識為撥弦、童趣；C 辨識為口哨、小鼓、歡樂。B／C 描述均被 token 上限截斷；模型猜錯速度與調性，C 的段落描述也與實際音符結構不符，不採作事實或驗收證據。原始紀錄留在 r2-listening-a／b／c，聽感仍待我的王驗收。模型三次皆正常結束並確認無殘留程序。

## 全部關卡／章節盤點

盤點基準：origin/main `22a7d6d5c5b8c832add6daec2e09e6f54d321434`。讀取 js/audio.js、js/app.js、js/map.js、js/merge.js，以及它們的資料來源 data/chapters.json、data/map.json、data/stages/。本輪保留第一輪已交叉核對的盤點，並再次核對 MUSIC_FILES 與章節／地圖資料未變動。

**數量定義：6 個主線章節、9 個地圖地區，village 重疊，合計 14 個不同場景 id；MUSIC_FILES 也有這 14 個 key。** repo 另外保留 3 個 stages 關卡定義（下表另列），目前 js 與 HTML 找不到載入 stages/index.json 或 import battle.js 的入口，因此不能把它們加成 17 個正在運行的關卡。玩家 Lv. 是經驗等級，沒有獨立場景與曲目，不當作另一批音樂關卡。

主線呼叫 playMusic(SAVE.chapter)，直接由章節 id 對應 MUSIC_FILES。地圖 enterRegion 先設 save.chapter = region.chapter，再播 region.music，但隨後 show("play") 又在 js/app.js:116 播 SAVE.chapter，因此遊玩畫面最終以章節曲為準。restoreBuilding（js/map.js:167）則會在地圖修建築時播 region.music，直到下次切回遊玩或其他換曲操作。結算（js/app.js:184/899/973/976）與遊玩中設定開關（js/settings-ui.js:27）也走章節 id。data/chapters.json 中 bulu/hate/ending 的 music 分別是 journey/candy/village，但這些主線呼叫沒有讀該欄位。下表的實際曲目指進入遊玩後留下來的曲目；屬來源碼追查，非瀏覽器實測。

| id | 顯示名稱 | 定義 | MUSIC_FILES[id] | 目前實際曲目／路徑 | 是否共用 |
|---|---|---|---|---|---|
| village | 微笑村 | 章節＋地圖 | bgm-village | bgm-village（主線／地圖） | 是；對照與 castle 同曲 |
| journey | 神祕魔法袋 | 章節 | bgm-journey | bgm-journey（主線） | 是；對照與 slope、hill、bagvalley 同曲 |
| candy | 第一願：西卡 | 章節 | bgm-candy | bgm-candy（主線） | 是；對照與 candylane 同曲 |
| bulu | 第二願：布魯 | 章節 | bgm-bulu | bgm-bulu（主線） | 是；對照與 lamplight 同曲 |
| hate | 最後一願：哈特 | 章節 | bgm-hate | bgm-hate（主線） | 是；對照與 theater 同曲 |
| ending | 漫天氣球 | 章節 | bgm-ending | bgm-ending（主線） | 是；對照與 plaza 同曲 |
| castle | 微笑城堡 | 地圖 | bgm-village | bgm-village（進入遊玩後） | 是；對照與 village 同曲 |
| slope | 飛飛的出發坡 | 地圖 | bgm-journey | bgm-journey（進入遊玩後） | 是；對照與 journey、hill、bagvalley 同曲 |
| hill | 阿飄的探險丘 | 地圖 | bgm-journey | bgm-journey（進入遊玩後） | 是；對照與 journey、slope、bagvalley 同曲 |
| bagvalley | 魔法袋谷 | 地圖 | bgm-journey | bgm-journey（進入遊玩後） | 是；對照與 journey、slope、hill 同曲 |
| candylane | 西卡的糖果巷 | 地圖 | bgm-candy | bgm-candy（進入遊玩後） | 是；對照與 candy 同曲 |
| lamplight | 布魯的夜燈林 | 地圖 | bgm-bulu | bgm-bulu（進入遊玩後；地圖修建築時 bgm-journey） | 是；對照與 bulu 同曲；地圖修建築另借 journey |
| theater | 哈特的魔術劇場 | 地圖 | bgm-hate | bgm-hate（進入遊玩後；地圖修建築時 bgm-candy） | 是；對照與 hate 同曲；地圖修建築另借 candy |
| plaza | 漫天氣球廣場 | 地圖 | bgm-ending | bgm-ending（進入遊玩後；地圖修建築時 bgm-village） | 是；對照與 ending 同曲；地圖修建築另借 village |

上述曲名皆指 `assets/audio/<曲名>.mp3/.ogg`。依 MUSIC_FILES 分組：village/castle；journey/slope/hill/bagvalley；candy/candylane；bulu/lamplight；hate/theater；ending/plaza。9 個地區進入遊玩後使用 6 首：bgm-village（village、castle）、bgm-journey（slope、hill、bagvalley）、bgm-candy（candylane）、bgm-bulu（lamplight）、bgm-hate（theater）、bgm-ending（plaza）。地圖修建築時 region.music 只對應 village／journey／candy 三首，和遊玩畫面的路由不同。

| stages 定義 id | 顯示名稱 | theme | 目前曲目 | 是否共用 |
|---|---|---|---|---|
| 01-smile-contest | 微笑大賽（微笑村） | village | 無目前播放入口；若以 theme 對應則為 bgm-village | 定義無專屬音樂；不能認定目前在播放 |
| 02-magic-bag | 神祕魔法袋（山洞小路） | journey | 無目前播放入口；若以 theme 對應則為 bgm-journey | 定義無專屬音樂；不能認定目前在播放 |
| 03-sika | 第一願：西卡（糖果小路） | candy | 無目前播放入口；若以 theme 對應則為 bgm-candy | 定義無專屬音樂；不能認定目前在播放 |

**下一階段需求：14 個現行場景 id 各自擁有獨一無二曲目，包含八個擴充地區；需讓 show("play")、結算、設定開關與地圖修建築統一依正確場景選曲，避免 region.music 被章節曲覆蓋；不能只改 MUSIC_FILES。** 三個保留 stage 若重新啟用，也需確認是否成為新的獨立配樂單位。這次依指示只做 A/B/C 三首樣本，沒有提前做全關卡配樂或變更播放邏輯。

首頁標題畫面也固定播放 bgm-village（js/app.js:124、js/settings-ui.js:28），與微笑村共用；它不是第 15 關。第二階段需另決定首頁配樂。

## 尚待完成

我的王挑選方向、實體手機與瀏覽器循環實聽、各關專屬作曲與遊戲整合均屬後續階段。這次沒有發布遊戲、merge 或推 main。
