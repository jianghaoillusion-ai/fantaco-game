cast8：姐姐／氣球精靈已分開調整頭髮、臉與身體，維持原設定的角色與舉手／叉腰姿勢；精靈皇冠維持原尺寸，補回舉手袖口斷掉的黑線。哈特對 `5b125dc` 零像素差，本輪完全沒改。

**維持 draft，尚未宣稱驗收通過。** 指定主要比例在小夏暫測中進入 ±5%，但臉髮遮罩尚未由小頌獨立校準；姐姐包含垂下長髮的髮量仍 +47.55%，肩寬及精靈頭寬、身長、腿長也另列差異。姐姐使用一次 Codex 內建生圖修補衣服／髮尾拼接，再覆回原臉，不能宣稱所有髮絲與衣服細節僅做縮放。

原設定鎖定 `525ab99f5d635f75cf3553877422fa018a81d35f:assets/chars/jiejie.png`、同 commit 的 `assets/chars/spirit.png`；本輪從 `f346cdf` 開始。原臉覆回區的內部 RGB 比對為零差異，見 `review/cast8/face-audit.json`。完整來源、內建生圖提示與等比倍率：`review/cast8/provenance.md`。

指定審查圖（全部在本 PR）：

- `review/cast8/cmp-seven.png`
- `review/cast8/overlay-jiejie-vs-blue.png`
- `review/cast8/overlay-hate-vs-blue.png`
- `review/cast8/overlay-spirit-vs-blue.png`
- `review/cast8/edges-jiejie.png`
- `review/cast8/edges-hate.png`
- `review/cast8/edges-spirit.png`
- `review/cast8/before-after-jiejie.png`
- `review/cast8/before-after-spirit.png`
- `review/cast8/spirit-cuff.png`

逐項數字、差距與沒做到的：`review/cast8/report.md`、`measurements.md`、`measurements.json`。像素證據：`validation.json`、`face-audit.json`、`crown-audit.json`。小頌只交叉檢查，紀錄在 `review/cast8/xiaosong/`；他的協作橋無法執行 Python，沒有假稱獨立量測通過。

已實跑本機重建與檢查：三張透明 RGBA PNG 540×720、腳底 y685、PNG/WebP 解碼一致；哈特及另外四人的 PNG/WebP 檔案不變。姐姐／精靈硬切像素 0、可見小碎塊 0；哈特既有 39 個硬邊保持原樣。沒有修改 avatars/expr，未做遊戲端完整顯示驗收。

只用 Codex 內建 image_gen 與本機免費 Pillow/numpy/OpenCV，沒有即夢、付費 API 或 AppleScript 控制 Chrome。只推 `xiaoxia/cast-redraw-v2`，不 merge、不推 main；沒有動 PR #4、fantaco-jimeng、photo-live-beauty 或 threads-revival。
