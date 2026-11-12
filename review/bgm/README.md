# 14 場景專屬 BGM（bgm3）

A 鐵琴 → village，B 烏克麗麗 → journey，C 口哨 → candy。保留原樂譜、編曲與音色，再由同一程序重新編碼成手機檔；其餘 11 首另寫樂譜與各自伴奏。全部免費 Python/numpy/ffmpeg 程序合成，沒有外部取樣或套用既有旋律，沒有付費服務、即夢或浮水印；沒有進行全球曲庫比對。

覆寫原本 6 組 bgm 同名檔，新增 8 組地區 bgm，共 14 首／28 檔。feixiang-sting、sting-clear 保持原始 bytes。MP3 128 kbps；OGG Vorbis quality 4（hate 為 quality 6，減少柔風琴邊界失真）。

## 場景與曲目

| 場景 id | 顯示名稱 | 檔名（assets/audio/；均有 mp3、ogg） | 主樂器 | 調性 | BPM | 拍號／小節 | 循環秒 | 循環 LUFS mp3／ogg | 循環 dBTP mp3／ogg | KB mp3／ogg |
|---|---|---|---|---|---:|---|---:|---:|---:|---:|
| village | 微笑村 | bgm-village.mp3 / .ogg | 合成鐵琴、柔木琴琶音；無鼓、無沙鈴、無獨立低音 | C 大調 | 120 | 4/4／24 | 48.000000 | -16.48／-15.98 | -4.75／-4.35 | 775.0／399.4 |
| journey | 神祕魔法袋 | bgm-journey.mp3 / .ogg | 合成撥弦主奏、反拍刷弦、分解和弦撥弦低音、輕沙鈴；無木塊與鼓 | F 大調 | 112 | 4/4／24 | 51.428562 | -16.45／-15.98 | -4.09／-3.63 | 829.9／667.9 |
| candy | 第一願：西卡 | bgm-candy.mp3 / .ogg | 帶氣聲滑音的合成口哨、短風琴、木琴應答、輕小鼓與木質短低音；無沙鈴 | G 大調 | 128 | 4/4／24 | 45.000000 | -16.45／-15.97 | -8.17／-7.73 | 727.0／543.9 |
| bulu | 第二願：布魯 | bgm-bulu.mp3 / .ogg | 木琴、木質低音、短撥弦 | D 大調 | 108 | 4/4／20 | 44.444437 | -16.44／-15.94 | -4.89／-4.42 | 718.1／330.3 |
| hate | 最後一願：哈特 | bgm-hate.mp3 / .ogg | 短風琴、木質低音 | Bb 大調 | 124 | 4/4／20 | 38.709688 | -16.45／-15.93 | -6.97／-6.49 | 626.3／306.5 |
| ending | 漫天氣球 | bgm-ending.mp3 / .ogg | 柔鐘、長風琴低音、撥弦 | Eb 大調 | 102 | 3/4／24 | 42.352938 | -16.44／-15.96 | -5.73／-5.17 | 684.7／367.1 |
| castle | 微笑城堡 | bgm-castle.mp3 / .ogg | 雙聲部小鐘、整拍撥弦 | A 大調 | 116 | 4/4／20 | 41.379312 | -16.45／-15.97 | -7.32／-6.94 | 669.4／400.0 |
| slope | 飛飛的出發坡 | bgm-slope.mp3 / .ogg | 附點撥弦、雙拍木琴低音 | E 大調 | 132 | 4/4／20 | 36.363646 | -16.44／-15.96 | -5.02／-4.60 | 589.1／296.2 |
| hill | 阿飄的探險丘 | bgm-hill.mp3 / .ogg | 合成口哨、三拍木琴琶音 | F# 大調 | 118 | 3/4／24 | 36.610167 | -16.45／-15.95 | -7.61／-7.15 | 592.9／412.9 |
| bagvalley | 魔法袋谷 | bgm-bagvalley.mp3 / .ogg | 撥弦旋律、搖擺低音、鈴答句 | B 大調 | 110 | 4/4／20 | 43.636354 | -16.44／-15.96 | -4.64／-4.30 | 705.5／400.8 |
| candylane | 西卡的糖果巷 | bgm-candylane.mp3 / .ogg | 短木琴、反拍鈴、風琴低音 | Ab 大調 | 134 | 4/4／20 | 35.820896 | -16.45／-15.99 | -7.38／-6.53 | 580.3／310.8 |
| lamplight | 布魯的夜燈林 | bgm-lamplight.mp3 / .ogg | 輕風琴、分解撥弦、稀疏鈴音 | F 大調 | 100 | 3/4／24 | 43.200000 | -16.45／-15.95 | -4.83／-4.34 | 698.2／356.3 |
| theater | 哈特的魔術劇場 | bgm-theater.mp3 / .ogg | 撥弦、木琴和弦、低音答句 | Db 大調 | 104 | 4/4／20 | 46.153854 | -16.45／-15.95 | -6.22／-5.50 | 745.8／403.3 |
| plaza | 漫天氣球廣場 | bgm-plaza.mp3 / .ogg | 短口哨、切分風琴、木塊 | C 大調 | 126 | 4/4／20 | 38.095229 | -16.45／-15.95 | -5.56／-5.03 | 616.7／421.9 |

## 每首風格與對應理由

- **village｜鐵琴泡泡音樂盒**：A 的小鐘與泡泡感適合微笑村；首頁沿用同首，首頁不是第 15 個場景。
- **journey｜烏克麗麗搖擺跳跳**：B 的反拍烏克麗麗適合背著魔法袋出發。
- **candy｜口哨氣球小遊行**：C 的口哨小遊行適合西卡活潑的糖果主線。
- **bulu｜木琴躲貓貓：三連小跳與高低應答**：三連音高低應答，讓怕黑角色仍有俏皮陪伴。
- **hate｜短風琴魔術步：切分和弦與空拍問答**：短風琴切分像變魔術的小停頓，避免黑暗或史詩感。
- **ending｜氣球圓舞：三拍柔鐘與長音雲朵**：三拍柔鐘像氣球慢慢升起，速度仍有輕巧推進。
- **castle｜小鐘鐘塔：雙聲部卡農與整拍撥弦**：雙聲部鐘聲對應鐘塔與城堡，和 A 的無鼓琶音旋律分開。
- **slope｜彈跳起跑：附點上行與雙拍踏步**：上行附點與雙拍踏步，對應飛飛準備起跑。
- **hill｜丘陵迴旋：三拍木管與交錯琶音**：三拍木管輪轉，呼應阿飄繞著小丘探險。
- **bagvalley｜魔法口袋：五音短句與搖擺分解和弦**：五音短句、搖擺低音和單次鈴答句，像翻找魔法口袋。
- **candylane｜糖果踢踏：短木琴與反拍鈴答句**：更快的反拍木琴踢踏，與主線 C 的口哨行進曲不同。
- **lamplight｜夜燈搖籃：輕風琴長句與稀疏星光**：三拍稀疏星光、柔風琴長句，夜晚溫柔而不陰森。
- **theater｜玩偶小劇場：撥弦停頓與低音回答**：撥弦留白與低音回答，像玩偶在舞台輪流探頭。
- **plaza｜廣場跳格子：短笛呼喊與拉丁式木塊**：短口哨呼喊、切分風琴與木塊，像廣場跳格子；不同於 C 的四分音符遊行。

## 循環做法

所有音符與殘響都繞回同一圈，週期高通收斂低頻（原 A/B/C 100 Hz，新曲 110 Hz）。每首整圈 20 或 24 小節，BPM 100–134。取樣整數造成的小於 1 sample 誤差記錄在 scores-bgm3.json；沒有補零填拍。

**壓縮檔兩端各帶 9216 samples（48k 的 192 ms）循環音訊緩衝，不是靜音。** 編碼器在實際循環邊界前後都有上下文，減少原本 MP3／Vorbis 邊界瞬態；解碼後從 192ms 附近擷取表中長度的完整一圈，複製到獨立 AudioBuffer；source 的 loopStart=0、loopEnd=完整一圈長度。為處理 44.1k 重採樣的小數樣本，擷取起點可在 ±10ms 內在不加深接點能量凹洞的前提下，選兩聲道接點前後 2ms 二階差最小的位置，不改一圈樣本數、不混音、不補零。選到的實際 offset 全記錄在 validation-bgm3.json。檔案有效解碼總長比表中循環多 384ms；buffer source 每圈只播放擷取後的完整小節，不播放兩端保護區。這也排除 Chromium Vorbis 額外的尾區塊。直接用外部一般播放器循環整個檔案會包含緩衝，不能當成遊戲內試聽。

循環檔起點是原樂譜前的循環位移，完整訊號不減少；每曲 origin_shift_samples 見樂譜 JSON。新曲編碼起點可往前移最多 350ms，所以入場可能先聽到上一小節尾端的弱起，不把檔案 0 秒說成強拍。不是逐圈淡出、接點交叉混音，也沒有切斷殘響。B 原本約 6ms 凹洞與 C 約 122ms 近靜音尾巴的修正沿用 bgm2，這輪對最終手機編碼重新量測。

## 播放器與場景

js/audio.js 先 fetch、decodeAudioData，再 AudioBufferSourceNode loop=true；抽出有效範圍，三曲大小的 LRU 解碼快取限制手機記憶體。第一次 pointerdown／pointerup／touchend／click／keydown 手勢建立／resume AudioContext，之後手勢也可恢復 suspended/interrupted context。每個 source 只 start 一次；同曲請求只更新音量，不重播。

換曲先載好新檔，再把舊曲淡出 25ms、停止／disconnect，才開新曲；設計上不交叉疊兩首。序號取消過時載入，序列化切換避免競態；失敗不會讓後續切歌鏈永久失效。同場景音樂關閉或音量零只改 gain／HTMLAudio.muted，保留時間；關閉後換區只記錄想播的場景，不下載或解碼，重新開啟才載入，而且不會短暫放出舊地區音樂；廣告暫停記錄 offset，恢復從原位置。sting 使用獨立單一播放器，結束／取消恢復 BGM，sting 音檔沒有改。原遊戲沒有呼叫 playClearTheme，本輪保留這個範圍，不額外接入結算。

app 的 playSceneMusic 統一選曲：region.chapter 與 SAVE.chapter 一致才用地區 id；章節已推進時用新章節 id，背景／名稱也使用相同判斷。地圖進入只由 show(play) 選一次；修建築依玩家所在場景、不依正在修的另一區選曲。設定 UI 不再另行重選曲。地圖／章節 music metadata 同步改成自己的 id。

Web Audio 不存在或兩格式解碼都失敗時退回 HTMLAudio，保留同曲與音量行為；**這條退路在 loadedmetadata 後定位、用 timeupdate／ended 跳過保護區，但事件排程不能保證 sample 精準循環，平順度仍不如 Web Audio**。MP3 若多出最多 4096 個 48k 等效樣本，還要以兩端 2ms 週期訊號的相對／絕對誤差確認，再採用完整圈；超量或不符合週期就退格式／播放器，不盲剪尾。這是程式與模擬驗證，不等於 Safari 已實測。

模組與資料載入版本更新為 bgm3r2；音檔網址也帶 ?v=bgm3r2。本 repo 沒有 service worker。

## 驗證與重跑

- scores-bgm3.json：每曲完整 melody events、調性、節奏／拍號、樣本數、實際音檔 SHA-256、響度、峰值與接點量測。
- validation-bgm3.json：最終 headless Chromium，14 首 × MP3/OGG × 48k/44.1k 的解碼與兩圈 AudioBufferSource 渲染；每組量尾音、能量凹洞與二階差分。48k OGG 的有效全長左右聲道另與 ffmpeg 逐樣本 SHA 對齊。
- 音量門檻 −17 至 −15 LUFS、true peak ≤−1 dBTP、削波 0；尾 100ms >−35 dBFS，尾端連續近靜音 0ms；接點 2ms 凹洞不大於曲內小節線最大+1dB，接點二階差不大於曲內小節線最大。未為求通過放寬門檻。
- padding-bgm3.json：14 首真實 MP3 在 48k／44.1k 加 529、1105、2257 個前置零樣本，84 組週期檢查全部通過；仍非 Safari 實測，可用 test-codec-padding.cjs 重跑。
- 原創差異比較 91 組音高間距／節奏特徵；配器與和弦可直接查 compose_full.py，各自伴奏分支，不是同份伴奏換樂器。
- 遊戲頁實際切換地區，測試合成、交單、背包、故事、設定、跨區修建築、暫停恢復、快速切換、載入中停止、sting 取消與 HTMLAudio 退路。只統計 looping BGM，不把短 SFX 當成重疊音樂。

先設定 TMPDIR 到外接碟，執行 `PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/bgm/compose_full.py`。程式先在 TMPDIR 渲染與量測，全部檢查通過後才替換正式音檔及樂譜 JSON；失敗不覆寫交付檔，並清除自己的 WAV 暫存。原 compose_cute.py 留作 A/B/C 來源。

在 repo 根目錄執行 `python3 -m http.server 8938 --bind 127.0.0.1`，試聽頁是 `http://127.0.0.1:8938/review/bgm/loop-test.html`，14 首均可切 MP3/OGG。載入 `source /Volumes/外接資料碟/tools/skills/guizang-env.sh` 後，以既有 Playwright 的 NODE_PATH 執行 `node review/bgm/test-bgm3.cjs`；不需下載或安裝。接著跑 `PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/bgm/measure-playback.py` 量實際循環範圍（排除 guard）的響度與峰值，最後 `python review/bgm/write_report.py` 更新表格。單元測試 `node --test tests/*.test.mjs`。

## 交叉檢查

小頌第 1 輪已親自重新量測 28 檔與操作 headless Chromium；12 項中 10 項通過，擋在公開測試入口與 OGG 尾塊數字。詳見 [第 1 輪獨立審查](xiaosong/review-bgm3.md)。第 2 輪修正與驗證詳見下方，不把第 1 輪結論當成第 2 輪放行。

## 還沒實測的部分

Safari、iPhone、Android、來電／鎖屏／真正 bfcache 與手機靜音開關尚未實機驗收。suspend/resume 只有 Chromium 模擬。沒有實際耳聽，不保證「可愛程度／刺耳感／回音乾濕」符合每個人的感受。波形與數字不能替代我的王用耳朵確認。

只提交 xiaoxia/bgm-cute 與 draft PR #6，不 merge、不推 main、不改 Pages 設定；公開測試使用固定 commit 的免費 raw.githack。前輪盤點與證據保留於 [README-bgm2.md](README-bgm2.md)，其歷史「未整合」敘述不適用本輪。

## 第 2 輪：逐項回應小頌

本輪只調整 hate／bagvalley／theater 的主旋律音域（提高八度，旋律音程、編曲、律動與曲長保留）；其餘 11 首音檔 bytes 不變。400 Hz 二階高通後，三首各為 −17.9／−18.2／−17.8 LUFS，與其他 11 首中位數 −16.8 的差距為 1.1／1.4／1.0 dB；全部 14 首的這項數值最大差 2.0 dB。這是手機小喇叭近似，不是 iPhone 實測。數據／圖：[phone-r2.json](phone-r2.json)、[phone-r2.png](phone-r2.png)。

| 第 1 輪問題 | 第 2 輪處理 |
|---|---|
| A：缺公開網址與步驟 | 提供下方固定 commit 的兩個網址與 5 步測試；curl 與 headless 實測證據留檔 |
| B：OGG 尾塊數字未更正 | 下表列本輪 14 首實測值；README-bgm2.md 的 A/B/C 舊數字更正為 320／997／960 |
| 1：觸控解鎖疑慮 | 增加 pointerup、touchend、click，音效關閉也能用手勢解鎖 BGM；尚不能宣稱 iPhone 已通過 |
| 2：三首手機可能太小聲 | 只提高這三首主旋律一個八度；重新編碼、量響度、雙格式／雙取樣率循環檢查，沒有重寫其他曲 |
| 3：HTMLAudio 退路靜音 | 音樂關閉或音量 0 設 el.muted=true；重新開啟復原，不重頭播。iOS 退路的中間音量仍受系統限制 |
| 4：試聽與遊戲不一致 | 試聽預設 MP3；兩者共用 prepareDecodedLoop，補零上限和週期訊號檢查完全同源；試聽換曲也先停舊音源；連點時共用退場 Promise，前一首淡出停止前，新請求不得先開聲 |
| 5：關音樂還下載 | 關閉／零音量換區只更新 wanted，不 fetch／decode；打開時載入最新場景，不短暫放出舊曲；取消已在途請求的播放權，不聲稱能撤回已下載的 bytes |
| 6：慢網路舊曲延續 | 保留先載好再切換的設計，避免下載期間無聲；新曲準備好後舊曲淡出停止，再開新曲，沒有重疊。實機時確認延遲是否可接受 |
| 7：進場可能先聽到弱起 | 保留完整循環位移與殘響，仍可能從強拍前最多 350ms 開始；不是靜音或重播，下方測試請留意 |
| 8：小頌審查描述過時 | 明確引用他第 1 輪的獨立音檔量測／瀏覽器測試；第 2 輪結果另記，不再寫他只讀證據 |

### OGG 尾端區塊：實際解碼樣本數減有效檔長

以下是本輪 macOS headless Chromium 148 的 decodeAudioData 實測；有效檔長包含兩端各 9216 個 48k guard 樣本，額外樣本是 codec tail block，不是曲子尾端靜音。播放器只取 guard 內的完整一圈，不播額外尾塊。來源：validation-bgm3.json 的 decoded[].padding。

| 場景 | 48 kHz 額外樣本 | 44.1 kHz 額外樣本 |
|---|---:|---:|
| village | 0 | 0 |
| journey | 101 | 92 |
| candy | 960 | 882 |
| bulu | 747 | 686 |
| hate | 47 | 42 |
| ending | 915 | 840 |
| castle | 673 | 618 |
| slope | 273 | 250 |
| hill | 472 | 433 |
| bagvalley | 623 | 571 |
| candylane | 341 | 313 |
| lamplight | 320 | 294 |
| theater | 39 | 36 |
| plaza | 741 | 680 |

### iPhone 公開測試入口

播放器／音檔固定在 `97963f922b7cb4a4cf10fa8278c211241d2bea1a`；後續文件／驗證紀錄提交不改此版本。repo 是 public，免費 raw.githack 讀取該 commit；不改 GitHub Pages 設定，不推 main。

- [14 首循環試聽](https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/97963f922b7cb4a4cf10fa8278c211241d2bea1a/review/bgm/loop-test.html)
- [遊戲測試](https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/97963f922b7cb4a4cf10fa8278c211241d2bea1a/index.html)

1. 用 iPhone Safari 開試聽網址；若看到英文中繼頁，先按 **Open the page**。
2. 保持預設 MP3，點第一首，聽約 48 秒繞回開頭時有沒有停頓或喀聲；B 約 51 秒、C 約 45 秒也各聽一圈。
3. 再點其他幾首，聽切換是否重疊，並比較哈特、魔法袋谷、劇場的音量。
4. 開遊戲網址（若有中繼頁也按 Open the page），進遊戲後從地圖換幾個已解鎖地區，聽同一地區有沒有連續重頭播兩次。未解鎖曲目可在試聽頁全部測。
5. 同地區開背包、合成、交單、開設定關音效／調音樂／關音樂再開，確認沒有意外重播，靜音確實有效。

實際測試環境：本機 macOS、headless Chromium 148.0.7778.96；包含本機與公開網址。**iPhone Safari 尚待我的王實機測試**。沒有測 Android、Safari、Firefox、來電、鎖屏與真實手機靜音開關，沒有耳聽或 MOSS 描述；數字不能判斷童趣、回音乾濕、機械重複感或關係小調的聽感。

本輪驗證：validation-bgm3.json（56 組循環、91 組差異、實際遊戲操作）、validation-r2.json（13 個修正回歸項目）、padding-bgm3.json（84 個補零模擬）、public-http-r2.json（curl 31 路徑 HTTP／MIME）、public-r2.json（公開網址實際操作與記憶體）、public-game-r2.png／public-loop-r2.png。兩次測試的原始狀態各自保留，不覆蓋小頌的第 1 輪資料。

### 第 2 輪交叉檢查與保留取捨

小頌第 2 輪：程式碼審查通過（有條件），數據沿用小夏實測。他的這次 session 無法執行 node／Playwright，沒有獨立重跑音檔量測，不能寫成實測驗收。小夏額外發現並修正試聽頁連點時「上一首尚在淡出、新請求已開聲」的 35ms 競態；10ms 間隔測試由 FAIL 轉 PASS，另補 15ms 間隔七連點與兩項靜音切換測試，合計 13 項回歸通過。最終小差異的確認另見 xiaosong-review-r2.md。

保留取捨：同場景靜音保留音源位置，仍有少量播放運算；試聽頁尚未快取時重複點同首可能重複下載／解碼，但最多保留 3 首快取且只播放最後請求。試聽頁刻意允許指定格式，該格式失敗時提示手動換格式；遊戲則自動 MP3→OGG→HTMLAudio。HTMLAudio 退路可確實靜音，但 iOS 對非零音量的控制仍受系統限制。

重跑會更新證據檔：test-r2.cjs 可設 R2_OUT 到外接 TMPDIR；test-public-r2.cjs 可設 OUT 到外接 TMPDIR，截圖預設寫 review/bgm/。本次公開測試截圖是交付證據，因此保留；若只做臨時重跑，請先更改截圖輸出位置或在驗證後移除本次新增的臨時圖，不覆蓋已保留的版本。

最終差異 `97963f9` 小頌靜態審查 PASS；他明確承認前次靜態推演漏掉退場競態，由小夏實測抓到。仍保留一個未重現的試聽頁例外風險：如果退場鏈因 context／stop 例外失敗，可能需要重新整理試聽頁；正常切換、停止與七連點均通過。詳見 [第 2 輪交叉檢查](xiaosong-review-r2.md)。

公開頁 17 個同場景操作全部零重播／零停止，12 次地區進入（含同區重入）均符合每個新地區只起一次，存活 PCM 最多 3 首（最高約 50.3 MiB）；28 次 MP3／OGG 試聽均成功，遊戲／試聽／退路 JS 例外均為 0。公開紀錄另有 githack 廣告請求失敗及既有／測試頭像的載入失敗，沒有 BGM 請求失敗；本輪不改角色素材。
