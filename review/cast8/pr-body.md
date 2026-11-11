cast8：姐姐／氣球精靈已分開調整臉、頭髮與身體，精靈皇冠維持原尺寸並修補袖口黑線。哈特對5b125dc零像素差，其他四位未修改。

**維持draft，尚未驗收通過。** 指定主要比例在小夏暫測中進入±5%；小頌已交叉檢查，但協作橋擋住獨立Python量測。姐姐含垂下長髮的髮量仍超標，重繪髮絲與服裝細節也未能保證完全等同原設定。

原設定固定 `525ab99f5d635f75cf3553877422fa018a81d35f:assets/chars/jiejie.png`、同commit的 `assets/chars/spirit.png`，本輪起點f346cdf。姐姐曾用一次Codex內建生圖修接縫，再覆回原臉；不能說全圖只縮放。原臉內部RGB比對兩人都是0差異。

指定審查圖：

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

補充放大：`review/cast8/landmarks-jiejie.png`、`landmarks-spirit.png`、`chin-4x-jiejie.png`、`chin-4x-spirit.png`、`jiejie-neck-4x.png`、`jiejie-fingers-4x.png`、`spirit-crown-4x.png`。

逐項數字、差距、完整圖片清單與沒做到的：`review/cast8/report.md`、`measurements.md/json`。來源與內建生圖提示：`provenance.md`。像素證據：`validation.json`、`face-audit.json`、`crown-audit.json`、`image-sha256.json`。小頌審查原文在 `review/cast8/xiaosong/`。

已實跑重建、檢查及來源比對：透明RGBA PNG540×720、腳底y685、PNG/WebP解碼一致；兩張新圖硬邊0、可見碎點0、alpha>0各1個連通塊。哈特既有39個硬邊依一像素不改要求保留。未改avatars/expr，未驗遊戲端完整顯示。

只用Codex內建image_gen與免費本機工具；沒有即夢、付費API、AppleScript控制Chrome。只推xiaoxia/cast-redraw-v2，不merge、不推main、不碰PR #4或其他指定禁止範圍。
