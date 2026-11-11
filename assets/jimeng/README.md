# 即夢素材（眠花糖）

用即夢（Seedream 5.0 Pro／Seedance 2.0 mini）依官方貼紙生成，再在本機去背、校色。AI 生成素材，尚未經我的王逐張確認，遊戲程式目前沒有引用。

- `poses/`：12 個動作，透明背景 PNG。揮手 wave、跳 jump、開心 happy、難過 sad、驚訝 surprised、歡呼 cheer、睡覺 sleep、指向 point、拿東西 hold-balloon／hold-hat／hold-rose，另加眨眼 blink。
- `anim/`：短動畫 3 支（待機彈跳 idle-bounce、眨眼 blink、開心 happy），各 5 秒、首尾同一幀可循環。`.mp4` 是即夢原檔（綠底 960×960，左上有「AI生成」標記，已去掉音軌）；`.webm` 是本機去背的透明版（VP9 720×720，已校回官方色）。
- `props/`：9 個官方風格周邊道具，透明背景 PNG。
- `style-compare.png`：官方貼紙和新素材並排，附身體／線條／星星色碼比對。

官方色：身體 `#FFFFFF`、線條 `#47536F`、星星 `#F4E969`。參考圖只用 `assets/mascot/sticker/` 與 `assets/items/` 裡的官方貼紙。
