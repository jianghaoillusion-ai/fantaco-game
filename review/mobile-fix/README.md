# 手機修正驗收

拖曳：只有 touch 上移至少 56px、放大到 1.2；滑鼠保持原位置與 1.1。可合成格顯示綠底綠框，手指所在合成格加粗；落點仍是手指位置。修正無效落點／交換時讀取已清空拖曳狀態，pointercancel 不落下。

震動：設定新增手機圖示與開關，沒有可見文字，用 title／aria-label 說明，存入遊戲 localStorage，舊存檔預設開。Android Chrome 有震動硬體且系統允許時，拿起 8ms／合成 24ms。桌機、iOS 18以前、不支援振動API或switch觸覺的瀏覽器不會／不保證震動。系統關閉觸覺、低電量模式等可能不震，這些情境未實測。

新版 iOS：包含 WebKit fc1ef83 修補的 Safari 會拒絕程式 label click，不會因本次隱藏 switch 方法震動。舊版也只是 best-effort，pointermove 拿起時可能沒有使用者啟用，合成放開時才有機會。iOS 不能控制強弱。所有震動均「未在實機測試」，不可把 headless 或單元測試當作實際震動成功。
依據：[WebKit Safari 18](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/)、[WebKit 原始修補](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)、[MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)。

圖片：盤點104張，其中角色／眠花糖63張，交貨道具41張。角色53張有改，只改 alpha，存檔後重讀與22a7d6d比較，所有像素RGB最大差異=0，不透明RGB p99=0。角色小殘片721→0；道具188個小區塊包含原有光效，未改，不能說全104張殘片為0。清理規則為 alpha<16、小於100像素的八連通區；飛飛偏青藍半透明像素僅在與外界透明背景相鄰的外輪廓2px內清理，不清內部挑染或水瓶。已撤掉「整塊最高alpha<128就刪」規則。cast10、眠花糖官方色均未重畫或改RGB。7張WebP按各自原始RGB做同樣alpha清理後存無損，部分約增為4～5倍；目前程式未引用這些角色WebP，不增加主畫面下載量。

原始問題限制：22a7d6d 的交貨頭像是飛飛／氣球精靈／微笑姐姐等，沒有名為花仙子的角色。本地尚未重現描述的大塊藍紫粉白方塊，不能宣稱這項已實機修好；可能涉及不同素材或快取，原因未確認。飛飛舊表情眼睛／頭髮已有透明缺洞，本次不補畫、不改設計。保留大面積獨立配件，不能宣稱所有藝術細節都已人工逐像素驗收。

狀態列：倒數與黃色進度條分上下兩列。390×844 測得兩者不相交、文字不截斷。

驗證：node --test tests/*.test.mjs 共5個測試檔通過。headless Chromium＋CDP真實touch事件驗證浮起、可見高亮（實際computedStyle）、成功合成、滑鼠中心不變、無效落點、取消拖曳、倒數／進度條分離、關閉震動保存且重載保留，沒有頁面執行錯誤。

證據：before以git show 22a7d6d取得頁面與素材，沒有切換或修改其他worktree。兩組均390×844測試存檔，statusbar為局部裁切；alpha-cleanup為原尺寸對照，alpha-detail為4倍局部，alpha-mask紅色為被改透明度的像素。截圖非私人遊戲存檔。重跑需要既有Playwright、外接碟瀏覽器，先啟動本機8893 HTTP服務，再執行 capture.mjs before／after。

免費工具：Pillow／numpy／OpenCV、既有Playwright與Node。未用即夢、生圖、付費API或AppleScript。小頌僅唯讀交叉檢查。

## 圖片盤點

|路徑|使用位置|問題／處理|殘片前→後|不透明RGB p99|
|---|---|---|---|---|
|`assets/chars/apiao.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/apiao.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/avatars/apiao.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|10→0|0|
|`assets/chars/avatars/bulu.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|11→0|0|
|`assets/chars/avatars/feifei-determined.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|27→0|0|
|`assets/chars/avatars/feifei-happy.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|12→0|0|
|`assets/chars/avatars/feifei-sad.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|24→0|0|
|`assets/chars/avatars/feifei-surprised.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|24→0|0|
|`assets/chars/avatars/feifei-worried.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|21→0|0|
|`assets/chars/avatars/feifei.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|4→0|0|
|`assets/chars/avatars/hate.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|3→0|0|
|`assets/chars/avatars/jiejie.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/avatars/mascot.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|10→0|0|
|`assets/chars/avatars/sika.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|4→0|0|
|`assets/chars/avatars/spirit.png`|交貨框／頭像|低透明殘邊／殘點；只清 alpha|5→0|0|
|`assets/chars/bulu.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/bulu.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/apiao-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/apiao-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/bulu-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/bulu-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/feifei-determined-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|35→0|0|
|`assets/chars/expr/feifei-determined.png`|故事表情|低透明殘邊／殘點；只清 alpha|35→0|0|
|`assets/chars/expr/feifei-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/feifei-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/feifei-sad-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|50→0|0|
|`assets/chars/expr/feifei-sad.png`|故事表情|低透明殘邊／殘點；只清 alpha|27→0|0|
|`assets/chars/expr/feifei-surprised-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|28→0|0|
|`assets/chars/expr/feifei-surprised.png`|故事表情|低透明殘邊／殘點；只清 alpha|28→0|0|
|`assets/chars/expr/feifei-worried-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|24→0|0|
|`assets/chars/expr/feifei-worried.png`|故事表情|低透明殘邊／殘點；只清 alpha|24→0|0|
|`assets/chars/expr/hate-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|14→0|0|
|`assets/chars/expr/hate-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|14→0|0|
|`assets/chars/expr/jiejie-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/jiejie-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/sika-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/sika-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/spirit-happy-open.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/expr/spirit-happy.png`|故事表情|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/feifei.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/feifei.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/hate.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|3→0|0|
|`assets/chars/hate.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|3→0|0|
|`assets/chars/jiejie.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/jiejie.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/sika.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/sika.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/spirit.png`|故事備援立繪|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/chars/spirit.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|低透明殘邊／殘點；只清 alpha|0→0|0|
|`assets/mascot/sticker/back.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/blink.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/face.png`|眠花糖故事／主畫面|低透明殘邊／殘點；只清 alpha|102→0|0|
|`assets/mascot/sticker/front.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/hold-carrot.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/hold-star.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/jump.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/keychain-jump.png`|眠花糖故事／主畫面|低透明殘邊／殘點；只清 alpha|17→0|0|
|`assets/mascot/sticker/peek.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/side.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/sit-closed.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/sleep.png`|眠花糖故事／主畫面|低透明殘邊／殘點；只清 alpha|1→0|0|
|`assets/mascot/sticker/surprise.png`|眠花糖故事／主畫面|保留，未重繪|0→0|0|
|`assets/mascot/sticker/wave.png`|眠花糖故事／主畫面|低透明殘邊／殘點；只清 alpha|161→0|0|
|`assets/tiles/candy-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/candy-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/forest-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/forest-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/forest-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/forest-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/forest-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/garden-8.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/goods-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|1→1|0|
|`assets/tiles/goods-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|106→106|0|
|`assets/tiles/goods-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|19→19|0|
|`assets/tiles/goods-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|62→62|0|
|`assets/tiles/magic-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/magic-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/star-8.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/tea-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|
|`assets/tiles/tea-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|保留，未重繪|0→0|0|

## 截圖與放大對照

- `review/mobile-fix/after-delivery.png`
- `review/mobile-fix/after-drag.png`
- `review/mobile-fix/after-statusbar.png`
- `review/mobile-fix/alpha-cleanup-chars-apiao-png.png`
- `review/mobile-fix/alpha-cleanup-chars-apiao-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-apiao-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-bulu-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-determined-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-sad-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-surprised-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-feifei-worried-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-hate-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-jiejie-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-mascot-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-sika-png.png`
- `review/mobile-fix/alpha-cleanup-chars-avatars-spirit-png.png`
- `review/mobile-fix/alpha-cleanup-chars-bulu-png.png`
- `review/mobile-fix/alpha-cleanup-chars-bulu-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-apiao-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-apiao-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-bulu-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-bulu-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-determined-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-determined-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-sad-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-sad-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-surprised-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-surprised-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-worried-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-feifei-worried-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-hate-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-hate-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-jiejie-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-jiejie-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-sika-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-sika-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-spirit-happy-open-png.png`
- `review/mobile-fix/alpha-cleanup-chars-expr-spirit-happy-png.png`
- `review/mobile-fix/alpha-cleanup-chars-feifei-png.png`
- `review/mobile-fix/alpha-cleanup-chars-feifei-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-hate-png.png`
- `review/mobile-fix/alpha-cleanup-chars-hate-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-jiejie-png.png`
- `review/mobile-fix/alpha-cleanup-chars-jiejie-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-sika-png.png`
- `review/mobile-fix/alpha-cleanup-chars-sika-webp.png`
- `review/mobile-fix/alpha-cleanup-chars-spirit-png.png`
- `review/mobile-fix/alpha-cleanup-chars-spirit-webp.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-face-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-keychain-jump-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-sleep-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-wave-png.png`
- `review/mobile-fix/alpha-detail-avatars-feifei-sad.png`
- `review/mobile-fix/alpha-detail-avatars-feifei-worried.png`
- `review/mobile-fix/alpha-detail-expr-feifei-sad-open.png`
- `review/mobile-fix/alpha-detail-expr-feifei-sad.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-determined-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-happy-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-sad-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-surprised-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-worried-png.png`
- `review/mobile-fix/before-delivery.png`
- `review/mobile-fix/before-drag.png`
- `review/mobile-fix/before-statusbar.png`
