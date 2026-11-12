"""Build the factual scene table from final encoder measurements."""
import json
from pathlib import Path
P=Path(__file__).resolve().parent
scores=json.loads((P/'scores-bgm3.json').read_text())
instruments={'bulu':'木琴、木質低音、短撥弦','hate':'短風琴、木質低音','ending':'柔鐘、長風琴低音、撥弦','castle':'雙聲部小鐘、整拍撥弦','slope':'附點撥弦、雙拍木琴低音','hill':'合成口哨、三拍木琴琶音','bagvalley':'撥弦旋律、搖擺低音、鈴答句','candylane':'短木琴、反拍鈴、風琴低音','lamplight':'輕風琴、分解撥弦、稀疏鈴音','theater':'撥弦、木琴和弦、低音答句','plaza':'短口哨、切分風琴、木塊'}
why={'village':'A 的小鐘與泡泡感適合微笑村；首頁沿用同首，首頁不是第 15 個場景。','journey':'B 的反拍烏克麗麗適合背著魔法袋出發。','candy':'C 的口哨小遊行適合西卡活潑的糖果主線。','bulu':'三連音高低應答，讓怕黑角色仍有俏皮陪伴。','hate':'短風琴切分像變魔術的小停頓，避免黑暗或史詩感。','ending':'三拍柔鐘像氣球慢慢升起，速度仍有輕巧推進。','castle':'雙聲部鐘聲對應鐘塔與城堡，和 A 的無鼓琶音旋律分開。','slope':'上行附點與雙拍踏步，對應飛飛準備起跑。','hill':'三拍木管輪轉，呼應阿飄繞著小丘探險。','bagvalley':'五音短句、搖擺低音和單次鈴答句，像翻找魔法口袋。','candylane':'更快的反拍木琴踢踏，與主線 C 的口哨行進曲不同。','lamplight':'三拍稀疏星光、柔風琴長句，夜晚溫柔而不陰森。','theater':'撥弦留白與低音回答，像玩偶在舞台輪流探頭。','plaza':'短口哨呼喊、切分風琴與木塊，像廣場跳格子；不同於 C 的四分音符遊行。'}
rows=['| 場景 id | 顯示名稱 | 檔名（assets/audio/；均有 mp3、ogg） | 主樂器 | 調性 | BPM | 拍號／小節 | 循環秒 | 循環 LUFS mp3／ogg | 循環 dBTP mp3／ogg | KB mp3／ogg |','|---|---|---|---|---|---:|---|---:|---:|---:|---:|']
for s in scores:
 a,b=s['files']['mp3'],s['files']['ogg'];i=instruments.get(s['id'],s['instrument'])
 rows.append(f"| {s['id']} | {s['name']} | bgm-{s['id']}.mp3 / .ogg | {i} | {s['key']} | {s['bpm']} | {s['meter']}/4／{s['bars']} | {s['duration_seconds']:.6f} | {a.get('playback_lufs',a['lufs']):.2f}／{b.get('playback_lufs',b['lufs']):.2f} | {a.get('playback_true_peak_dbtp',a['true_peak_dbtp']):.2f}／{b.get('playback_true_peak_dbtp',b['true_peak_dbtp']):.2f} | {a['bytes']/1000:.1f}／{b['bytes']/1000:.1f} |")
table='\n'.join(rows)
body='''# 14 場景專屬 BGM（bgm3）

A 鐵琴 → village，B 烏克麗麗 → journey，C 口哨 → candy。保留原樂譜、編曲與音色，再由同一程序重新編碼成手機檔；其餘 11 首另寫樂譜與各自伴奏。全部免費 Python/numpy/ffmpeg 程序合成，沒有外部取樣或套用既有旋律，沒有付費服務、即夢或浮水印；沒有進行全球曲庫比對。

覆寫原本 6 組 bgm 同名檔，新增 8 組地區 bgm，共 14 首／28 檔。feixiang-sting、sting-clear 保持原始 bytes。MP3 128 kbps；OGG Vorbis quality 4（hate 為 quality 6，減少柔風琴邊界失真）。

## 場景與曲目

'''+table+'\n\n## 每首風格與對應理由\n\n'+'\n'.join(f"- **{s['id']}｜{s['style']}**：{why[s['id']]}" for s in scores)+'''

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
'''
old=P/'README.md';history=P/'README-bgm2.md'
if not history.exists():history.write_text(old.read_text())
extra=P/'round2-notes.md'
if extra.exists():body+='\n'+extra.read_text()
old.write_text(body)
(P/'scene-table-bgm3.md').write_text(table+'\n')
