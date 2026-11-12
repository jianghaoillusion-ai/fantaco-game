# 小頌交叉檢查摘要（小夏整理）

協作橋對話串：20261112-141215_請只做交叉檢查、不作曲、不改任何檔、不-comm。

小頌最終結論原文：「可以當 draft 交付（draft PR #6 維持 draft），還不能 merge 或上線。」

審查方式：小頌只讀來源碼、README、測試碼與小夏產出的驗證 JSON，推演停止／切歌／暫停競態；沒有獨立執行 node、瀏覽器、ffmpeg，也沒有量音檔或耳聽。沒有改檔、作曲、commit 或 push。不能把這份文件說成第二次獨立實測。

已依審查修正：切歌失敗可恢復、解碼失敗退路、LRU3、再次手勢恢復音訊、章節背景和配樂一致、sting 取消與遲到拒絕競態、fallback 載入後定位與循環跳過 guard、各首獨立回答句與終止句、渲染全部通過才替換檔案。

最終只讀審查確認：停止、快速切換、暫停、sting 期間切換等狀態邏輯沒有新問題。其建議的真實 MP3 加前置 delay 模擬已補做（padding-bgm3.json）；這是小夏執行的 84 組模擬，不等於 Safari 實機。

待實機：Safari／iPhone／Android，鎖屏、來電、靜音開關、實際耳聽。HTMLAudio fallback 仍受 timeupdate／ended 事件精度限制。首頁用 village；原 branch 沒有 sting 結算呼叫，本輪未擅自新增。

最後一行複審：小頌讀取 audio.js:120–146，確認 fallback 非 ended 時以 currentTime-duration 保留超出量，ended 才回 guard；維持 draft 交付通過。他讀取 padding-bgm3.json 的 84 筆 accepted:true，沒有親自重跑。
