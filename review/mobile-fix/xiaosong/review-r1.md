VERDICT: FAIL

# 小頌交叉檢查：FANTACO 手機修正 mobile1（第 1 次審查）

審查對象：worktree `fantaco-mobile-fix`，分支 `xiaoxia/mobile-fix`，commit `b1c9eb6`，起點 `22a7d6d`，Draft PR #7。
我只讀、只量、只截圖，沒有改圖、改程式、commit、push 或 merge。

**不過的原因只有一項：去背（第 3 項）。** 拖曳、狀態列、PR 規矩都過；震動程式照規格寫了，但 iPhone 實際上多半不會震（小夏有老實寫）。

去背不過的兩個理由：

1. **清殘片時把飛飛的眼睛亮點刪掉了。** `expr/feifei-sad.png` 和 `expr/feifei-sad-open.png` 左眼那顆白色亮點（56 像素、實心、近白色）被當成「小於 100 像素的碎片」清掉，這是改到角色設計。證據：`review/mobile-fix/xiaosong/zoom-feifei-sad-left-eye-highlight.png`。
2. **我的王看到的「淡藍／紫／粉白方塊」沒有被找到，也沒有被修。** 小夏自己也寫了「本地未重現、不能宣稱已解決」。我另外查了所有頭像的歷史版本和 41 張交貨道具圖，都沒有方塊底，所以這一項目前沒有任何證據顯示已經修好。

---

## 逐項結果

### 1. 拖曳：過

我自己用 headless Chromium 390×844、真的觸控事件跑了一輪（改前改後各一次）。

| 檢查 | 改前 22a7d6d | 改後 b1c9eb6 |
|---|---|---|
| 物品位置（手指 y=461.5） | 物品底緣 483.2，蓋在手指上 | 物品底緣 429.2，在手指上方 32.3px |
| 放大 | 1.1 倍 | 觸控 1.2 倍 |
| 可合成格高亮 | 沒有 | 2 格綠底綠框，手指所在格加粗 |
| 觸控合成（星1＋星1） | 變星2 | 變星2 |
| 拖到空格 | 正常 | 正常，落在手指那格 |
| 兩個不同物品交換 | **壞的**（報錯、沒交換） | 正常交換 |
| 拖到交貨框交付 | 正常 | 正常 |
| 拖到無效位置 | 報錯、浮圖殘留 | 彈回、棋盤不變、無殘留 |
| 觸控取消 | 棋盤被改動 | 棋盤不變、高亮清乾淨 |
| 滑鼠拖曳 | 置中、1.1 倍 | 置中、1.1 倍（沒被影響），也能合成 |
| 頁面錯誤 | 2 個 | 0 個 |

小夏順手修掉了原本就存在的交換／無效落點報錯，沒有看到新 bug。5 個 Node 測試檔我重跑全過。

一個要我的王用手指判斷的地方：物品浮在手指上方一格左右，但**落點仍是手指底下那格**，加粗高亮的那格剛好被拇指蓋住。規格沒有寫落點要跟著物品走，所以不算不過，但手感可能怪，列在建議。

### 2. 震動：程式符合規格，但 iPhone 多半不會震

讀程式加實測的結果：

- 拿起輕、合成強：拿起 8ms、合成 24ms，實測觸控拖曳合成記錄到 `[8, 24]`。滑鼠不震。
- Android 走 `navigator.vibrate`：有。
- iOS 走隱藏 switch 的 label：有。我把 `navigator.vibrate` 拿掉模擬 iPhone，隱藏 switch 被點了 2 次、沒有報錯、合成照常。
- 不支援時安全略過：有 try/catch，實測 0 錯誤。
- 設定開關：只有手機圖示加勾選框，沒有文字；`aria-label="震動"`、`title="震動 開／關"`；關掉後寫進 localStorage（`fantaco.mianhuatang.save.v2`），重新整理仍是關；關掉後不再觸發。預設開。

不符合的地方：**拿起那一下是在手指移動（pointermove）時觸發，不是在瀏覽器認定的「使用者點擊」當下**，所以 iPhone 上拿起那下本來就不會震；只有放開合成那下是在手指放開的事件裡同步觸發。

### 3. 去背：不過

詳見下方數字表與問題。

### 4. 狀態列：過

改後倒數文字在上、黃色進度條在下，分兩列。我量了 320／360／375／390／430 五種寬度 × 四種文字（19 小時 6 分、23 小時 59 分、59 分、完成），共 20 組，文字和進度條重疊面積全部是 0，文字沒有被截斷。

補充：改前的版本在 headless 裡也沒有重疊（文字在進度條右邊），所以我的王在 iPhone 上看到的重疊我這邊同樣重現不出來。但改後是上下兩列，結構上不可能再疊到。

### 5. 證據：真實，但有兩張前後圖看不出差別

小夏的 `before-drag.png`／`after-drag.png` 和我自己截的一致，數字也對得上（底緣 483.2 → 429.2）。`alpha-cleanup-*`、`alpha-mask-*` 與我量到的一致。

要注意：`before-delivery.png` 和 `after-delivery.png` 交貨框幾乎一樣，`before-statusbar.png` 也沒有拍到重疊。這不是造假，是這兩個問題在本機本來就重現不出來，小夏在報告裡有寫明。

### 6. PR 規矩：過

- PR #7 是 draft、狀態 OPEN、未合併，base 是 main，head 是 `b1c9eb6`。
- `origin/main` 仍是 `22a7d6d`，沒被推。
- 分支只有一個 commit。
- 其他 worktree 的 HEAD 我只看了清單，沒有動；工作區除了我放的 `review/mobile-fix/xiaosong/` 之外是乾淨的。

---

## 去背數字表

盤點範圍：`assets/chars/`（7 張 PNG＋7 張 WebP）、`avatars/`（13 張）、`expr/`（22 張）、`assets/mascot/sticker/`（14 張 PNG＋14 張 WebP）共 77 張，另加交貨道具 `assets/tiles/` 41 張。改到 53 張。

欄位說明（都是「改前 → 改後」）：
- 連通塊：有顏色的獨立區塊數，理想是 1（一個完整角色）。
- 碎片：小於 100 像素的獨立區塊。
- 離體霧：離主體 4 像素以外還有顏色的像素（背景殘塊／光暈）。
- 極淡底：透明度 1～15 的像素（肉眼幾乎看不到的薄霧）。
- 偏藍邊：半透明且偏藍紫的像素。
- 被刪的實心像素：原本完全不透明、現在變全透明的像素數。

| 圖 | 連通塊 | 碎片 | 離體霧 | 極淡底 | 偏藍邊 | 被刪的實心像素 |
|---|---|---|---|---|---|---|
| avatars/apiao | 11→1 | 10→0 | 379→0 | 2528→0 | 4427→3163 | 0 |
| avatars/bulu | 12→1 | 11→0 | 347→0 | 2483→0 | 4182→2831 | 0 |
| avatars/feifei | 5→1 | 4→0 | 378→0 | 2165→0 | 3344→1094 | 0 |
| avatars/feifei-happy | 13→1 | 12→0 | 864→0 | 2009→0 | 4169→2318 | 0 |
| avatars/feifei-determined | 28→4 | 27→0 | 11635→8672 | 9176→0 | 5566→2912 | 17 |
| avatars/feifei-sad | 25→4 | 24→0 | 12172→9833 | 8152→0 | 4840→2596 | 9 |
| avatars/feifei-surprised | 25→4 | 24→0 | 11657→9311 | 8141→0 | 6052→3326 | 8 |
| avatars/feifei-worried | 22→1 | 21→0 | 12645→9807 | 8591→0 | 5906→3189 | 27 |
| avatars/hate | 4→1 | 3→0 | 395→0 | 3713→0 | 525→316 | 0 |
| avatars/jiejie | 1→1 | 0→0 | 1→0 | 1142→0 | 4→0 | 0 |
| avatars/mascot | 11→1 | 10→0 | 194→0 | 2042→0 | 12171→11803 | 0 |
| avatars/sika | 5→1 | 4→0 | 375→0 | 2496→0 | 4003→2677 | 0 |
| avatars/spirit | 6→2 | 5→0 | 6518→0 | 9430→0 | 74342→72325 | 0 |
| expr/feifei-determined（含 open） | 39→5 | 35→0 | 4075→3931 | 0→0 | 180→24 | 7 |
| expr/feifei-sad | 29→9 | 27→0 | 4690→4665 | 0→0 | 145→21 | **378** |
| expr/feifei-sad-open | 57→6 | 50→0 | 4251→4064 | 0→0 | 54→18 | **1392** |
| expr/feifei-surprised（含 open） | 35→11 | 28→0 | 4801→4779 | 0→0 | 326→22 | **1292** |
| expr/feifei-worried（含 open） | 27→7 | 24→0 | 4899→4891 | 0→0 | 270→14 | 185 |
| expr/feifei-happy（含 open）、chars/feifei | 1→1 | 0→0 | 0→0 | 1445→0 | 2855→986 | 0 |
| expr/hate-happy（含 open） | 15→1 | 14→0 | 0→0 | 2901→0 | 1475→931 | 0 |
| chars/hate（png、webp） | 4→1 | 3→0 | 0→0 | 2912→0 | 6→1 | 0 |
| spirit 立繪／表情（png、webp） | 1→1 | 0→0 | 645→0 | 8130→0 | 43709→42677 | 0 |
| jiejie 立繪／表情（png、webp） | 1→1 | 0→0 | 17→0 | 4605→0 | 5325→5311 | 0 |
| apiao／bulu／sika 立繪與表情 | 1→1 | 0→0 | 0→0 | 約 1300～1450→0 | 幾乎不變 | 0 |
| sticker/face.png | 106→4 | 102→0 | 0→0 | 0→0 | 0→0 | 122 |
| sticker/wave.png | 165→4 | 161→0 | 0→0 | 0→0 | 0→0 | 207 |
| sticker/keychain-jump.png | 18→1 | 17→0 | 0→0 | 0→0 | 0→0 | 18 |
| sticker/sleep.png | 2→1 | 1→0 | 0→0 | 0→0 | 1021→1012 | 16 |
| 其餘 10 張眠花糖貼紙 PNG | 沒改 | 沒改 | 0 | 0 | 不變 | 0 |
| tiles/ 41 張交貨道具 | 沒改 | — | — | — | — | 0 |

其他量測：

- **RGB：53 張全部沒變。** 所有仍看得到的像素，改前改後 RGB 最大差異是 0，和腳本附的結果（p99≤8）一致。沒有任何像素的透明度被調高，也沒有半透明度被微調，只有「整顆變全透明」這一種改法。
- **cast10 角色（spirit、jiejie）與眠花糖官方色：沒被改。** 只清了透明度 15 以下的薄霧，實心像素 0 個被動。眠花糖 face／wave 被刪的是 1～5 像素的小點（最大 5 像素）。
- **偏藍邊剩下的數字**大多是角色本身的顏色（氣球精靈的藍頭髮、飛飛的水瓶與藍色挑染、眠花糖的深藍線條），不是光暈。
- **飛飛四個表情的頭像「離體霧」還剩 8,600～9,800**，是因為這幾張圖頭髮本身是半透明的（原圖就壞了），不是沒清乾淨的背景。
- **大塊方塊：沒有找到。** 13 張頭像的所有歷史版本（7 個 commit）四角都是透明，沒有任何一版有方塊底。41 張道具圖四角也全透明。
- **WebP：** `assets/chars/` 的 7 張 WebP 有同步清理。眠花糖貼紙的 4 張 WebP（face、wave、keychain-jump、sleep）沒有同步，仍有碎片（102／161／17／1）；但程式沒有引用貼紙 WebP，所以不影響遊戲。
- **快取版本：同步。** index.html、app.js、systems.js、drag.js、haptics.js、settings-ui.js、story.js、portraits.js、mascot.js、兩支 CSS 都換成 `?v=mobile1`；所有角色圖與眠花糖貼紙網址都帶 `?v=mobile1`。`battle.js` 有改內容，但目前沒有任何檔案載入它，不影響。

---

## 震動支援判斷

小夏的說明是老實的，我核對過來源：

- 她引用的 WebKit 修補 `fc1ef83` 真的存在（2026-05-21），內容就是「不准用程式點 label 來觸發 switch 的觸覺」。所以**新版 iPhone Safari 上這個技巧已經被封掉**。
- 報告、PR 說明、notes.md、validation.md 四處都寫了「未在實機測試」，也寫了 iOS 不能調強弱。

白話整理會不會震：

| 裝置 | 會不會震 |
|---|---|
| Android Chrome（有震動馬達、系統允許） | 會，拿起輕、合成強 |
| iPhone，Safari 已含上述修補的新版 | 不會 |
| iPhone，iOS 18 之後但還沒修補的舊版 | 合成那下有機會；拿起那下不會 |
| iPhone，iOS 18 以前 | 不會 |
| 桌機 | 不會 |
| 系統關閉觸覺、低電量模式 | 可能不會 |

以上全部沒有在實機上驗證過，我這邊也只能驗「程式有呼叫、沒有報錯」。**我的王是用 iPhone 測的，所以要有心理準備：這次更新後 iPhone 很可能還是不會震。** 這是瀏覽器的限制，不是小夏漏做；網頁版目前沒有可靠的 iPhone 震動做法。

---

## 問題

1. **（擋下）飛飛難過表情的眼睛亮點被刪。** `expr/feifei-sad.png` 與 `feifei-sad-open.png` 左眼白色亮點（位置約 x208,y166，56 像素）被清掉。原因是飛飛這幾張圖的眼珠原本就是透明的，亮點變成漂在洞裡的小島，被「小於 100 像素就刪」的規則掃到。
2. **（擋下）「小於 100 像素就刪」會刪實心像素，不只是薄霧。** 飛飛表情圖被刪的實心像素最多一張 1,392 個。我看過 30 像素以上的被刪區塊，除了那顆亮點，其他都是深藍灰色的輪廓殘渣，刪掉合理；但規則本身分不出碎片和設計細節。
3. **（擋下）我的王回報的方塊沒有找到來源。** 圖檔、歷史版本、道具圖都沒有方塊底。交貨框裡我唯一看到的方塊是「物品已備齊」時 CSS 加的綠色圓角底（`.order .need.have`），顏色對不上淡藍／紫／粉白。需要我的王的原始截圖才能繼續追。
4. **（原本就有，這次沒修）飛飛四個表情的眼珠和頭髮是透明的。** determined／sad／surprised／worried 的頭像、表情、張嘴版共 12 張，每張內部有約 2,300～2,850 像素的透明洞，背景會從眼睛透出來。這才是目前肉眼最明顯的髒去背。小夏有老實寫「沒有補畫」。我量到洞裡的 RGB 不是全黑（平均約 29,13,7 的深棕色），有可能只把透明度補回來就能救，不用重畫，但我沒有驗證補回來好不好看。
5. **（小）眠花糖貼紙 4 張 WebP 沒同步。** 不影響遊戲，但 PNG 和 WebP 現在不一致。
6. **（小）盤點表的「殘片 0→0」會讓人誤會沒改。** 例如 spirit、jiejie 寫 0→0，實際上清掉了 4,605～9,430 個極淡像素。

## 建議

1. 把那顆眼睛亮點還原（從 `22a7d6d` 取回那 56 個像素的透明度即可），兩張都要。
2. 清碎片的規則改成只刪「半透明的小塊」，或刪之前排除被角色包住的區域（眼睛、嘴巴裡的小島不要動）。改完再量一次被刪的實心像素。
3. 請我的王提供 12:53 那張 iPhone 截圖，並確認當時開的網址。有圖才能判斷方塊是圖、是 CSS，還是手機快取到舊版。
4. 飛飛四個表情的透明眼珠另開一項處理，先試只補透明度，出一張前後對照給我的王看再決定。
5. 拖曳落點：請我的王實機試一下「物品在上、落點在手指」順不順；不順的話可以改成以物品中心當落點，讓高亮格露在拇指外面。
6. 震動：在交付說明第一行就講「iPhone 多半不會震」，不要讓我的王以為是壞掉。

## 我存的圖

- `review/mobile-fix/xiaosong/before-play-390.png`
- `review/mobile-fix/xiaosong/after-play-390.png`
- `review/mobile-fix/xiaosong/before-orders-390.png`
- `review/mobile-fix/xiaosong/after-orders-390.png`
- `review/mobile-fix/xiaosong/before-touch-drag.png`
- `review/mobile-fix/xiaosong/after-touch-drag.png`
- `review/mobile-fix/xiaosong/before-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/after-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/before-mouse-drag.png`
- `review/mobile-fix/xiaosong/after-mouse-drag.png`
- `review/mobile-fix/xiaosong/before-statusbar-390.png`
- `review/mobile-fix/xiaosong/after-statusbar-390.png`
- `review/mobile-fix/xiaosong/before-statusbar-320.png`
- `review/mobile-fix/xiaosong/after-statusbar-320.png`
- `review/mobile-fix/xiaosong/after-settings-390.png`
- `review/mobile-fix/xiaosong/avatars-before-after-magenta.png`（13 張頭像改前改後，洋紅底，含透明度放大 6 倍版）
- `review/mobile-fix/xiaosong/tiles-on-magenta-normal-and-alpha-x6.png`（12 張交貨道具，確認沒有方塊底）
- `review/mobile-fix/xiaosong/zoom-feifei-sad-left-eye-highlight.png`（眼睛亮點被刪的 5 倍放大）
- `review/mobile-fix/xiaosong/zoom-expr-feifei-sad-open.png`
- `review/mobile-fix/xiaosong/zoom-expr-feifei-surprised-open.png`
- `review/mobile-fix/xiaosong/zoom-avatar-feifei.png`
- `review/mobile-fix/xiaosong/zoom-avatar-feifei-worried.png`
- `review/mobile-fix/xiaosong/zoom-avatar-spirit.png`
- `review/mobile-fix/xiaosong/zoom-mascot-wave.png`
- `review/mobile-fix/xiaosong/zoom-mascot-face.png`

三張 zoom 圖的三格分別是：改前、改後、紅色標出透明度被改的像素。

## 收尾

暫存資料夾 `AI工作/暫存/xs-mobile1` 已刪，本機測試用的兩個 HTTP 服務（8911、8912）已停，headless 瀏覽器已關。沒有開 Photoshop 或 Illustrator，沒有用 AppleScript。
