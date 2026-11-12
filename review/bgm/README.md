# 可愛風 BGM 試聽樣本（第一階段）

只新增本資料夾。沒有改 js/audio.js，也沒有替換 assets/；feixiang-sting、sting-clear 完全未碰。三首都是待挑選的風格樣本，尚未接入遊戲。

## 試聽與量測

直接點音檔即可下載試聽。三首皆為 4/4、24 小節、48 kHz 雙聲道；MP3 192 kbps，OGG Vorbis quality 5。數值量的是交付編碼檔，不是僅量 WAV。

| 樣本／風格 | 樂器主色 | 調性 | BPM | 長度（秒） | MP3 LUFS／dBTP | OGG LUFS／dBTP |
|---|---|---|---:|---:|---:|---:|
| A 鐵琴泡泡 | 鐵琴主旋律、柔木琴和弦、圓潤撥弦低音、沙鈴 | C 大調 | 120 | 48.000000 | -16.26／-5.78 | -15.94／-5.43 |
| B 烏克麗麗跳跳 | 合成烏克麗麗分解與刷弦、木琴短句、輕木塊、撥弦低音 | F 大調 | 112 | 51.428562 | -16.26／-6.01 | -15.96／-5.67 |
| C 口哨氣球遊行 | 合成口哨主旋律、木琴應答、短風琴和弦、輕鼓與沙鈴 | G 大調 | 128 | 45.000000 | -16.26／-3.99 | -15.95／-3.68 |

- 鐵琴泡泡：[MP3](cute-a-glock-bubbles.mp3)／[OGG](cute-a-glock-bubbles.ogg)。repo 路徑：`review/bgm/cute-a-glock-bubbles.mp3`、`review/bgm/cute-a-glock-bubbles.ogg`。
- 烏克麗麗跳跳：[MP3](cute-b-uke-hop.mp3)／[OGG](cute-b-uke-hop.ogg)。repo 路徑：`review/bgm/cute-b-uke-hop.mp3`、`review/bgm/cute-b-uke-hop.ogg`。
- 口哨氣球遊行：[MP3](cute-c-whistle-parade.mp3)／[OGG](cute-c-whistle-parade.ogg)。repo 路徑：`review/bgm/cute-c-whistle-parade.mp3`、`review/bgm/cute-c-whistle-parade.ogg`。

## 原創與重現

旋律音符、節奏、和弦排列由小夏本次自行編寫，未引用既有歌曲；所有聲音以正弦疊加、衰減包絡與固定亂數種子的噪音合成，沒有外部錄音、取樣包、soundfont、模型或音樂素材。樂器名稱表示合成音色方向，不是真實樂器錄音。未用即夢、付費 API，也未加浮水印、語音或註記音。未做全球曲庫相似度比對，不能宣稱排除一切偶然相似。

A：C–F–C–G–F–C–Dm–G；B：F–C–Bb–F–Gm–Bb–C–F；C：G–Am–D–G–C–Am–D–D。每組八小節，三段各有留白與應答變化；A/C 以屬和弦回主和弦，B 回到主和弦延續第一小節。

依賴僅 Python 3、numpy、ffmpeg／ffprobe（libmp3lame、libvorbis）。沒有安裝任何新套件。執行方式：

```sh
export TMPDIR="/Volumes/外接資料碟/AI工作/暫存/bgm-cute"
mkdir -p "$TMPDIR"
export PYTHONDONTWRITEBYTECODE=1
~/media-tools/venv/bin/python review/bgm/compose_cute.py
```

也可以用有 numpy 的 Python；FFMPEG／FFPROBE 環境變數可指定工具。程式只寫本資料夾的六個音檔與 validation.json，TemporaryDirectory 於完成或失敗時清除本次中間 WAV。不同編碼器版本可能產生不同壓縮位元組與微小量測差異。

## 循環與手機音量檢查

循環範圍從第 0 個樣本到檔尾（終點不含）。A：0–48 秒；B：0–51.4285625 秒；C：0–45 秒。每首完整 96 拍；B 因 48 kHz 樣本格取整，比數學拍長短約 0.000009 秒。音尾與短殘響以 modulo 折回開頭；100 Hz 週期高通（約 −3 dB）與柔和低通也在週期域處理，無檔尾淡出、無額外停頓。

固定增益校正至 WAV 約 −16 LUFS，保留自然動態；交付六檔皆在 −16±1 LUFS、true peak ≤ −1 dBTP。ffprobe 與實際解碼均核對長度，MP3 的 gapless 資訊在 ffmpeg 解碼下正確，六檔解碼樣本數均與母帶完全相同。

| 檔案 | 解碼樣本數 | 接點樣本差（滿刻度=1） | 全曲相鄰樣本差 P99 | 尾／頭 100ms RMS | 能量差 dB | 削波樣本 |
|---|---:|---:|---:|---:|---:|---:|
| cute-a-glock-bubbles.mp3 | 2304000 | 0.004078 | 0.030278 | 0.05238／0.17289 | 10.37 | 0 |
| cute-a-glock-bubbles.ogg | 2304000 | 0.000490 | 0.031373 | 0.05451／0.17909 | 10.33 | 0 |
| cute-b-uke-hop.mp3 | 2468571 | 0.011683 | 0.067234 | 0.08087／0.19466 | 7.63 | 0 |
| cute-b-uke-hop.ogg | 2468571 | 0.012598 | 0.069505 | 0.08360／0.20151 | 7.64 | 0 |
| cute-c-whistle-parade.mp3 | 2160000 | 0.011181 | 0.043367 | 0.04558／0.21517 | 13.48 | 0 |
| cute-c-whistle-parade.ogg | 2160000 | 0.014161 | 0.044963 | 0.04757／0.22312 | 13.42 | 0 |

將尾 100ms 與頭 100ms 真正拼接後量測接點；接點樣本差均小於 0.04 且小於全曲一般變化 P99，前後皆非靜音。能量差約 7.6–13.5 dB 是尾端弱拍到開頭強拍起音的 100ms 視窗差，不是瞬間波形跳變；不以「RMS 完全相等」當作音樂循環條件。另以 ebur128=peak=true 獨立交叉量測，LUFS／true peak 與 loudnorm 相差小於 0.1 dB。完整母帶／交付檔數字見 [validation.json](validation.json)。

目前完成檔案層級檢查；未在實體手機喇叭、Safari／Chrome 的 HTMLAudioElement 循環實聽。是否夠可愛、音色是否喜歡仍由我的王試聽；不把數值合格說成已通過耳聽驗收。第二階段接入時仍需驗證播放器循環。

## 全部關卡／章節盤點

盤點基準：origin/main `22a7d6d5c5b8c832add6daec2e09e6f54d321434`。讀取 js/audio.js、js/app.js、js/map.js、js/merge.js，以及它們的資料來源 data/chapters.json、data/map.json、data/stages/。本次環境沒有可用的 codebase-memory MCP 工具，改以來源檔全文與 rg 查核。

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

## 尚待完成

我的王挑選方向、實體手機與瀏覽器循環實聽、各關專屬作曲與遊戲整合均屬後續階段。這次沒有發布遊戲、merge 或推 main。
