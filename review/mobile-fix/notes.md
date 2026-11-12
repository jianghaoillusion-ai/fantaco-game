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
