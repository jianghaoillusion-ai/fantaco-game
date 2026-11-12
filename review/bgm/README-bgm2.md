# 可愛風 BGM 第一階段補充輪（bgm2）

只改 `review/bgm/`；未接入遊戲，未修改 `js/audio.js`、`assets/`。PR #6 維持 draft。三首皆為免費 Python/numpy/ffmpeg 原創程序合成，無外部取樣、既有旋律、即夢、付費 API 或 AI 浮水印。沒有進行全球曲庫比對。

## 這次修正

前輪最後一次小頌獨立審查為 **FAIL**，不是較早那份 PASS：B 的 3ms 首尾收放切斷殘響，C 的最後 122ms 近乎無聲。本輪移除首尾收放，鐵琴自然衰減至少 2.8 秒、撥弦至少 1.6 秒，增加 12 個循環殘響反射，三首各寫自己的最後一小節。全部音尾與殘響以取模／循環位移折回開頭，沒有淡出、空拍、插入零值或刪除音尾。

為降低有損編碼接點的風險，整首立體聲循環共同移動檔案起點到第一拍前 0–10ms 內的低振幅處（取兩端、兩聲道振幅平方總和最小值），所有樣本完整保留，並非把接點壓成零。檔案起點相對原樂譜：A −342 樣本（−7.125ms）、B −445（−9.2708ms）、C −114（−2.375ms）。所以檔案 0 秒不強稱為第一拍起音；小節格線也跟著移動，整圈仍是完整 24 小節／96 拍。驗證曲內小節線已扣除此位移。尾段屬和弦自然回到主和弦，A 鐵琴尾音、B 最後弱拍撥弦與 C 延長口哨都跨過接點。

## 三首最終檔案

48 kHz、雙聲道、4/4、24 小節；MP3 提高為 320 kbps，OGG Vorbis quality 5。母帶固定增益約 −16 LUFS，沒有動態正規化造成每圈不同。

| 樣本／檔名（各有 mp3、ogg） | 風格／調性 | BPM | 樣本數 | 長度秒 | MP3／OGG LUFS | MP3／OGG dBTP |
|---|---|---:|---:|---:|---:|---:|
| cute-a-glock-bubbles | 鐵琴泡泡音樂盒；C 大調 | 120 | 2304000 | 48.0000000 | -16.0／-15.95 | -4.31／-4.43 |
| cute-b-uke-hop | 烏克麗麗搖擺跳跳；F 大調 | 112 | 2468571 | 51.4285625 | -16.0／-15.97 | -3.6／-3.65 |
| cute-c-whistle-parade | 口哨氣球小遊行；G 大調 | 128 | 2160000 | 45.0000000 | -16.01／-15.96 | -7.76／-7.76 |

A 為無鼓鐵琴＋柔木琴琶音；B 為反拍刷弦＋分解和弦低音＋輕沙鈴；C 為口哨＋短風琴＋木琴＋輕小鼓。仍保留各自 A／B／A 變奏，沒有改成三首同伴奏。B 的樣本數因 112 BPM 取最近整數，誤差 −0.4286 樣本（約 −8.93 微秒），不補靜音。

[鐵琴 MP3](cute-a-glock-bubbles.mp3)／[OGG](cute-a-glock-bubbles.ogg)；[烏克麗麗 MP3](cute-b-uke-hop.mp3)／[OGG](cute-b-uke-hop.ogg)；[口哨 MP3](cute-c-whistle-parade.mp3)／[OGG](cute-c-whistle-parade.ogg)。三首各自的 repo raw 路徑為 `review/bgm/<上表檔名>.mp3` 及 `.ogg`；固定 commit 的 GitHub raw URL 見本輪最終報告。中間 WAV 不保留，可由合成程式重建。

## 循環接點數字

下表由最終檔重新解碼量得。末 100ms 必須高於 −35 dBFS；接點 ±6ms 中的 2ms 能量凹洞不應超過曲內小節線最大值（容許 1dB）；50ms 窗低於 −40dBFS 比例上限 0.5%；二階差分上限為曲內小節線最大值，不加容許倍數或額外餘量。這些是波形檢查，不冒稱已耳聽。

| 檔案 | 尾100ms dBFS | 接點樣本差 | 接點凹洞／曲內最大 dB | 近無聲50ms窗 % | 接點二階差／曲內最大 |
|---|---:|---:|---:|---:|---:|
| cute-a-glock-bubbles.mp3 | -18.83 | 0.009980 | 1.25／10.56 | 0.104 | 0.00776／0.02790 |
| cute-a-glock-bubbles.ogg | -18.78 | 0.017293 | 1.30／10.77 | 0.104 | 0.00905／0.02586 |
| cute-b-uke-hop.mp3 | -18.25 | 0.000664 | 4.47／8.79 | 0.000 | 0.00835／0.02286 |
| cute-b-uke-hop.ogg | -18.22 | 0.009743 | 4.55／8.63 | 0.000 | 0.01102／0.02222 |
| cute-c-whistle-parade.mp3 | -18.15 | 0.018632 | 0.23／4.74 | 0.000 | 0.00700／0.00743 |
| cute-c-whistle-parade.ogg | -18.11 | 0.023804 | 0.58／4.50 | 0.000 | 0.00617／0.00731 |

六檔解碼長度都等於母帶，削波 0，true peak 均低於 −1 dBTP。以 10ms 窗、1ms 步進回查最後 400ms，六檔尾端連續低於 −40dBFS 皆為 0ms。A 仍有 0.104% 的安靜窗（約一窗 50ms），不在循環尾端；B/C 為 0%。新驗證先在舊檔重現失敗，再用新版通過；[舊檔基線](loop-baseline.json)、[新接點量測](loop-validation.json)、[響度與峰值](validation.json)。既有 `r2-*`、`r2-listening-*` 與 `xiaosong/` 是前輪證據，不適用本輪音檔，不要拿舊 PASS 或舊圖當本輪結論。

## 最終整合方案與獨立試聽

開 [loop-test.html](loop-test.html)，三首各一個按鈕，可選 MP3／OGG、停止。透過 HTTP 開啟（不能直接 file://）：在此 worktree 執行 `python3 -m http.server 8936 --bind 127.0.0.1 --directory review/bgm`，開 `http://127.0.0.1:8936/loop-test.html`。若埠被占用換一個；用完結束自己啟動的伺服器。

最終遊戲方案：第一次使用者點擊時建立／resume AudioContext，fetch 完整曲目、decodeAudioData 並快取 AudioBuffer；用 **AudioBufferSourceNode.loop=true、loopStart=0、loopEnd=已核對的母帶長度**。每圈由音訊引擎循環，不靠 ended 事件或 JS 計時器重開、不用 `<audio loop>`。buffer source 只能 start 一次；暫停須記錄播放偏移，恢復新 source 從偏移接續；同曲不重啟。換曲先解碼好，再以 GainNode 短交叉淡化，循環內不淡入淡出。sting 應獨立管理且只有一支，播放時壓低／暫停 BGM，結束或取消皆恢復既有位置；設定靜音不丟播放進度。正式實作留到完整 6 首以上階段，並完成每關獨曲。

MP3 有編碼延遲及 frame 尾端補零，必須保留 Xing/LAME gapless 資訊並確認解碼器有處理；不能只看到檔案 duration 或副檔名就認定無縫。這批檔在 ffmpeg 與本機 Chromium 的 MP3 解碼長度正確。若其他瀏覽器多出前置延遲，單獨設 loopEnd 不會修正開頭；必須核對 offset 再設 loopStart/end，或改採核對過的 PCM WAV／OGG，不能盲目剪掉所有安靜音符。

OGG Vorbis 依 granule position 表示有效尾長，理論上可精準裁掉最後區塊多出的樣本；但本機 Chromium 148 的 decodeAudioData 實測仍多出尾塊：48kHz A/B/C 各 320／997／960 樣本（第 2 輪更正，原 192／997／704 是錯誤舊值）。已比對三首有效全長、左右兩聲道，與 ffmpeg 的 PCM SHA-256 全部相同；最後 OGG 頁的 granule position 也分別等於母帶樣本數 2304000／2468571／2160000，確認有效訊號未前移或後移，多出的僅是解碼尾塊；因此本頁只用母帶樣本數換算 loopEnd 排除尾塊，不改檔也不破壞殘響。OGG 允許不超過 2048 個 48kHz 樣本的尾塊；MP3 只允許重採樣 ±2 樣本。超出就顯示錯誤，請改格式，不偷偷播放錯誤長度。此規則只針對這三檔，正式整合要逐曲驗證。

本機 Chromium 148：三首 × 兩格式 × 48k/44.1k 共 12 組，OfflineAudioContext 渲染兩圈，與指定範圍直接串接的最大誤差 ≤2.91e-11；沒有引擎新增的空白。44.1k MP3 B/C 少一樣本（重採樣），本頁以實際可用長度為準。另直接量測 44.1k 解碼訊號的接點凹洞與尾端能量（不是只拿 buffer 和自己比），六組全通過。前端已測六種選擇、無自動播放、同首重按不重啟、載入中按停止不晚到開播、404 顯示錯誤、載入中切回原曲恢復狀態、失敗後原曲能換格式、pagehide 關閉 context 後可點擊重建，無 pageerror。pagehide 測試是事件模擬，真實 bfcache／手機返回仍待驗。切換曲目／格式是使用者要求，從頭播放；新曲解碼好前舊曲繼續，約 25ms 淡化只用於手動換曲與停止，不是每圈接點處理。快速點選用序號取消過期結果。[瀏覽器測試數據](browser-validation.json)。尚未做 Safari/iPhone 實機及耳聽，不推論所有瀏覽器皆已驗收。

44.1kHz 解碼後接點（兩聲道能量，凹洞上限仍以該取樣率曲內小節線為準）：

| 檔案 | 接點凹洞／曲內最大 dB | 尾100ms dBFS | 接點樣本差 |
|---|---:|---:|---:|
| cute-a-glock-bubbles.mp3 | 1.27／10.58 | -18.83 | 0.010960 |
| cute-a-glock-bubbles.ogg | 1.31／10.78 | -18.78 | 0.017799 |
| cute-b-uke-hop.mp3 | 4.40／8.81 | -18.25 | 0.002337 |
| cute-b-uke-hop.ogg | 4.65／8.65 | -18.22 | 0.009065 |
| cute-c-whistle-parade.mp3 | 0.20／4.61 | -18.15 | 0.040180 |
| cute-c-whistle-parade.ogg | 0.56／4.40 | -18.11 | 0.024975 |

參考：[Web Audio loop 規格](https://www.w3.org/TR/webaudio/#looping)、[Vorbis 封裝與 granule position](https://xiph.org/vorbis/doc/Vorbis_I_spec.html)。

## 現有遊戲播放盤點（只讀，不修）

以下依本 worktree 原始碼追查，並非遊戲實機重現。範圍為 `js/*.js` 與 `index.html`；無可用 codebase-memory MCP，改逐項搜尋所有呼叫再讀函式。

| 操作／位置（檔案、函式、行號） | 現象與影響 |
|---|---|
| `js/audio.js:61` playMusic，65–77 | 同檔且正在播直接返回；不同場景若共用檔不重開。不同檔或目前 paused 則先 stopMusic，再 new Audio、play；沒有預先解碼／交叉淡化，換曲可能有載入空檔且從頭播。BGM 只有一個引用，一般換曲不疊兩首。74 行 HTMLAudio loop 未保證本機及手機無縫，未做當前遊戲耳聽。 |
| `js/audio.js:80` stopMusic | pause 後清 src、丟掉物件和 id，位置消失；之後一定從頭載入。沒有淡出可能硬切。 |
| `js/audio.js:89` pauseMusic；93 resumeMusic；`js/ads.js:127` openAd／142；76 closeAd／80 | 看廣告會暫停、關閉通常從原位置 resume。若暫停期間有人呼叫 playMusic，即使同曲也因 paused 跳過保留判斷，從頭重建；若播放器被 settings 清掉，resumeMusic 用 lastMusicId 重開。此 worktree 找不到獨立的一般暫停按鈕呼叫。 |
| `js/settings-ui.js:47` open、51 close；`js/audio.js:49` setAudioSettings | 只打開／關閉設定不影響播放。音量大於零時只改 volume；音樂關閉或音量到 0 會 stopMusic，重新開啟從頭。連 SFX 設定也經 apply→setAudioSettings；若 BGM 不存在但音樂開著，54 行會重開。 |
| `js/settings-ui.js:18` apply／21、27–29 | 修改設定後額外按目前 play/title 選章節／village，可能覆蓋地區曲。音量到零再拉高也會重開，無原位置恢復。 |
| `js/app.js:110` show／116、124；bind／169 | 回 title 改 village，離開其他曲會硬切並從頭載入；village 正在播則延續。show(play) 一律按 SAVE.chapter 播。book、map、daily、lyrics、howto 沒換曲分支，原曲繼續。 |
| `js/map.js:171` enterRegion／177–179；`js/app.js:116` show | 先 region.music 再 show(play) 的 SAVE.chapter；lamplight、theater、plaza 等先選借用曲再被章節曲覆蓋，同一操作連切兩次，可能短暫空檔／重頭。 |
| `js/map.js:136` restoreBuilding／167 | 修建築按 region.music 或 chapter 播，若不同檔立即切；回 play 又走章節。這也是場景有時配錯／共用曲的原因。 |
| `js/story.js:47` startStory；488 nextStory／505；510 skipStory／516；`js/app.js:897、931` | 進故事只 show(story)，沒有停／降 BGM；音樂會延續。故事結束／跳過先 show(play) 再 done 回呼，可能先播目前章節再由回呼進別區。相同檔正在播時不重啟；不同章節會硬切。 |
| `js/app.js:181` 領取結果事件／184；tryFulfill 856／897–899；showClear 935／973、976 | 結算後重呼 playMusic；同檔仍播時保留，章節變更就重新開始。結算音效 sfx.level 與 BGM 疊加是現有行為；此 worktree 的結果流程沒有呼叫 playClearTheme。 |
| `js/audio.js:99` playClearTheme／101–119 | 函式先 stopMusic，再新建 sting Audio，沒有自動恢復 BGM。反覆呼叫只 remove 舊 DOM、沒有明確 pause／清 src；BGM 的 playMusic/stopMusic 也不管 sting，若未來接入可能疊播。播放失敗兩次會吞錯再等最多 30 秒；關音樂只 pause sting，不觸發 ended，Promise 可能等到 timeout。**目前全 js 與 HTML 無此函式的呼叫／匯入，不能把這個潛在風險說成已發生。** feixiang-sting／sting-clear 檔案未動。 |
| `js/audio.js:15` unlockAudio／18；playMusic／76；`js/app.js:152` pointerdown | unlock 只 resume Web Audio context，不重試之前失敗的 HTMLAudio.play。play 的失敗被吞掉，所以初始自動播放被拒可能保持無聲，直到下一次 playMusic；不回報原因。js 範圍無 visibilitychange 音樂恢復處理，背景／鎖屏恢復要實機補驗。 |

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

## 重跑驗證與未完成

合成：`PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/bgm/compose_cute.py`；驗證：同一個 Python 跑 `review/bgm/verify_loop.py`。TMPDIR 必須是外接碟已掛載的目錄，合成程式會檢查；中間 WAV 自動清理。瀏覽器測試先開上述本機 server，source `/Volumes/外接資料碟/tools/skills/guizang-env.sh`，設定 NODE_PATH 為既有 guizang skill 的 node_modules 後跑 `node review/bgm/test-loop-browser.cjs`，不安裝新套件。程式只合成或量測本資料夾音檔，不讀其他 worktree。

最終版每一關都要自己的曲子；完整 6 首以上階段仍須依上表處理 14 個現行場景，不能六首共用就算完成。正式遊戲播放器、Safari/iPhone 實機與人工耳聽、全部關卡專屬作曲、本輪的全球曲庫查重皆未做。這輪只提交指定分支及 draft PR，不 merge、不推 main、不部署；不另建 repo/tag/Drive 備份。既有前輪文件保留作歷史，最終以本 README、loop-validation.json、browser-validation.json 與 bgm2 報告為準。

音色提醒：本輪自然音尾與多個回音比前輪更明顯；可愛程度、回音是否偏濕、口哨是否刺耳，仍需我的王用耳朵決定。
