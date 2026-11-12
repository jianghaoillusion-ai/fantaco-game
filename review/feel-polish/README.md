# FANTACO 手感修正

基線 `main 80359c4`，分支 `xiaoxia/feel-polish`。沒有改 GitHub Pages，沒有合併 main。**沒有 iPhone 實機測試。**

改動：拖曳浮起量固定32px、手指落點與高亮一致；合成先提交再播放吸附與回彈，生成改飛新物品；三個免費原創短音效預解碼（未載好時用極輕即時提示音）；交付按鈕用真實原生 switch label，拿起／合成保留舊版盡力震動。新版WebKit仍可能不允許程式觸覺。

## 證據
- `haptics-research.md`、`haptic-test.html`：版本與事件來源、獨立測試。
- `drop-accuracy.md/.json`：315次、零格誤判；其中63次是正式拖曳模組的1.5倍隔離棋盤，不能當完整遊戲iPhone縮放驗收。
- `anim-params.md`、`reference-probe.json`、`reference-curve.csv`：原生幀率、時間曲線、調校參數及開源參考。
- `fps.json`：4x CPU、390×844、DPR3、headless Chromium。平均／最低取rAF，不是螢幕實機FPS。
- `before.webm` / `after.webm`：Playwright 390×844前後對照，修前取80359c4獨立暫存快照。**錄影為25fps、無聲，只供視覺對照，絕不用作60fps時間曲線證據，也沒有補幀。**
- `interaction-results.json`：觸控合成、生成、交單不重複、減少動態、音效開關。
- `make-sfx.py`、`sfx-levels.json`、`guard-audio.py`、`protected-audio.json`：原創合成、音量與32個受保護音檔完全相同的SHA256。

三音效長度 .30/.18/.42 秒，預設播放gain .136；原始RMS約−27dBFS，播放約−44.4dBFS。village BGM原始平均−19.4dBFS，預設gain .36後約−28.3dBFS，音效平均低約16dB。不同BGM／音量滑桿與瞬間音樂空隙會改變差距；可愛程度與聽感需本人驗收。對照影片沒有音軌，屬預期，音效請在遊戲測。

## 公開測試網址
程式測試版本：`42e7fc837f5a398bf18c6c93feb9846fcf5bcbea`。後續commit僅補驗證結果與文件。

[遊戲測試](https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/42e7fc837f5a398bf18c6c93feb9846fcf5bcbea/index.html) · [觸覺測試](https://rawcdn.githack.com/jianghaoillusion-ai/fantaco-game/42e7fc837f5a398bf18c6c93feb9846fcf5bcbea/review/feel-polish/haptic-test.html) · [Draft PR #9](https://github.com/jianghaoillusion-ai/fantaco-game/pull/9)

curl兩頁均HTTP200；headless點過githack的「Open the page」通知後，觸覺頁與遊戲正常，棋盤63格、遊戲資源及JavaScript錯誤均0。見public-check.json。通知頁自身廣告遭瀏覽器阻擋，與遊戲資源無關。

## iPhone 測試（五步）
1. 用Safari開觸覺測試頁，若先出現外部內容通知，點「Open the page」；記下iOS版本，逐一試直接switch、label和各按鈕；滑動touchmove那格，記錄哪個真的震。
2. 開遊戲測試頁，設定開啟震動；拿起、合成、直接點「交付」，再關閉震動重做一次。
3. 拖到棋盤四角及各列，看高亮格是否就是放下格；圖示預期浮在手指上方32px。
4. 開啟音樂與音效，生成、合成、交單；確認短音效比背景輕，關音效後重做應無短音效。
5. 看合成吸附回彈、生成拋物線是否順；需要時再用主畫面PWA、LINE/IG重做第1–2步並回報差異。

## 重跑
用本機靜態伺服器8913開本分支、8914開80359c4快照。設定TMPDIR到外接碟、PLAYWRIGHT_BROWSERS_PATH到已安裝外接碟瀏覽器。測試腳本的Playwright import使用本機既有安裝，其他環境需改路徑，不必安裝付費服務。
`node --test tests/*.test.mjs review/feel-polish/regression.test.mjs`、`node review/feel-polish/interaction-test.mjs`、`node review/feel-polish/drop-test.mjs`、`node review/feel-polish/zoom-test.mjs`、`node review/feel-polish/record-fps.mjs`、`python3 review/feel-polish/guard-audio.py`。

本次只用既有本機免費工具，沒有即夢、付費生成、AppleScript或可見瀏覽器。沒有服務端資料庫；私人localStorage存檔不包含於程式碼備份。

最後一輪4x CPU：合成平均70.71／最低61.73 FPS／掉幀0；生成平均71.28／最低37.74 FPS／掉幀4。headless虛擬compositor節奏可高於60Hz，不是手機螢幕FPS；單次短樣本，掉幀依60Hz間隔計算。

## 第 2 輪修正
觸覺起始版本已依 WebKit 官方改成 iOS 18.0；Flarum 來源網址已修正，每個測試控制項都有白話 iOS 版本與預期。26.5 封鎖只屬第三方版本資訊。補了真實 Merge Mansion 60fps 下載、逐格抽幀指令、圖與曲線代理；細節及不能推導的部分見 anim-params.md。遊戲程式與音檔未變，快取版本沿用 20261113-feel1；本輪改的是測試頁與證據。

小頌非阻擋建議仍待本人判斷：音效較輕、32px 視覺浮起、pointerdown 即觸覺均維持。小可視高度下底列被下方介面遮住 6–12px 是已知既有問題，零格誤判不代表被遮部分可拖入。本輪不宣稱已修好該版面或實機手感。
