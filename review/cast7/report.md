# cast7 第 2 輪修正報告（未全數通過）

## 回應小頌第 1 輪的每一點

1. 姐姐、精靈比例未調：仍未完成。已詢問我的王是否允許臉與頭髮分開縮放、皇冠縮小；尚未收到答覆，沒有擅自改原頭形或降低 ±5% 門檻。這輪不宣稱通過。
2. 青藍背景殘色：已清理兩人的外圈與封閉空隙，保留精靈袖口、寶石等原有青藍配色；新增清理前後圖與差異遮罩。清掉鞋底殘色後各下移 2 px，使腳底回到 y685。
3. 原臉／髮型與全部比例的衝突：仍存在。詳見下方實測表與 feasibility.md；不是只把頭放大就能同時符合，沒有改量測定義湊過關。
4. 精靈高皇冠：未縮小、未裁切；連同比例改造待使用者決定。
5. 姐姐腿長被裙子遮住：繼續標「無法驗證」，沒有拿腰到腳底冒充腿長。
6. 上輪未另外驗的事項：這輪重新確認另外四位角色及哈特 PNG/WebP 與 4ae74fc 逐像素相同；三張 PNG/WebP 解碼一致。完整遊戲畫面仍未驗收。

哈特沿用第1輪通過的修邊，這輪一個像素都沒再動。保留原本髮緣前後放大與差異遮罩；不因清殘點改到指定髮緣之外。

## 實際來源

原設定 commit `525ab99f5d635f75cf3553877422fa018a81d35f`：

- `assets/chars/jiejie.png`，blob `bca4ed4020573b594fade62279678bc1828a18b9`。
- `assets/chars/spirit.png`，blob `442d3d5d7e95cd62e491c9374f049ef00a30ce99`。

這輪實際像素只讀上述原圖，沒有用更早版本或 cast5/cast6 姐姐、精靈新姿勢。
上一輪讀過、這輪未重新取用的同 commit 表情／頭像參考：`assets/chars/avatars/jiejie.png`、`assets/chars/avatars/spirit.png`、`assets/chars/expr/jiejie-happy.png`、`assets/chars/expr/jiejie-happy-open.png`、`assets/chars/expr/spirit-happy.png`、`assets/chars/expr/spirit-happy-open.png`。
哈特修邊前與布魯基準為 `78bb5adcc143f7f433c46d1992067bb01f3a6a34:assets/chars/hate.png`、同 commit 的 `assets/chars/bulu.png`。
本輪起點 `4ae74fc`，哈特維持該版本。

## 邊緣與同步檢查

全部透明 RGBA PNG 540×720、腳底 alpha≥128 最下列 y685；三張 WebP 無損且解碼與 PNG 完全相同。

|角色|邊緣半透明比例|硬邊像素|alpha≥128 小於8px碎塊|
|---|---:|---:|---:|
|姐姐|99.99%|0|0|
|哈特|66.98%|39|0|
|精靈|99.74%|0|0|

邊緣帶為 alpha≥128 輪廓的 3×3 膨脹減侵蝕；半透明定義 alpha 1–254。硬邊是 255 直接接到 0（含斜角）。哈特 39 px 硬邊在本輪前就存在，並非新產生；遵照定案不再擴大修圖區域。哈特右髮既有修復區外差異仍為 0。
已查看清理前後全圖、姐姐與精靈邊緣放大、七人圖。沒有分區接合，所以沒有新接縫；比例工作尚未完成。色相判斷不是「所有青色都是背景」：精靈原袖口與飾品的青藍色保留。不能把半透明比例當作整張圖品質已過關。

## 和布魯逐項數字（差距%）

本次是原設定還原基準，不是比例調整完成版。頭身比＝不含配件頭高／不含配件總高。

|項目|布魯|姐姐（差距）|哈特（差距）|精靈（差距）|
|---|---:|---:|---:|---:|
|頭身比|0.3308|0.2111（-36.18%） 超標|0.3328（+0.61%）|0.2338（-29.31%） 超標|
|頭高|217|133（-38.71%） 超標|219（+0.92%）|123（-43.32%） 超標|
|臉寬|133|70（-47.37%） 超標|137（+3.01%）|81（-39.10%） 超標|
|頭部外寬含耳|204|146（-28.43%） 超標|197（-3.43%）|153（-25.00%） 超標|
|頭部外寬扣耳區（含2px線寬）|204|146（-28.43%） 超標|197（-3.43%）|無法驗證|
|頭部面積|32965|15224（-53.82%） 超標|32284（-2.07%）|12892（-60.89%） 超標|
|髮量含可見長髮|16412|14791（-9.88%） 超標|15725（-4.19%）|7206（-56.09%） 超標|
|肩位可見外輪廓全寬，含手臂|160|275（+71.88%） 超標|217（+35.62%） 超標|208（+30.00%） 超標|
|可分辨的雙肩寬|160|無法驗證|無法驗證|無法驗證|
|身長：下巴至腰|146|105（-28.08%） 超標|148（+1.37%）|116（-20.55%） 超標|
|腿長|214|無法驗證|223（+4.21%）|201（-6.07%） 超標|
|總高：不含配件|656|630（-3.96%）|658（+0.30%）|526（-19.82%） 超標|

姐姐髮量接近基準只發生在未縮放的原尺寸；若長髮隨頭放大1.45倍，該面積會乘2.1025，不能當縮放後通過。右側未舉手的半肩寬另列下方，不把它鏡射當雙肩通過。

|右側半肩寬（下巴+34列）|布魯|姐姐|哈特|精靈|
|---|---:|---:|---:|---:|
|像素|83|111（+33.73%）|84（+1.20%）|104（+25.30%）|

精靈扣耳頭寬無法驗證：耳朵遮罩未完整包住耳尖，不用尚含耳尖的156或149當扣耳數字。該格不參與可行性判斷。

肩寬：舉手或手臂遮蔽時不使用鏡射補成合計。姐姐裙下腿根無法直接看見；精靈及布魯胯點仍有衣物判讀誤差。臉與髮面積採同一色差演算法，但受陰影影響；請搭配遮罩圖，不能把四位小數當量測精度。哈特帽下遮蔽頭髮不補畫。

## 比例限制證據

等比縮放：長度乘 s、面積乘 s²。頭身比和總高都允許±5%，因此頭高允許布魯頭高的 0.95² 至 1.05²；以下採這個較寬鬆範圍。

|角色|頭身比＋總高允許 s|頭部面積允許 s|臉寬允許 s|頭部外寬含耳允許 s|髮量允許 s|頭高與面積交集|
|---|---|---|---|---|---|---|
|微笑姐姐|1.4725–1.7988|1.4342–1.5078|1.8050–1.9950|1.3274–1.4671|1.0267–1.0794|有|
|氣球精靈|1.5922–1.9451|1.5586–1.6386|1.5599–1.7241|1.2667–1.4000|1.4709–1.5464|有|

這是目前可見像素遮罩下的幾何檢查；沒有假設配件算頭，也沒有用改頭型湊數字。姐姐長髮另計入髮量，裙子遮蔽不補估。姐姐的兩個允許區間只差約0.006，少量標註誤差可能改變是否相交，不能僅憑這一項宣稱數學上絕對無解；可見長髮量與臉寬仍另有限制。要同時達標，需要放寬原頭形／等比縮放／部分比例門檻之一。精靈修正白色冠底遮罩後，頭高與面積兩項已有交集；臉寬可與該交集相容；必要項目髮量的區間則不相交，不能沿用舊的兩項無交集結論。頭高區間只是必要條件，交集非空也不代表整個人可行。姐姐的臉寬與面積區間已有明顯衝突，不依靠0.006的邊界差。精靈高皇冠另有畫布空間衝突。未經使用者決定，不做此類造型改動。

## review 圖片完整相對路徑

- `review/cast7/background-cleanup-jiejie.png`
- `review/cast7/background-cleanup-spirit.png`
- `review/cast7/background-diff-jiejie.png`
- `review/cast7/background-diff-spirit.png`
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
- `review/cast7/xiaosong/cmp-seven.png`
- `review/cast7/xiaosong/edges-hate.png`
- `review/cast7/xiaosong/edges-jiejie.png`
- `review/cast7/xiaosong/edges-spirit.png`
- `review/cast7/xiaosong/overlay-hate-vs-blue.png`
- `review/cast7/xiaosong/overlay-jiejie-vs-blue.png`
- `review/cast7/xiaosong/overlay-spirit-vs-blue.png`

## 沒做到的與重現

姐姐／精靈分區縮放、所有比例差距 ≤5%、皇冠取捨、完整遊戲畫面驗收未完成。七人圖前三位仍沿用既有標註，沒有可靠的獨立髮量，不冒填數字。專案未結案，不建立完成版 tag／Drive 安裝包。
重現：`PYTHONDONTWRITEBYTECODE=1 ~/media-tools/venv/bin/python review/cast7/build_cast7.py` 後執行 `review/cast7/validate_cast7.py`，TMPDIR 必須指向外接碟。
只用本機 Pillow/numpy/OpenCV；未使用即夢、付費生圖、AppleScript 控制 Chrome。未碰 PR #4、fantaco-jimeng、photo-live-beauty 程序。只提交與推送 xiaoxia/cast-redraw-v2，PR #5 保持 draft、不 merge、不推 main。

## 第2輪交叉檢查與補充證據

小頌只做唯讀檢查，紀錄 `review/cast7/xiaosong-review-r2.md`。他確認 assets 只有姐姐與精靈四個檔案改動；縮圖沒有明顯青色殘邊，但審查環境不允許執行 Python，所以不是獨立像素驗收通過。
他審查期間本機仍在補修，指出的位移紀錄及差異遮罩問題已修正：build 重跑會輸出 [0,2]/[0,5]，差異圖先對齊再比。已實際重跑 build 和 validate，非只推測。
新增 `review/cast7/audit_cleanup.py` 與 `review/cast7/cleanup-audit.json`；`background-cleanup.json` 列出每一個被刪連通塊的位置、面積與原 alpha 上限，以及 fringe 清理明細。

補查數字：非青色實心區往內縮3px後，兩人的改動像素都是0。非青色實心像素降至alpha<128：姐姐5px、精靈20px；其中RGB改動3px／19px均因邊緣碎點被清為透明，沒有非青色實心像素被換成另一個不透明顏色。位置逐塊列在 cleanup-audit.json。姐姐最大獨立塊15px在原圖x340–342/y126–130（髮緣外側），最高alpha185；精靈被清獨立塊最高alpha62。精靈另清13個實心微小碎塊及附近半透明，共133px，位於舉手側袖口外緣，明細已保存。
剩下青色色相區也逐塊列出，不把精靈青藍袖口／飾品冒稱背景殘色。這些結果是小夏本機實跑；小頌尚未獨立跑同一固定版本，不能寫互審通過。
本輪未修改 avatars/expr，因此也未宣稱遊戲所有顯示路徑的青邊已處理。

PS／Illustrator 未啟動，pgrep 無輸出。暫存僅使用外接碟 TMPDIR，本輪產生的檔案交付前刪除；未清理其他程序的隱藏暫存目錄。
