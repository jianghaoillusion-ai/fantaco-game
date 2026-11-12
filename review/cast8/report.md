# cast8 第 2 輪（最後一輪）報告：未全部通過

## 回應小頌第1輪的每一點

1. 精靈髮量：髮層改為1.565、臉獨立1.65；採小頌原程式重量，主要四項落在±5%。皇冠仍為原尺寸，不縮帽子湊數字。
2. 姐姐瀏海、精靈皇冠底座破洞：已填補。前後白底／深底／透明度見新增的修補圖。原退件的瀏海3×8px及皇冠12px破洞已不在holes.py的清單。
3. 姐姐頭部面積／髮量：髮層0.84、臉1.885，補回原設定右耳（獨立1.6倍）。本輪頭部面積與下巴以上髮量進入±5%，髮量仍距上限較近；不宣稱各種分割算法都會通過。
4. 精靈袖口細縫、手腕透空彎線：已補成實心，外側描邊連續。原列出的各袖口群組在128與200兩門檻都消失。剩下(326,384)附近是另一側手臂與身體間的空隙，不是舉手袖口。
5. 姐姐大喇叭袖、粗短腿與原設定不同：**尚未修回**。本輪沿用上一輪重畫身體，不能宣稱完全保留原服裝細節。
6. 姐姐含長髮髮量：**仍超過5%**，與下巴以上髮量分列；沒有自行把長髮要求當成豁免。
7. 遊戲expr／avatars：**未修改、未驗遊戲畫面**。本輪只同步指定全身PNG/WebP，不能宣稱遊戲各畫面已換圖。

本輪接在dc305f3（小頌第1輪審查提交）之後，沒有重設或重寫歷史；整個PR原起點f346cdf。PR #5維持draft，只推xiaoxia/cast-redraw-v2，不merge、不推main、不碰PR #4。

## 使用的原設定檔案

- `525ab99f5d635f75cf3553877422fa018a81d35f:assets/chars/jiejie.png`、`525ab99f5d635f75cf3553877422fa018a81d35f:assets/chars/spirit.png`：指定origin/main原設定。
- `f346cdf:assets/chars/jiejie.png`、`f346cdf:assets/chars/spirit.png`：上述原設定去背／對齊版本，供圖層合成。
- `review/cast8/source/jiejie-seam-repair.png`：第1輪免費Codex內建生圖修補來源。本輪沒有再次生成。
- `assets/chars/bulu.png`：未改的量測標準。
- `5b125dc:assets/chars/hate.png`：哈特逐像素不變的核對基準。

各圖層x/y倍率一致，沒有非等比拉伸。臉、頭髮、耳朵分開縮放與位移，不宣稱整個頭等比例縮放。姐姐耳朵與臉的比例／位置已有局部調整；歪頭延續原設定，未另轉正，保留原姿勢與「站正」的要求仍有判讀差異。

## 和布魯的逐項數字

# cast8 暫測數字（尚未驗收）

第2輪：布魯、姐姐、精靈使用小頌 final-scripts/meas.py（CLOSE=15、EARD=2）；哈特數值沿用cast7，但差距統一按本輪布魯重算。飛飛、阿飄、西卡沿用cast7未重驗。頭部髮量與全部長髮分開列。

|項目|布魯基準|姐姐暫測（差距）|哈特定稿（差距）|精靈暫測（差距）|
|---|---:|---:|---:|---:|
|頭身比|0.3305|0.3219（-2.60%）|0.3311（+0.16%）|0.3351（+1.39%）|
|臉寬|134|140（+4.48%）|137（+2.24%）|130（-2.99%）|
|含髮頭寬|204|197（-3.43%）|194（-4.90%）|234（+14.71%）|
|頭部面積|32965|31866（-3.33%）|32626（-1.03%）|31533（-4.34%）|
|髮量：下巴以上|15088|15776（+4.56%）|15562（+3.14%）|15143（+0.36%）|
|髮量：含長髮|15088|24657（+63.42%）|15562（+3.14%）|15143（+0.36%）|
|肩全寬含袖|161|328（+103.73%）|無法量測|205（+27.33%）|
|右肩單邊|83|130（+56.63%）|83（+0.00%）|105（+26.51%）|
|身長|147.5|142.5（-3.39%）|149.5（+1.36%）|107.5（-27.12%）|
|腿長|214|無法量測|223（+4.21%）|139（-35.05%）|
|總高不含配件|655|643（-1.83%）|657（+0.31%）|558（-14.81%）|
|總高含配件|655|666（+1.68%）|663（+1.22%）|680（+3.82%）|
|頭高|216.5|207（-4.39%）|217.5（+0.46%）|187（-13.63%）|
|腰到腳底|291|293.5（+0.86%）|290（-0.34%）|263.5（-9.45%）|

臉寬定位（最寬列）：姐姐 y169、x[195, 334]；精靈 y243、x[204, 333]。見 landmarks 圖。

扣除耳朵區域及5px邊界的含髮頭寬暫測：姐姐 197 px，精靈 211 px；布魯基準 204 px。耳緣標記仍有誤差，不用這項宣稱通過。


精靈臉部面積約比布魯少22%，耳朵面積較大；頭部面積通過不代表臉面積也接近。精靈含耳頭寬仍超過5%，扣耳頭寬211（+3.43%）。完整分區數字見reviewer-measurements-r2.json。

## 哈特、原臉與邊緣核對

哈特PNG對5b125dc為0個RGBA像素差異，PNG/WebP檔案對f346cdf不變。布魯、飛飛、阿飄、西卡也全都未改。
兩人PNG是透明RGBA 540×720，腳底alpha≥128在y685，WebP解碼與PNG逐像素相同。姐姐／精靈硬切邊像素0，alpha>0都只有1個連通塊，沒有分離碎點。哈特既有39個硬切像素及3個極淡小塊依「一像素不改」保留。
姐姐原臉核心13071px、精靈11774px對各自等比縮放來源RGB差異0。這不涵蓋最外圈髮臉接縫，不把統計通過當成每一個邊緣都完美。
皇冠原尺寸、同倍率1.0，只位移；邊緣去背／平滑有改像素，不宣稱帽子逐像素不變。

補洞程式已依小頌提醒排除外部背景與1px柔邊，沒有把整個方框塗成實心。holes-r2.json列兩個門檻的修補前後所有群組（面積,x,y,寬,高,最低alpha）。角色手臂與身體間的真實空隙、長髮縫仍會被封閉洞偵測列出，不把所有群組冒稱瑕疵或全部清空。

## 小頌交叉檢查

小頌僅審查，沒有生圖或改檔。他這次協作橋環境不能實跑Python，因此只有圖面／程式檢查，並非獨立像素驗收。第一則意見見xiaosong-review-r2-not-final.md；其中補洞範圍和耳朵覆臉問題已處理，原臉核心差異重新驗為0。

## 沒做到的

姐姐服裝袖型、腿部原設定細節尚未修回；含全部長髮髮量仍不符±5%；遊戲expr/avatars未同步，未做遊戲端驗收；小頌尚未獨立重跑最終像素。七人圖其他三人的數字沿用cast7，不稱為本輪重驗。這輪不算全部完成或可發布。

## review內每張圖的完整相對路徑

- `review/cast8/before-after-jiejie.png`
- `review/cast8/before-after-spirit.png`
- `review/cast8/chin-4x-jiejie.png`
- `review/cast8/chin-4x-spirit.png`
- `review/cast8/cmp-seven.png`
- `review/cast8/edges-hate.png`
- `review/cast8/edges-jiejie.png`
- `review/cast8/edges-spirit.png`
- `review/cast8/jiejie-cheek-source-4x.png`
- `review/cast8/jiejie-ear-r2.png`
- `review/cast8/jiejie-fingers-4x.png`
- `review/cast8/jiejie-fringe-repair-r2.png`
- `review/cast8/jiejie-left-cheek-4x.png`
- `review/cast8/jiejie-neck-4x.png`
- `review/cast8/jiejie-right-fringe-4x.png`
- `review/cast8/jiejie-right-neck-4x.png`
- `review/cast8/landmarks-jiejie.png`
- `review/cast8/landmarks-spirit.png`
- `review/cast8/mask-jiejie-ears.png`
- `review/cast8/mask-jiejie-face.png`
- `review/cast8/mask-jiejie-hair-all.png`
- `review/cast8/mask-jiejie-hair.png`
- `review/cast8/mask-jiejie-head.png`
- `review/cast8/mask-jiejie.png`
- `review/cast8/mask-spirit-crown.png`
- `review/cast8/mask-spirit-ears.png`
- `review/cast8/mask-spirit-face.png`
- `review/cast8/mask-spirit-hair-all.png`
- `review/cast8/mask-spirit-hair.png`
- `review/cast8/mask-spirit-head.png`
- `review/cast8/mask-spirit.png`
- `review/cast8/overlay-hate-vs-blue.png`
- `review/cast8/overlay-jiejie-vs-blue.png`
- `review/cast8/overlay-spirit-vs-blue.png`
- `review/cast8/source/jiejie-seam-repair.png`
- `review/cast8/spirit-crown-4x.png`
- `review/cast8/spirit-crown-repair-r2.png`
- `review/cast8/spirit-cuff-repair-r2.png`
- `review/cast8/spirit-cuff.png`
- `review/cast8/spirit-face-width-4x.png`
- `review/cast8/xiaosong/cmp-seven.png`
- `review/cast8/xiaosong/edges-hate.png`
- `review/cast8/xiaosong/edges-jiejie.png`
- `review/cast8/xiaosong/edges-spirit.png`
- `review/cast8/xiaosong/overlay-hate-vs-blue.png`
- `review/cast8/xiaosong/overlay-jiejie-vs-blue.png`
- `review/cast8/xiaosong/overlay-spirit-vs-blue.png`

xiaosong/子目錄圖是第1輪審查記錄，保留不覆蓋；本輪新版在review/cast8/根目錄。所有指定10張審查圖齊全。

## 範圍、清理及備份

本輪只用本機免費Pillow/numpy/OpenCV，沒有即夢、點數、付費服務或AppleScript控制Chrome。沒有觸碰photo-live-beauty、threads-revival程序／資料夾，沒有碰fantaco-jimeng或PR #4。未開Photoshop／Illustrator。暫存在外接碟TMPDIR；提交前清除本輪暫存與Python快取。
這是未驗收的draft修正，不建完成版tag或Drive安裝包；本次依要求只推同一分支。


第2輪內再檢查：小頌指出耳髮交界硬邊、舊耳上緣及袖口內線模糊，已改柔邊、清舊耳膚色、補回1.5px內側深線。原臉核心像素重新比對仍0差異。Photoshop／Illustrator pgrep無輸出。


## 最後圖面複查與數字補證

小頌最後圖面檢查確認耳髮交界硬邊與手腕內線修復，舊耳碎片在圖中已不可見；保留六倍放大可見的描邊凹凸與極淡色暈觀察，不把它稱為完美。全文見 `review/cast8/xiaosong-final-r2.md`。
補充實跑 `review/cast8/final-check-r2.json`：舊耳露出區x327～333/y118～125，膚色殘點0；精靈alpha>0只有1個連通塊；holes.py在128與200門檻都沒有舉手袖口破洞，唯一剩餘群組在另一側手臂與身體間。不是小頌獨立跑出的數字。

清理結果：本輪建立的TMPDIR檔與__pycache__已移除；TMPDIR開工前已有的兩個隱藏.tmp檔保留，沒有擅刪其他工作階段的檔案。Photoshop／Illustrator pgrep確認無輸出。
