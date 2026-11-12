# BGM 完整版執行計畫

依使用者已指定的完整方案執行，維持 draft PR #6，不部署。

1. 沿用 compose_cute 的 A/B/C 原曲與循環渲染；另外寫 11 首獨立樂譜、節奏及伴奏。輸出 128k MP3 與 OGG，檢查 30–60 秒、−16±1 LUFS、≤−1 dBTP、完整小節及兩格式接點。
2. 先建立播放器失敗測試，再實作 AudioBuffer 快取、手勢解鎖、淡出後切換（同時最多一支 BGM）、靜音保留位置、暫停恢復、載入競態取消。統一章節／地區選曲，設定不再額外選曲。sting 檔案雜湊不變。
3. 擴充試聽頁；headless Chromium 在 48k/44.1k 驗證兩格式循環、實際遊戲操作及切換，紀錄 validation-bgm3.json。更新 README 場景表與報告。
4. 小頌只交叉檢查；修復審查問題後 commit，確認分支再 push，PR 保持 draft。清除本次 TMPDIR 暫存。

不重做前輪已通過的音色設計與場景盤點；不接觸其他 worktree。Safari/iPhone/Android 與人耳聆聽沒有實機就明列待驗，不以 Chromium 推論。

執行結果：14 首與播放器已完成；11 項 node 測試、56 組瀏覽器循環與 84 組真實 MP3 延遲模擬通過。小頌只讀互審同意 draft 交付。Safari／手機與耳聽待使用者實機驗收；不 merge、不部署。
