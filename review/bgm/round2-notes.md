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
