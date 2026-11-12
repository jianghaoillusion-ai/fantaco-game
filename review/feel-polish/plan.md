# 實作與驗收基準
依使用者完整規格執行，基線 80359c4，僅 xiaoxia/feel-polish。
1. 先定位：原拖曳圖上浮 ≥56px，命中仍在手指；合成動畫早於 render；生成取得的舊 DOM 已被 render 移除。
2. 座標統一用 client CSS px，32px 視覺浮起明示為美術偏移，落點與高亮一致用手指；用每格觸控測試量座標及視覺誤差。不要乘 DPR 或重複加 scroll/viewport。
3. 同步提交遊戲狀態，動畫使用獨立快照，避免延遲期間重複交單／合成；只動畫 transform/opacity。減少動態模式不彈跳。
4. 三個原創短音效預解碼；背景音樂 SHA256 守門。
5. 原生幀擷取及曲線測量、4x CPU、前後影片、版本釘選網址；小頌唯讀互審，修正後再推本分支和 draft PR。
限制：沒有 iPhone 實機；Chromium 裝置模擬不能證明 iOS 震動、GPU 與原生手勢。codebase-memory 工具未暴露，已以來源讀取／rg 查呼叫鏈補足。
