# 小頌第2輪獨立量測

量測程式由小頌撰寫，小夏代執行；小頌再看遮罩和數字下判斷。最終結論看 `review-final.md`，不是只看 results.md 內自動產生的通過字樣。

`results.md/json`、所有mask與overlay來自同一次r2c執行，圖檔SHA1見results。姐姐細髮束漏算、手臂區域殘留與身後長髮不可見的限制仍須揭露。哈特含帽子和手部的「分類敏感度」不是頭部尺寸，不能當通過門檻。

若要重跑，先把 `measure_r2.py` 複製到外接磁碟的 `$TMPDIR` 任務子資料夾，再用 `~/media-tools/venv/bin/python -I` 執行該副本。程式會讀指定worktree的四張圖，只寫旁邊out/；為避免覆蓋審查證據，禁止直接在repo裡產生out/。需要已安裝的Pillow、NumPy、SciPy。跑完自行核對SHA1並清理該次TMPDIR。

本資料夾的overlay是量測遮罩展示；與布魯各50%透明的疊圖在上一層。
