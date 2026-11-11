# 眠花糖素材（待我的王審核）

本次第三輪以官方正面貼紙為底，用本機 Python／Pillow 重做 `poses/sad.png`、`hold-hat.png`、`hold-rose.png`、`blink.png`，以及 `anim/happy.mp4`、`happy.webm`。沒有使用即夢、生成 API、充值積分，也沒有新裝工具。其他素材保留前輪版本；遊戲尚未引用本資料夾素材。

四張新圖都是 720×720 透明 PNG、正面不露星星。難過保留垂耳、八字眉與難過嘴型，下半身與短手取自官方；高帽依官方平塗高帽重繪，玫瑰取自官方玫瑰。身體 #FFFFFF、外框 #47536F；星星官方色 #F4E969，本次正面不使用。道具有自己的配色，紅帽帶／玫瑰不是腮紅。

開心動畫為 720×720、24 fps、5 秒、120 幀、首尾逐像素相同。官方短手維持原長度，閉嘴笑、輕微搖擺與彈跳。MP4 用 RGB 無損 H.264，淡藍底；WebM 用 VP9 lossless 模式（4:2:0）及透明 alpha；先校正轉色偏差，色碼以解碼後取樣為準，抗鋸齒邊緣仍有混色，實測見 `redraw-validation.json`。MP4 使用 High 4:4:4 Predictive profile，播放端需支援，已通過本機 Chrome 播放與跳轉檢查，Safari／手機尚未驗收。兩檔皆刻意無音軌。

`style-compare.png` 上排官方、下排新素材；`playback-validation.json` 記錄 Chrome 播放結果；`redraw-validation.json` 記錄逐圖色碼、線寬、影片首尾、透明度與無音軌驗證。

重製：使用現有 `/Volumes/外接資料碟/AI工具/fantaco-jimeng-venv/bin/python`（Pillow、numpy、scipy） 跑 `tools/redraw-mascot-assets.py`，再以同一個已安裝 scikit-image 的環境跑 `tools/check-mascot-assets.py`。ffmpeg／ffprobe 預設 `~/media-tools/bin/`。暫存只寫外接碟，腳本結束自動清除。原素材可由 Git 前一版還原，官方貼紙未修改。

前輪保留內容：其他 8 個動作、2 組動畫與 9 個道具仍為即夢生成後去背校色的舊素材。舊動畫 MP4 為 960×960 綠底，左上有「AI生成」標記，WebM 為 720×720 透明底；不代表本輪已重新驗收。
