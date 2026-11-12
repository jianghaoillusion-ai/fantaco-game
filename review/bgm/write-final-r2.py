"""Write the requested external round-2 report; first-round report is read-only."""
import json,subprocess,re
from pathlib import Path
P=Path(__file__).resolve().parent
readme=(P/'README.md').read_text();notes=(P/'round2-notes.md').read_text();v=json.loads((P/'validation-bgm3.json').read_text());s=v['audio'];pub=json.loads((P/'public-r2.json').read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
response=notes.split('### OGG')[0]
urls=notes.split('### iPhone 公開測試入口')[1].split('### 第 2 輪交叉檢查與保留取捨')[0]
style=readme.split('## 每首風格與對應理由')[1].split('## 循環做法')[0]
table=(P/'scene-table-bgm3.md').read_text()
for song in s:table=table.replace(f"bgm-{song['id']}.mp3 / .ogg",f"assets/audio/bgm-{song['id']}.mp3、assets/audio/bgm-{song['id']}.ogg")
files=[f for song in s for f in song['files'].values()]
sizes={ext:sum(song['files'][ext]['bytes'] for song in s) for ext in ('mp3','ogg')}
body=f'''# 小夏｜BGM 完整版第 2 輪（最後一輪修正）

{response}

## 交付版本

播放器／音檔與公開預覽固定 commit：97963f922b7cb4a4cf10fa8278c211241d2bea1a。
主修正 commit：a7d4cfcc6b7e473b77d440e8bb89abc0dabf2557；連點退場競態修正：97963f922b7cb4a4cf10fa8278c211241d2bea1a。
文件與證據最新 commit：{head}。
分支：xiaoxia/bgm-cute；PR：https://github.com/jianghaoillusion-ai/fantaco-game/pull/6（維持 draft）。
工作目錄：/Volumes/外接資料碟/ai-lab/fantaco-bgm-cute。
前輪報告原樣保留：/Volumes/外接資料碟/ai-lab/fantaco-logs/xiaoxia-final-bgm3-r1.md。

全部免費 Python/numpy/ffmpeg 原創程序合成，沒有付費 API、即夢、外部取樣或 AI 浮水印；沒有全球曲庫比對。小頌只審查，沒有作曲。本輪只改三首的主旋律音域；其餘 11 首共 22 檔和 b7dff00 逐 bytes 比對完全相同。四個 sting 和開工 main 22a7d6d 逐 bytes／SHA-256 比對相同。

實際循環長度 {min(x['duration_seconds'] for x in s):.2f}–{max(x['duration_seconds'] for x in s):.2f} 秒。28 檔循環響度 {min(x['playback_lufs'] for x in files):.2f}～{max(x['playback_lufs'] for x in files):.2f} LUFS，最高 true peak {max(x['playback_true_peak_dbtp'] for x in files):.2f} dBTP，削波 0。MP3 共 {sizes['mp3']:,} bytes（{sizes['mp3']/1e6:.2f} MB）；OGG 共 {sizes['ogg']:,} bytes（{sizes['ogg']/1e6:.2f} MB），MB 依十進位。MP3 128 kbps；一次只抓當前一種格式。

## 場景 → 曲目／完整 repo 路徑

{table}
## 每首風格與場景理由
{style}
## 播放器與原因／修法

- js/audio.js:4：14 個場景各指向自己的 bgm-<id>。
- js/audio.js:18、js/app.js:158：首次與後續 pointerdown／pointerup／touchend／click／keydown 建立或 resume AudioContext，解鎖不依賴音效。
- js/audio.js:28、34、132：原先只把增益歸零，換區仍走 load；現在靜音換區只記錄 wanted，開啟才下載最新場景；同曲仍保留播放位置。HTMLAudio 用 muted 真正靜音。
- js/audio.js:52、79：兩端 guard 內擷取完整小節；prepareDecodedLoop 由遊戲與試聽共用，MP3 額外補零上限 4096、OGG 尾塊上限 2048（48k 等效），額外 MP3 delay 還須通過週期訊號檢查。
- js/audio.js:94、111：lazy fetch／decode，LRU 最多 3 首；公開瀏覽器強制 GC 後 PCM 最多 3 首，原始解碼 buffer 0。
- js/audio.js:123、132：新曲載好後，舊曲淡出 25ms、停止，才開始新曲；generation 取消過期請求，switching 串行化換曲。
- js/app.js:134、js/map.js:167／177：原本進地區先 playMusic 再 show(play)，修建築又用目標建築所屬地區，會選錯或連切兩次。沿用第 1 輪修法：進地區只由 show(play) 呼叫 playSceneMusic；修建築依玩家當前場景；region.chapter 與 SAVE.chapter 不同時播放目前主線章節曲。同曲重複呼叫不重啟。
- review/bgm/loop-test.html：預設 MP3，同一 prepareDecodedLoop；retire 共用 Promise，沒有 active 的新請求也等前一首 stop。原本 10ms 連點實測會短暫疊音，修後 10ms／15ms 連點都只有一個 source。
- index.html:381 與相關 js import／音檔／資料網址使用 bgm3r2。沒有 service worker，沒有動 Pages 設定。

## 本輪實測結果

測試裝置／瀏覽器：macOS headless Chromium 148.0.7778.96（本機、固定 commit 公開網址）；沒有使用 AppleScript 控制 Chrome。

| 驗證 | 結果 |
|---|---|
| 14 首 × MP3／OGG × 48k／44.1k | 56 組完整循環、接點凹洞、瞬態、尾端音量全過；近靜音尾巴 0ms |
| B 6ms 縫、C 122ms 尾巴 | 沒有復發；A/B/C 音檔本輪未改 |
| 實際循環響度／峰值 | 28 檔全部符合 −16±1 LUFS、≤−1 dBTP、無削波 |
| 原創差異 | 91 組音程／節奏比較通過；14 個不同 BPM、12 種調，編曲保留個別分支 |
| MP3 前置補零模擬 | 84 組通過，仍不等於 Safari 實機 |
| 公開遊戲地區進入 | 12 次含同區重入；新區只起 1 次，同區 0 次，最大同時 source=1 |
| 同區操作 | 17 項零重播／零停止，含真正合成、交單、背包、設定、故事、兩種修建築 |
| 公開試聽 | 14 首 × 兩格式共 28 次成功，最大同時 source=1，停止後 0 |
| 記憶體 | 最大 3 首 PCM；最高約 50.3 MiB，原始解碼 buffer 沒有殘留 |
| 修正回歸 | 13 項全過，含靜音跨多區、6 次關開夾 unlock、15ms 間隔七連點 |
| 單元測試 | 11／11 通過 |
| 公開 curl | 31 路徑 HTTP 200、MIME 正確，28 音檔相對路徑實際可解碼 |
| JS 例外 | 遊戲、試聽、HTMLAudio 退路皆 0 |

主要證據：review/bgm/validation-bgm3.json（含 round2）、validation-r2.json、phone-r2.json／png、public-r2.json、public-http-r2.json、public-game-r2.png、public-loop-r2.png。小頌第 1 輪原圖與 JSON 保留在 review/bgm/xiaosong/；第 2 輪回覆在 review/bgm/xiaosong-review-r2.md。

## 公開網址與 5 步實機測試
{urls}
## 小頌交叉檢查與未完成驗收

小頌第 2 輪程式碼審查有條件 PASS；最終 97963f9 試聽退場差異靜態審查 PASS。他這輪沒有獨立重跑，數據由小夏實測。小頌承認前次靜態推演漏掉退場競態，由小夏實測抓到，已修正並加入回歸。

iPhone Safari 尚待我的王實機測試。可愛程度、機械重複感、回音乾濕、關係小調聽感與三首手機響度是否合意，都沒有耳聽驗收；沒有 Safari／Android／Firefox／來電／鎖屏實機驗證。

保留取捨：慢網路先延續舊曲直到新曲備妥；入場可能先聽強拍前最多 350ms 弱起；靜音仍維持目前音源位置與少量運算；試聽指定格式失敗須手動換格式（遊戲會自動退路），尚未快取時連點同首可能重複解碼；試聽退場鏈若發生未重現的例外，可能需要重整。HTMLAudio 退路非 sample 精準循環，iOS 非零音量也受系統限制。

公開紀錄有 githack 廣告請求及既有／測試頭像載入失敗，沒有 BGM 請求失敗；依任務邊界不改角色素材。沒有動其他 worktree、photo-live-beauty、threads-revival。未 merge、未推 main、未調整 Pages。

## 收尾

本輪僅推 xiaoxia/bgm-cute，PR #6 保持 draft。程式碼／音檔與公開入口固定 97963f9，後續提交只補測試、文件、圖與數據。
清理與遠端狀態以最後檢查結果補記。
'''
Path('/Volumes/外接資料碟/ai-lab/fantaco-logs/xiaoxia-final-bgm3.md').write_text(body)
print('round-2 final report rewritten; r1 untouched')
