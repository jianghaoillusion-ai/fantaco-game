VERDICT: FAIL

# 小頌交叉檢查：飛飛表情去背（第 1 次）

審查對象：commit `5db5b1a`（分支 xiaoxia/mobile-fix），起點 `33ada91`。我只量、只看，沒改圖、沒改程式、沒 commit。

## 一句話結論

頭髮、眼睛的破洞補得好，殘片全清，設計沒被改，這些都過。沒過的只有一項：**八張非開心的全身圖（expr），裙襬、腿、鞋子外面還留著一圈細細的藍灰虛線**，和身體之間隔著一條透明縫。這就是「邊緣光暈／藍邊」，要求是消除，所以判 FAIL。核准原圖 `assets/chars/feifei.png` 這項是 0。

小夏報告寫「光暈 → 0」，是因為她的光暈只量頭髮區，裙子和腳沒算進去。數字本身沒造假，但量的範圍不夠。

## 每張數字（我自己量的，修前 → 修後）

量法（不靠參考遮罩，直接量整張圖）：
- 被包住的洞：被實心區域包住、卻透明或半透明的區塊（數量／面積）。
- 內部半透明：離輪廓 3 像素以上、卻不是全實心的像素。
- 殘片：和主體不相連的碎塊（塊數／面積）。
- 邊緣偏藍：輪廓 6 像素內、顏色偏青藍的像素（含水壺本來的藍）。
- 外圈細線：離實心主體 2 像素以上還看得見的像素（就是這次沒過的那一圈）。
- 輪廓周長：越短代表邊越平滑。

| 圖檔（assets/chars/ 下） | 被包住的洞 數/面積 | 內部半透明像素 | 殘片 塊數/面積 | 邊緣偏藍像素 | 外圈細線像素 | 輪廓周長 | 補色像素 | RGB 最大差 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| avatars/feifei-determined.png | 178/7305 → 37/1006 | 13059 → 593 | 39/2272 → 0/0 | 4500 → 254 | 14160 → 22 | 4847 → 2050 | 19691 | 0 |
| avatars/feifei-happy.png | 0/0 → 2/807 | 299 → 0 | 6/9 → 0/0 | 3163 → 339 | 0 → 1 | 2041 → 2000 | 0 | 0 |
| avatars/feifei-sad.png | 195/6634 → 17/869 | 12239 → 3 | 35/5062 → 0/0 | 4843 → 391 | 15444 → 170 | 4259 → 2173 | 16894 | 0 |
| avatars/feifei-surprised.png | 184/6471 → 33/916 | 12553 → 0 | 50/3726 → 0/0 | 5540 → 392 | 13800 → 15 | 4294 → 2093 | 18246 | 0 |
| avatars/feifei-worried.png | 205/6725 → 28/899 | 12659 → 0 | 46/313 → 0/0 | 4907 → 287 | 14657 → 63 | 5412 → 2167 | 19363 | 0 |
| avatars/feifei.png | 0/0 → 6/566 | 227 → 0 | 8/10 → 0/0 | 1903 → 397 | 0 → 0 | 1845 → 1853 | 0 | 0 |
| expr/feifei-determined-open.png | 142/4112 → 24/1644 | 1554 → 1 | 41/1123 → 0/0 | 4172 → 1258 | 9409 → 436 | 7648 → 2628 | 11616 | 0 |
| expr/feifei-determined.png | 142/4112 → 24/1644 | 1554 → 1 | 41/1123 → 0/0 | 4172 → 1258 | 9409 → 436 | 7648 → 2628 | 11616 | 0 |
| expr/feifei-happy-open.png | 0/0 → 4/646 | 0 → 0 | 0/0 → 0/0 | 2277 → 1044 | 0 → 3 | 2217 → 2272 | 0 | 0 |
| expr/feifei-happy.png | 0/0 → 4/617 | 0 → 0 | 0/0 → 0/0 | 2277 → 1004 | 0 → 3 | 2217 → 2273 | 0 | 0 |
| expr/feifei-sad-open.png | 130/3786 → 32/803 | 1543 → 0 | 107/8023 → 0/0 | 3597 → 672 | 8655 → 124 | 4932 → 2873 | 13967 | 0 |
| expr/feifei-sad.png | 170/3234 → 29/1274 | 1309 → 5 | 29/2149 → 0/0 | 4036 → 1104 | 9672 → 226 | 5060 → 2845 | 9753 | 0 |
| expr/feifei-surprised-open.png | 162/3317 → 47/961 | 1476 → 0 | 44/2632 → 0/0 | 4538 → 1162 | 10010 → 235 | 4987 → 2871 | 9911 | 0 |
| expr/feifei-surprised.png | 162/3317 → 47/961 | 1476 → 0 | 44/2632 → 0/0 | 4538 → 1162 | 10010 → 235 | 4987 → 2871 | 9911 | 0 |
| expr/feifei-worried-open.png | 173/3428 → 51/1277 | 1309 → 0 | 21/1842 → 0/0 | 4464 → 1301 | 10758 → 340 | 5474 → 2840 | 10579 | 0 |
| expr/feifei-worried.png | 173/3428 → 51/1277 | 1309 → 0 | 21/1842 → 0/0 | 4464 → 1301 | 10758 → 340 | 5474 → 2840 | 10579 | 0 |

怎麼讀這張表：
- 殘片：16 張全部歸零。過。
- 洞：大洞都補起來了。修後剩下的 17～51 個小洞，我逐張標出來看過，全在外側髮尾的髮絲縫隙（原本是青藍底、現在變透明），不在眼睛和臉上。開心版和頭像原版「0 → 2～6 個洞」也是同一件事：把髮絲縫裡的青藍底清成透明，不是挖掉頭髮。可接受。
- 內部半透明：一萬多 → 0～5（只有 avatars/feifei-determined 還剩 593，放大看是瀏海邊的細點，手機尺寸看不出來）。
- 邊緣偏藍：頭髮區剩下的幾乎都是水壺本來的藍色，不算瑕疵。expr 剩 670～1300 裡有一部分是裙襬和鞋邊的藍灰線，這就是沒過的那項。
- 外圈細線：expr 非開心八張還剩 124～436 像素；avatars/feifei-sad 剩 170（右邊髮緣一條直的藍灰線，位置約 x488～490、y205～259）；avatars/feifei-worried 剩 63。開心版和頭像原版是 0～3。
- 輪廓周長：破圖的幾張從四千到七千多降到兩千多，邊緣平滑很多。

## 設計一致性

- RGB：原本看得見的像素（alpha > 0）修前修後 RGB 最大差是 0，16 張都一樣。我另外跑了指定的 `mobile1-rgb-check.py`，結果「比對 16 個改過的圖檔；全部不透明像素 RGB 基本不變」。repo 裡的 `rgb-check.py` 和指定腳本逐字相同。
- 補洞顏色：頭髮、髮夾、背帶的洞取自對齊後的核准圖，絕大部分和核准圖同位置顏色完全一樣；沒有任何補色落在核准圖輪廓外面。眼睛的洞用周圍原本的深棕色補，平均色約 (65,44,35)，和核准圖瞳孔的深棕接近。
- 形狀：頭型、髮型輪廓對得上核准圖，沒有多長出東西。
- 五官表情：眉毛、眼睛高光、淚珠、嘴型都還是各自表情原本的樣子，沒有被開心版蓋掉。
- 原尺寸看（540×720 不放大）六個表情都自然，看不出貼補。
- 放大 7 倍才看得到的小毛病（不擋關）：瞳孔上半部有幾塊灰藍色的色塊，像拼貼的多邊形；瀏海和臉的交界有一點深色虛線。原因是原圖那些半透明像素本來顏色就髒，補回不透明後露出來。

## 沒動到的東西

- 這個 commit 除了 16 張飛飛 PNG 和 `review/mobile-fix/feifei-fix/` 之外，沒有任何檔案變動。CSS、JS、其他角色、綠色可交付框、米色圓形底都沒碰（那兩個是 CSS 畫的，CSS 零改動）。
- `assets/chars/feifei.png`、`feifei.webp` 沒動。飛飛表情沒有 webp 版本，不用同步。
- determined、surprised、worried 的閉嘴和張嘴圖在起點就是同一張，修後也還是同一張。這是舊有狀況，不是這輪造成的。

## 證據真實性

- `counts.json` 裡每張的補色像素數、脫離碎塊數（修前、修後）和我獨立量的完全一致。
- `repair.py` 是從 git 起點讀圖重算，裡面有強制檢查「原本看得見的像素 RGB 不准變」。
- 前後對照圖和 22 張 390×844 遊戲截圖都在。遊戲截圖是整頁縮圖，飛飛很小，看不出這次抓到的外圈細線。
- 報告裡寫的「小頌第二輪只讀交叉檢查通過」是協作橋上的目視檢查，當時沒辦法跑 Python。這份才是有實際量測的審查，兩者結論不同以這份為準。

## PR 與 main

- PR #7：OPEN、仍是 draft，head 是 `5db5b1a`。
- origin/main 停在 `22a7d6d`（今天 12:55 合併 PR #5），是起點 `33ada91` 的祖先，這輪之後沒有新 commit。

## 問題（要修才能過）

1. expr 八張非開心圖（determined、sad、surprised、worried 的閉嘴和張嘴）：裙襬、腿、鞋子外圍殘留一圈 1 像素左右的藍灰虛線，顏色約 (40,60,70)、alpha 約 165～195，和身體之間有透明縫。放大 2 倍在米色底和草綠底上都看得到。
2. avatars/feifei-sad.png 右邊髮緣一條 170 像素的藍灰直線；avatars/feifei-worried.png 也有 63 像素同類殘留。頭像顯示很小，影響輕，但一起清掉。

## 建議

- 把「去藍邊」的範圍從只限頭髮，擴到整個外輪廓：凡是離實心主體 2 像素以上、又和主體隔著透明縫的細線，alpha 歸零。水壺在身體裡面，不會被這條規則動到。只改 alpha，不碰 RGB。
- 清掉外圈後，腿和裙襬的深色描邊有幾段會斷斷續續（舊去背時就弄壞了）。這屬於補描邊，可以照補頭髮的方式從核准圖取色補，或這輪先不處理、在報告裡列明。
- counts 請加一欄全身範圍的外圈細線像素數，不要只報頭髮區的光暈。
- 眼睛的灰藍色塊若要順手處理：眼睛橢圓範圍內、原本半透明又偏灰藍的像素，改用周圍深棕色。這會動到原本看得見的像素 RGB，要先問過我的王，不然就維持現狀。

## 我的放大圖（repo 相對路徑，都在 `review/mobile-fix/feifei-fix/xiaosong/`）

沒過的證據：
- `review/mobile-fix/feifei-fix/xiaosong/legs-2x-expr-feifei-worried.png`（腿和裙襬 2 倍，米色底／草綠底）
- `review/mobile-fix/feifei-fix/xiaosong/close-shoe8x-expr-feifei-sad-open.png`（鞋子 8 倍）
- `review/mobile-fix/feifei-fix/xiaosong/close-hem-shoes-expr-feifei-sad-open.png`（修前｜修後｜核准圖）
- `review/mobile-fix/feifei-fix/xiaosong/outer-ring-marked-feifei-worried.png`、`outer-ring-marked-feifei-sad-open.png`、`outer-ring-marked-feifei-happy.png`（紅色標出外圈殘留；開心版幾乎沒有）
- `review/mobile-fix/feifei-fix/xiaosong/close-ring-avatars-feifei-sad.png`

有過的證據：
- `review/mobile-fix/feifei-fix/xiaosong/zoom-eyes-1.png`～`zoom-eyes-4.png`（每張眼睛：修前｜修後桃紅底｜深底｜米色底）
- `review/mobile-fix/feifei-fix/xiaosong/zoom-hairL-1.png`～`4`、`zoom-hairR-1.png`～`4`（左右髮緣）
- `review/mobile-fix/feifei-fix/xiaosong/head-magenta-*.png`、`head-beige-*.png`（頭部：修前｜修後｜核准圖或改動圖）
- `review/mobile-fix/feifei-fix/xiaosong/changemap-*.png`（綠＝補色、藍＝補回不透明、紅＝清掉、橘＝邊緣調淡）
- `review/mobile-fix/feifei-fix/xiaosong/residual-*.png`（綠＝剩下的洞、黃＝剩下的偏藍邊）
- `review/mobile-fix/feifei-fix/xiaosong/native-1x-expr-heads.png`（原尺寸六個表情）
- `review/mobile-fix/feifei-fix/xiaosong/close-eyeR-expr-feifei-sad-open.png`、`close-eyeR-avatars-feifei-worried.png`、`close-face-avatars-feifei-determined.png`（放大才看得到的小毛病）

## 收尾

暫存資料夾已刪。沒開 Photoshop／Illustrator，沒用 AppleScript，沒碰其他 worktree。xiaosong 資料夾只放檔案，沒有 git add。
