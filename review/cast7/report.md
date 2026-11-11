# cast7 部分交付紀錄

尚未完成全部需求；姐姐／精靈原圖的青色外緣尚未清理。哈特局部髮緣修復、姐姐／精靈原設定回復、腳底對齊與審查圖已完成；姐姐／精靈比例調整尚未做，正等待原設定與比例門檻的優先順序。不能把本版當成比例驗收通過版。

## 實際來源

像素來源為 `525ab99f5d635f75cf3553877422fa018a81d35f`（本次 origin/main）：

- `assets/chars/jiejie.png`，blob `bca4ed4020573b594fade62279678bc1828a18b9`。
- `assets/chars/spirit.png`，blob `442d3d5d7e95cd62e491c9374f049ef00a30ce99`。

以下六檔也讀自同一個 commit，只供原表情／頭像參考，沒有修改：

- `assets/chars/avatars/jiejie.png`
- `assets/chars/avatars/spirit.png`
- `assets/chars/expr/jiejie-happy.png`
- `assets/chars/expr/jiejie-happy-open.png`
- `assets/chars/expr/spirit-happy.png`
- `assets/chars/expr/spirit-happy-open.png`

哈特來源：`78bb5adcc143f7f433c46d1992067bb01f3a6a34:assets/chars/hate.png`。布魯基準：同 commit 的 `assets/chars/bulu.png`，檔案未改。未用 1fd1aef~1、fc1175a 等更早版本。

姐姐還原後 RGBA 與指定來源完全相同；精靈只下移 3 px，反向對齊後 RGBA 完全相同。本次未新增揮手／攤掌，也沒有新姿勢提案；原設定本身已有舉手。

## 已做與驗證

哈特只改右側髮緣 440 個像素，差異外框 x322–368、y45–170；指定區域外與邊緣帶外差異皆 0。內部髮線、臉、五官、動作、比例保留。細髮尖保留 alpha≥128 連通性，沒有新增孤立碎點。

三張透明 PNG 都是 540×720，alpha≥128 腳底皆 y685。三個 WebP 使用無損、保留透明像素 RGB 重新輸出，解碼後與 PNG 逐像素相同。遊戲 JS、expr 與 avatars 未改；未跑完整遊戲畫面驗收。其餘四位人物的 PNG／WebP 未改。

|角色|邊緣帶像素|alpha 中間值像素|比例|小於 8px 孤立塊|
|---|---:|---:|---:|---:|
|姐姐|7091|5760|81.23%|0|
|哈特|6683|4476|66.98%|0|
|精靈|7325|6272|85.62%|0|

邊緣帶定義：alpha≥128 輪廓的 3×3 膨脹減侵蝕，統計其中 alpha 1–254。哈特指定髮緣由 49.55% 變為 100%；這是窄邊緣帶的覆蓋率，不代表整個頭髮半透明，也不是全圖品質分數。

已抽查三張 edge-detail 和哈特放大對照。姐姐／精靈原圖帶青色外緣，尚未清理，因此「三張沒有殘留背景色、全部無鋸齒」未通過；不拿中間值比例冒充外觀驗收。

## 沒做到的

姐姐與精靈尚未進行分區縮放／接縫重描，所有比例 ≤5% 未達標。姐姐完整腿長與雙肩被原動作／裙子遮蔽，無法直接驗證；數字表另給肩位可見輪廓全寬（含手臂），不能把它當雙肩解剖寬度。精靈皇冠與畫布空間的取捨尚未決定。

七人圖前三位使用既有標註、未獨立標髮量；未知處明寫無法驗證。原設定恢復的前後對照幾乎相同，這是保留像素的證明，不是比例已調好。

既有 cast5／cast6 對照僅保留歷史，不代表目前姐姐／精靈素材。

PR #5 維持 draft，僅推 xiaoxia/cast-redraw-v2，不 merge、不推 main。未操作 PR #4、fantaco-jimeng、photo-live-beauty，未用即夢、付費產圖或 AppleScript 控制 Chrome。只用本機既有 Pillow／numpy／OpenCV；未開 Photoshop／Illustrator。專案尚未結案，未另建立完成版 tag／Drive 安裝包。


哈特修邊前後頭部外寬均197px（對布魯−3.43%），不是靠修邊達標。指定區域比其他邊緣略柔；區外像素完全不動。精靈下移前已確認來源y717–719的alpha全0，沒有裁掉內容。

## 逐項數字

本次是原設定還原基準，不是比例調整完成版。頭身比＝不含配件頭高／不含配件總高。

|項目|布魯|姐姐（差距）|哈特（差距）|精靈（差距）|
|---|---:|---:|---:|---:|
|頭身比|0.3308|0.2104（-36.38%） 超標|0.3328（+0.61%）|0.2330（-29.58%） 超標|
|頭高|217|133（-38.71%） 超標|219（+0.92%）|123（-43.32%） 超標|
|臉寬|133|70（-47.37%） 超標|137（+3.01%）|81（-39.10%） 超標|
|頭部外寬含耳|204|149（-26.96%） 超標|197（-3.43%）|156（-23.53%） 超標|
|頭部外寬扣耳區（含2px線寬）|204|149（-26.96%） 超標|197（-3.43%）|無法驗證|
|頭部面積|32965|16097（-51.17%） 超標|32284（-2.07%）|13509（-59.02%） 超標|
|髮量含可見長髮|16412|15664（-4.56%）|15725（-4.19%）|7823（-52.33%） 超標|
|肩位可見外輪廓全寬，含手臂|160|278（+73.75%） 超標|217（+35.62%） 超標|213（+33.13%） 超標|
|可分辨的雙肩寬|160|無法驗證|無法驗證|無法驗證|
|身長：下巴至腰|146|105（-28.08%） 超標|148（+1.37%）|116（-20.55%） 超標|
|腿長|214|無法驗證|223（+4.21%）|203（-5.14%） 超標|
|總高：不含配件|656|632（-3.66%）|658（+0.30%）|528（-19.51%） 超標|

姐姐髮量接近基準只發生在未縮放的原尺寸；若長髮隨頭放大1.45倍，該面積會乘2.1025，不能當縮放後通過。右側未舉手的半肩寬另列下方，不把它鏡射當雙肩通過。

|右側半肩寬（下巴+34列）|布魯|姐姐|哈特|精靈|
|---|---:|---:|---:|---:|
|像素|83|113（+36.14%）|84（+1.20%）|107（+28.92%）|

精靈扣耳頭寬無法驗證：耳朵遮罩未完整包住耳尖，不用尚含耳尖的156或149當扣耳數字。該格不參與可行性判斷。

肩寬：舉手或手臂遮蔽時不使用鏡射補成合計。姐姐裙下腿根無法直接看見；精靈及布魯胯點仍有衣物判讀誤差。臉與髮面積採同一色差演算法，但受陰影影響；請搭配遮罩圖，不能把四位小數當量測精度。哈特帽下遮蔽頭髮不補畫。

## 等比縮放限制

等比縮放：長度乘 s、面積乘 s²。頭身比和總高都允許±5%，因此頭高允許布魯頭高的 0.95² 至 1.05²；以下採這個較寬鬆範圍。

|角色|頭身比＋總高允許 s|頭部面積允許 s|臉寬允許 s|頭部外寬含耳允許 s|髮量允許 s|頭高與面積交集|
|---|---|---|---|---|---|---|
|微笑姐姐|1.4725–1.7988|1.3948–1.4664|1.8050–1.9950|1.3007–1.4376|0.9977–1.0489|無|
|氣球精靈|1.5922–1.9451|1.5226–1.6007|1.5599–1.7241|1.2423–1.3731|1.4117–1.4842|有|

這是目前可見像素遮罩下的幾何檢查；沒有假設配件算頭，也沒有用改頭型湊數字。姐姐長髮另計入髮量，裙子遮蔽不補估。姐姐的兩個允許區間只差約0.006，少量標註誤差可能改變是否相交，不能僅憑這一項宣稱數學上絕對無解；可見長髮量與臉寬仍另有限制。要同時達標，需要放寬原頭形／等比縮放／部分比例門檻之一。精靈修正白色冠底遮罩後，頭高與面積兩項已有交集；臉寬可與該交集相容；必要項目髮量的區間則不相交，不能沿用舊的兩項無交集結論。頭高區間只是必要條件，交集非空也不代表整個人可行。姐姐的臉寬與面積區間已有明顯衝突，不依靠0.006的邊界差。精靈高皇冠另有畫布空間衝突。未經使用者決定，不做此類造型改動。

## review 圖檔完整相對路徑

- `review/cast7/before-after-hate.png`
- `review/cast7/before-after-jiejie.png`
- `review/cast7/before-after-spirit.png`
- `review/cast7/cmp-seven.png`
- `review/cast7/edge-detail-hate.png`
- `review/cast7/edge-detail-jiejie.png`
- `review/cast7/edge-detail-spirit.png`
- `review/cast7/hate-diff-mask.png`
- `review/cast7/hate-hair-edge.png`
- `review/cast7/mask-bulu-ears-binary.png`
- `review/cast7/mask-bulu-face-binary.png`
- `review/cast7/mask-bulu-hair-binary.png`
- `review/cast7/mask-bulu.png`
- `review/cast7/mask-hate-ears-binary.png`
- `review/cast7/mask-hate-face-binary.png`
- `review/cast7/mask-hate-hair-binary.png`
- `review/cast7/mask-hate.png`
- `review/cast7/mask-jiejie-ears-binary.png`
- `review/cast7/mask-jiejie-face-binary.png`
- `review/cast7/mask-jiejie-hair-binary.png`
- `review/cast7/mask-jiejie-long-hair-binary.png`
- `review/cast7/mask-jiejie.png`
- `review/cast7/mask-spirit-ears-binary.png`
- `review/cast7/mask-spirit-face-binary.png`
- `review/cast7/mask-spirit-hair-binary.png`
- `review/cast7/mask-spirit.png`
- `review/cast7/overlay-hate-vs-blue.png`
- `review/cast7/overlay-jiejie-vs-blue.png`
- `review/cast7/overlay-spirit-vs-blue.png`
