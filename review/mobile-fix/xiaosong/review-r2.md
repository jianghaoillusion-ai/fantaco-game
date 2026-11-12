VERDICT: FAIL

# 小頌交叉檢查：FANTACO 手機修正 mobile1（第 2 次審查）

審查對象：worktree `fantaco-mobile-fix`，分支 `xiaoxia/mobile-fix`，commit `9f25700`（素材修正在 `9b5db28`），起點 `22a7d6d`，Draft PR #7。
我只讀、只量、只截圖，沒有改圖、改程式、commit、push 或 merge。這次所有數字都是我自己重跑的，沒有沿用上一輪。

**不過的原因仍然只有去背（第 3 項）。** 拖曳、震動、狀態列、PR 規矩都過。

去背不過的三個理由：

1. **我的王看到的「淡藍／紫／粉白方塊」還是沒找到、沒修。** 小夏自己也寫「不能宣稱已解決」。這是我的王點名的問題，沒解決就不能算過。
2. **飛飛表情圖的碎片不減反增。** 任務點名要清的 `avatars/feifei-*`，四張表情頭像的碎片從 21～27 個變成 32～47 個；`expr/feifei-sad-open` 從 50 變 102。
3. **眠花糖 `face.png`、`wave.png` 還剩 69、116 個碎片**（上一輪是 0）。

上一輪擋下的「眼睛亮點被刪」已經修好，這點確認。

---

## 逐項結果

### 1. 拖曳：過

headless Chromium 390×844、真的觸控事件，改前改後各跑一輪。程式和上一輪相同（只換快取版本號），結果一致。

| 檢查 | 改前 22a7d6d | 改後 9f25700 |
|---|---|---|
| 物品位置（手指 y=461.5） | 底緣 483.2，蓋在手指上 | 底緣 429.2，在手指上方 32.3px |
| 放大 | 1.1 倍 | 觸控 1.2 倍 |
| 可合成格高亮 | 沒有 | 2 格淡綠底綠框，手指所在格加粗 |
| 觸控合成（星1＋星1） | 變星2 | 變星2 |
| 拖到空格 | 正常 | 正常 |
| 不同物品交換 | 壞的（報錯、浮圖殘留） | 正常交換 |
| 拖到交貨框交付 | 正常 | 正常 |
| 拖到無效位置 | 浮圖殘留 | 彈回、棋盤不變、無殘留 |
| 觸控取消 | 棋盤被改動（誤合成） | 棋盤不變、高亮清乾淨 |
| 滑鼠拖曳 | 置中、1.1 倍 | 置中、1.1 倍，沒被影響，可合成 |
| 頁面錯誤 | 2 個 | 0 個 |

用 transform（translate3d）移動、有 requestAnimationFrame 合併，沒用 top/left。5 個 Node 測試檔我重跑全過。

仍要我的王用手指判斷：物品浮在上方，但落點是手指底下那格，加粗高亮格會被拇指蓋住。

### 2. 震動：過（程式符合規格；iPhone 多半不會震，小夏有老實寫）

- 拿起 8ms、合成 24ms，觸控合成實測記錄到 `[8, 24]`；滑鼠不震。
- Android 走 `navigator.vibrate`。
- iOS 走隱藏的 `<input type="checkbox" switch>` 的 label：我把 `navigator.vibrate` 拿掉模擬 iPhone，label 被點 2 次、0 錯誤、合成照常。
- 不支援時有 try/catch，安全略過。
- 設定開關：只有手機圖示加開關，整列沒有文字；`aria-label="震動"`、`title="震動 開／關"`；預設開；關掉後寫進 localStorage（`fantaco.mianhuatang.save.v2`），重新整理仍是關，關掉後不再觸發。

規格上的小落差（不擋）：拿起那一下是在手指移動（pointermove）時觸發，瀏覽器不把它當「使用者點擊」，所以 iPhone 上拿起那下本來就不會震；只有放開合成那下在放開事件裡同步觸發。小夏報告有寫明。

### 3. 去背：不過

見下方數字表與問題。

### 4. 狀態列：過

改後倒數文字在上、黃色進度條在下。390 寬量三種文字（19小時 6分、23小時 59分、59分）：文字框 y 80～90、進度條 y 95～105，重疊面積 0，沒有截斷。

改前在 headless 裡文字在進度條右邊、也沒有重疊，所以我的王在 iPhone 看到的重疊我這邊一樣重現不出來；但改後是上下兩列，結構上不會再疊。

### 5. 證據：真實

小夏的 `before-drag.png`／`after-drag.png`、`after-statusbar.png` 和我自己截的一致，數字對得上。`alpha-eye-restored-*` 兩張和我量的一致（亮點確實回來了）。before 圖是用 22a7d6d 的檔案截的，不是造假。

要注意的兩點：
- `before-delivery.png` 和 `after-delivery.png` 的交貨框幾乎一樣，看不出修了什麼，因為方塊本來就沒重現。
- 小夏的 `notes.md`、PR 說明寫「小頌第 2 輪唯讀複查…無新增阻擋」，那是她 13:25 透過協作橋問到的另一個小頌，只看圖讀程式、沒有量數字。**以這份正式審查為準**：碎片變多這件事那次沒有量到。

### 6. PR 規矩：過

- PR #7 是 draft、OPEN、未合併，base 是 main，head 是 `9f25700`。
- `origin/main` 仍是 `22a7d6d`。
- 工作區除了我放的 `review/mobile-fix/xiaosong/r2-*` 之外是乾淨的；其他 worktree 我只看了清單。

---

## 去背數字表

盤點範圍：`assets/chars/`（7 PNG＋7 WebP）、`avatars/`（13）、`expr/`（22）、`assets/mascot/sticker/`（14 PNG＋14 WebP）共 77 張，改到 57 張；另看了 `assets/tiles/` 全部道具圖（沒改）。

欄位都是「改前 → 改後」：
- 連通塊：有顏色的獨立區塊數，理想是 1。
- 碎片：小於 100 像素的獨立區塊。
- 離體霧：離實心主體 4 像素以外還有顏色的像素。
- 極淡底：透明度 1～15 的薄霧像素。
- 偏藍邊：半透明且偏藍的像素。
- 刪掉的實心像素：原本完全不透明、現在全透明。

| 圖 | 連通塊 | 碎片 | 離體霧 | 極淡底 | 偏藍邊 | 刪掉的實心像素 |
|---|---|---|---|---|---|---|
| avatars/apiao | 11→1 | 10→0 | 86→0 | 2528→0 | 4085→2816 | 0 |
| avatars/bulu | 12→1 | 11→0 | 101→0 | 2483→0 | 4078→2721 | 0 |
| avatars/hate | 4→1 | 3→0 | 71→0 | 3713→0 | 715→495 | 0 |
| avatars/jiejie | 1→1 | 0→0 | 0→0 | 1142→0 | 4→0 | 0 |
| avatars/mascot | 11→1 | 10→0 | 41→0 | 2042→0 | 7167→6793 | 0 |
| avatars/sika | 5→1 | 4→0 | 67→0 | 2496→0 | 3951→2619 | 0 |
| avatars/spirit | 6→2 | 5→0 | 3802→0 | 9430→0 | 8472→6437 | 0 |
| avatars/feifei | 5→**9** | 4→**8** | 173→0 | 2165→0 | 3321→1028 | 0 |
| avatars/feifei-happy | 13→7 | 12→6 | 409→0 | 2009→0 | 3851→1964 | 0 |
| avatars/feifei-determined | 28→**40** | 27→**36** | 9830→7855 | 9176→0 | 5345→2669 | 0 |
| avatars/feifei-sad | 25→**36** | 24→**32** | 10331→8782 | 8152→0 | 5206→2827 | 0 |
| avatars/feifei-surprised | 25→**51** | 24→**47** | 9787→8272 | 8141→0 | 5795→2970 | 0 |
| avatars/feifei-worried | 22→**47** | 21→**46** | 10883→8813 | 8591→0 | 5673→2851 | 0 |
| expr/feifei-determined（含 open） | 39→**42** | 35→**37** | 3488→3488 | 0→0 | 385→25 | 0 |
| expr/feifei-sad | 29→30 | 27→21 | 3961→3956 | 0→0 | 386→24 | 0 |
| expr/feifei-sad-open | 57→**108** | 50→**102** | 3627→3433 | 0→0 | 198→20 | 6 |
| expr/feifei-surprised（含 open） | 35→**45** | 28→**34** | 4004→3987 | 0→0 | 518→25 | 194 |
| expr/feifei-worried（含 open） | 27→22 | 24→15 | 4184→4179 | 0→0 | 454→21 | 0 |
| expr/feifei-happy（含 open）、chars/feifei | 1→1 | 0→0 | 0→0 | 1445→0 | 2792→811 | 0 |
| hate 立繪與表情 | 4～15→1 | 3～14→0 | 0→0 | 約 2900→0 | 小幅下降 | 0 |
| spirit 立繪與表情 | 1→1 | 0→0 | 213→0 | 8130→0 | 4624→3590 | 0 |
| jiejie 立繪與表情 | 1→1 | 0→0 | 0→0 | 4605→0 | 30→16 | 0 |
| apiao／bulu／sika 立繪與表情 | 1→1 | 0→0 | 0→0 | 約 1300～1450→0 | 幾乎不變 | 0 |
| sticker/face（png、webp） | 106→73 | 102→**69** | 0→0 | 0→0 | 0→0 | 40 |
| sticker/wave（png、webp） | 165→120 | 161→**116** | 0→0 | 0→0 | 0→0 | 60 |
| sticker/keychain-jump（png、webp） | 18→1 | 17→0 | 0→0 | 0→0 | 0→0 | 18 |
| sticker/sleep（png、webp） | 2→1 | 1→0 | 0→0 | 0→0 | 1020→1011 | 16 |
| 其餘 10 組眠花糖貼紙 | 沒改 | 沒改 | 0 | 0 | 不變 | 0 |
| tiles/ 道具圖 | 沒改 | — | — | — | — | 0 |

合計：透明度被改的像素 170,288；極淡底 147,022→0；碎片 1,002→840（和小夏報告的數字一致）。

其他量測：

- **RGB：57 張全部沒變。** 所有還看得到的像素，改前改後 RGB 最大差異是 0，和腳本附的結果（p99≤8）一致。沒有任何像素透明度被調高，也沒有半透明度被微調，只有「整顆變全透明」一種改法。
- **cast10 角色（spirit、jiejie）與眠花糖官方色：沒被改。** 這兩個角色實心像素 0 個被動。眠花糖 face／wave／keychain-jump 被刪的實心像素都在輪廓外，最大一塊 4 像素。
- **眼睛亮點：已還原。** `feifei-sad` 白色亮點 161 像素、`feifei-sad-open` 157 像素，上一輪只剩 124／118，這一輪全數回來，RGB 相同。
- **被刪的實心像素大幅減少**：上一輪最多一張 1,392 個，這一輪最多 194 個（`feifei-surprised`），我放大看過，是背包旁邊一條脫離主體的藍灰色外框殘線，刪掉合理。
- **道具圖沒有方塊底。** 全部道具圖我都疊在深色底、洋紅底上看過，也看了透明度圖，邊緣乾淨。
- **WebP：已同步。** 14 組貼紙 PNG／WebP 透明度逐像素相同；角色 7 組裡 6 組相同，`chars/feifei` 差 64 個像素（很小，且遊戲沒有引用角色 WebP）。
- **快取版本：已同步。** 程式、CSS、角色圖、貼紙網址都是 `?v=mobile2`，沒有殘留 `mobile1`。

---

## 震動支援判斷

小夏的說明老實，報告第一行就寫「iPhone 多半仍不會震」，報告、PR、notes、validation 都寫了「未在實機測試」。

| 裝置 | 會不會震 |
|---|---|
| Android Chrome（有震動馬達、系統允許） | 會，拿起輕、合成強 |
| iPhone，Safari 已含 WebKit 修補 fc1ef83 的新版 | 不會（程式點 label 被瀏覽器擋掉） |
| iPhone，iOS 18 之後但還沒修補的版本 | 合成那下有機會；拿起那下不會；不能調強弱 |
| iPhone，iOS 18 以前 | 不會 |
| LINE、IG 等 App 內建瀏覽器 | 不會（小夏的表沒有單獨列這一項，建議補上） |
| 桌機 | 不會 |
| 系統關閉觸覺、低電量模式 | 可能不會 |

以上全部沒有在實機上驗證，我也只能驗「程式有呼叫、沒有報錯」。**我的王用的是 iPhone，這次更新後很可能還是不會震。** 這是瀏覽器的限制，網頁版目前沒有可靠的 iPhone 震動做法。

---

## 問題

1. **（擋下）方塊沒找到來源。** 我這輪再查的結果：
   - 現在的頭像、表情、立繪、貼紙、全部道具圖，都沒有方塊底。
   - 交貨框裡唯一的方塊是「物品已備齊」時 CSS 加的綠色圓角底（`#98c95a`），顏色對不上。
   - 新存檔第 1 關的三個交貨框是：姊姊＋星星餅乾、阿飄＋綠色樹叢（garden-2）、飛飛＋星星。我的王說的「綠色樹叢角色」很可能就是 garden-2 這個**道具**，不是角色頭像。
   - 一條線索（把握不高）：11/10 的舊版道具圖（commit `fc1175a`、`28b2b2a`）每張都有淡綠／淡黃／粉白／淡紫的圓角方塊底，11/11 凌晨才換成去框版。道具圖網址沒有帶版本號，如果我的王的 iPhone 還留著舊圖，看到的就會是這種方塊。但線上主機設定 10 分鐘就會重新確認，照理不該留這麼久，所以只是線索。對照圖：`review/mobile-fix/xiaosong/r2-tiles-history-magenta.png`。
2. **（擋下）飛飛表情圖碎片變多。** 原因：這幾張圖的頭髮本來是半透明的（原圖就壞了），小夏把極淡像素和偏藍像素清掉後，頭髮被切成更多小塊；新的「輪廓內的小島不刪」規則又把這些小塊全保留。亮點救回來了，但碎片數比沒修之前還多。
3. **（擋下）眠花糖 face／wave 還有 69／116 個碎片。** 這兩張圖身體中間是透明的（只有外框線），裡面漂著很多白色小點，被當成「輪廓內的小島」保留。白點在淺色底上不明顯，在深色底上看得到。`wave.png` 是遊戲的 happy／wave 動作，有在用。
4. **（原本就有，仍沒修）飛飛四個表情的眼珠和頭髮是透明的。** 背景會從眼睛透出來，這是目前肉眼最明顯的髒去背（見 `r2-zoom-avatar-feifei-worried-fragments.png`）。小夏做了補洞提案但會冒黑色塊，沒有套用，處理得當；但問題還在。
5. **（小，不擋）** garden-2（綠色樹叢）、tea-1、tea-2 三張道具圖的圖案被畫布邊緣切掉，邊緣是直線。這不在本次範圍，順手記下。

## 建議

1. 請我的王再截一次 iPhone 交貨框的圖，並先用無痕分頁開一次看方塊還在不在。在的話是程式或圖的問題，不在的話就是手機留著舊圖。
2. 道具圖網址也加上版本號（現在只有角色圖和貼紙有），排除舊圖殘留。
3. 飛飛四個表情不要再用清透明度的方式修，原圖的頭髮和眼珠已經壞了，要從有完整眼珠頭髮的來源重出去背（例如用 `feifei-happy` 那版的做法），這需要我的王決定要不要重出圖。
4. 眠花糖 face／wave：白色身體要不要補實，請我的王決定（補實不會改官方色，只是把透明的身體填回 #FFFFFF）；若不補，裡面的白色小點應該清掉。
5. 拖曳落點、震動兩項維持上一輪建議：請我的王實機試手感；交付說明第一句講明 iPhone 多半不會震。
6. 13:19 追加的「禁止雙擊／雙指縮放」「拖曳跟手」兩項這一輪沒有做（沒有 `after-no-zoom.png`、`drag-frames.json`），已排在 mobile2，不算在這次六項檢查內。

## 我存的圖（第 2 次審查）

- `review/mobile-fix/xiaosong/r2-before-fresh-play-390.png`
- `review/mobile-fix/xiaosong/r2-after-fresh-play-390.png`
- `review/mobile-fix/xiaosong/r2-before-fresh-orders-x3.png`
- `review/mobile-fix/xiaosong/r2-after-fresh-orders-x3.png`
- `review/mobile-fix/xiaosong/r2-fresh-orders-before-after-x3.png`（上：改前，下：改後）
- `review/mobile-fix/xiaosong/r2-before-touch-drag.png`
- `review/mobile-fix/xiaosong/r2-after-touch-drag.png`
- `review/mobile-fix/xiaosong/r2-before-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/r2-after-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/r2-before-mouse-drag.png`
- `review/mobile-fix/xiaosong/r2-after-mouse-drag.png`
- `review/mobile-fix/xiaosong/r2-before-statusbar-390-x3.png`
- `review/mobile-fix/xiaosong/r2-after-statusbar-390-x3.png`
- `review/mobile-fix/xiaosong/r2-after-settings-390.png`
- `review/mobile-fix/xiaosong/r2-avatars-before-after-dark-alpha-cream.png`（13 張頭像；由上到下：深色底改前／改後、透明度放大改前／改後、淡黃底改前／改後）
- `review/mobile-fix/xiaosong/r2-zoom-avatar-feifei-worried-fragments.png`（左：改前，中：改後，右：改動處標黃；青色框是碎片）
- `review/mobile-fix/xiaosong/r2-zoom-expr-feifei-sad-open-fragments.png`
- `review/mobile-fix/xiaosong/r2-zoom-expr-feifei-surprised-removed-blob.png`（被刪的最大一塊實心像素，黑色標出）
- `review/mobile-fix/xiaosong/r2-zoom-feifei-sad-eye-base-r1-r2.png`（眼睛亮點：原版／第 1 輪／第 2 輪）
- `review/mobile-fix/xiaosong/r2-zoom-feifei-sad-open-eye-base-r1-r2.png`
- `review/mobile-fix/xiaosong/r2-zoom-mascot-face-fragments.png`
- `review/mobile-fix/xiaosong/r2-zoom-mascot-wave-fragments.png`
- `review/mobile-fix/xiaosong/r2-tiles-all-dark-and-alpha.png`（全部道具圖與透明度圖）
- `review/mobile-fix/xiaosong/r2-tiles-suspects-zoom.png`（10 張道具圖在深色／白／洋紅底）
- `review/mobile-fix/xiaosong/r2-tiles-history-magenta.png`（道具圖歷史版本；最上面兩列是 11/10 有方塊底的舊版）

第 1 次審查的圖仍在同一資料夾（檔名沒有 `r2-` 開頭），只算歷史紀錄。

## 收尾

暫存資料夾 `fantaco-logs/tmp-xiaosong-review-mobile1` 內容已清空，本機測試用的兩個 HTTP 服務（8931、8932）已停，headless 瀏覽器已關。沒有開 Photoshop 或 Illustrator（pgrep 無輸出），沒有用 AppleScript。
