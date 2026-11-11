# cast8 來源與做法

起點：`f346cdf812654a2ccf72deed89a8337995c30f81`，只修改 `xiaoxia/cast-redraw-v2`。
原設定固定為 `525ab99f5d635f75cf3553877422fa018a81d35f`（本次 `origin/main`）：`assets/chars/jiejie.png`（blob `bca4ed4020573b594fade62279678bc1828a18b9`）、`assets/chars/spirit.png`（blob `442d3d5d7e95cd62e491c9374f049ef00a30ce99`）。合成使用這兩張在 f346cdf 的去背版本；精靈袖口另直接從上述原設定補回深色像素。

哈特指定 `5b125dc:assets/chars/hate.png`，本輪 PNG/WebP 都完全不寫入。布魯使用本分支未修改的 `assets/chars/bulu.png`。

精靈：原圖身體／舉手等比 0.91；頭髮與耳朵等比 1.575；原臉獨立等比 1.55；皇冠等比 1（沒有縮放），相對 f346cdf 上移 29 px。袖口補回原黑線後，以 4 倍解析度描回 1.75 px 深色線再縮回。最終腳底 y685，皇冠頂 y11，沒有裁到畫布上緣。放大頭髮後會遮住部分皇冠白底座，未宣稱所有原可見帽子像素都仍可見。

姐姐：先用本機等比圖層試排（原臉 1.8 倍、頭髮與身體分開），再用 Codex 內建 image_gen 修正衣服與髮尾拼接。生成結果有重繪髮絲、衣服與鞋帶細節，**不是整張只做像素縮放**。將生成圖等比 0.489 放回 540×720，留下 `source/jiejie-seam-repair.png` 作為可重現的修補素材。頭髮圖層再等比 0.91，原設定臉以 1.8 倍覆回；脖子、髮尾接合帶用局部混合，衣服留在身體圖層，腳底對齊 y685。

上述所有幾何縮放的 x/y 倍率相同；沒有非等比拉伸。局部接縫混合與內建生圖修補會改變像素，不宣稱只縮放。

全程只用 Codex 內建 image_gen 與本機 Pillow/numpy/OpenCV。沒有即夢、即夢點數、付費 API、AppleScript 控制 Chrome。小頌只交叉檢查，沒有畫圖。

## 內建生圖提示（唯一一次）

Use case: precise-object-edit. Edit image 1, a rough resized composite of the exact character in image 2. Image 2 is identity and costume reference ONLY. Produce ONE full body transparent sprite, same framing and layout as image1: her face and head position/size, feet position, eyes nose smile hair bangs pink ribbon must remain exactly image1, same raised open right hand and left hand on hip. Repair ONLY obvious compositing seams at waist/skirt and hair/neck/shoulders to look like a single coherent illustration. Fill missing tiny costume joins, reconnect clean dark outlines. Remove doubled fragments near hand and artificial horizontal line across skirt. The costume must remain precisely this pink ruffled dress, pink striped knee socks, white sneakers, wristwatch and original hairstyle. Do not change head size or body length. Do not add props, do not redesign dress. Preserve the original rendering style. Keep face/head from image1 unchanged. Feet baseline 95% down picture, no cropping. Transparent RGBA background, no shadow, no text.

生成原檔尺寸 1086×1448；後續只作等比縮放、圖層合成。修補素材是重現輸入，屬交付證據，保留在 repo；其他試作與下載原檔於交付前刪除。

## 重現

設定 TMPDIR 為外接碟上的暫存目錄，執行：

```
PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/cast8/build_cast8.py
PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/cast8/inspect_cast8.py
```

第二支程式會驗證哈特零像素差、其他四人未變、PNG/WebP 解碼一致、尺寸與腳底、硬邊與碎點，並重新輸出全部指定審查圖及暫測表。

量測限制：小頌 cast7 已定案的布魯／哈特基準照原報告列出；新圖採相同的解剖位置定義，但臉髮遮罩仍為小夏的暫測實作。小頌的第一版程式沒能在協作橋實跑；代跑時發現預設原圖會讀到當前 assets、下巴標記位置錯誤、基準色彩遮罩與 cast7 不合。未校準結果不當成驗收通過。
