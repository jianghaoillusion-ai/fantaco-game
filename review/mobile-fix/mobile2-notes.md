# 手機補充輪 mobile2

第 7／8／9 項已實作並通過本機回歸；A 的防縮放、拖曳事件補強與眠花糖透明身體已處理，但飛飛原始表情圖破洞及 iPhone 淡色方塊仍未完成驗收。維持 draft PR，不 merge、不部署。

## 本輪行為

新局 35 件混合內容改為「星星窩 Lv.1＋兩個星點」3 件。花圃於微笑村修復 ≥2 解鎖；修復 ≥5 提前解鎖現有山洞寶箱，省去新產生器美術。訂單依實際擁有產生器篩選，未領取系列不進訂單。詳細觸發、結局無限訂單與舊檔相容見 [unlock-flow.md](unlock-flow.md)。

第 1 階物品可售 1 金幣；退役系列顯示件數／總金幣，玩家一鍵回收棋盤開放格與背包同系列物品；鎖格不動。產生器只在至少 3 個開放空格時入盤，否則明示待領取，不放背包。goods 不再掉落或抽訂單；原有物品保留，可出售。故事仍會用到的舊系列不會過早退役，結局保留最新生產系列。

三張含眠花糖的合成圖停止引用：goods-1 改為星星吊飾、gen-star-2／3 改為空星星窩升級圖，全部用新檔名，以 Pillow 合成現有物件素材。原檔未覆寫。盤點全部 52 張目前使用的合成圖與產生器，以及 tiles 目錄；見 [mobile2-tiles-audit.md](mobile2-tiles-audit.md)。

道具、角色資產更新快取版本，處理舊圖殘留的可能來源；無法據此宣稱 iPhone 方塊已消失。眠花糖 face／wave 只補原本 RGB 已是純白的封閉透明身體 alpha，碎片 69→0、116→0，原 RGB 完全不變，PNG/WebP 同步。飛飛眼珠／頭髮已有破洞，歷史最早的表情來源也存在此問題；沒有重畫、沒有用別的表情冒充修好。

viewport、Safari gesturestart／gesturechange、多指 touchmove、約 300ms 雙擊防護均加入；棋盤 touch-action:none，其餘 manipulation。第二下點擊保留 div 委派（故事／背包）與按鈕；棋盤由 pointerup 處理。拖曳以 translate3d 和 rAF 更新位置與命中框，提早 capture，忽略第二指 down，自動產物在拖曳中暫緩，避免重建棋盤 DOM。

## 證據與測試

- `before-level1-open.png`（本輪修改前 dd0d6d7；程式與素材同 9f25700）、`after-level1-open.png`：390×844，新存檔，無改棋盤的截圖。
- `unlock-flow.md`：解鎖時間軸、遷移與回收定義。
- `recycle-demo.png`：滿盤舊檔、待領取與回收件數／金幣提示（測試存檔）。
- `no-characters-in-tiles.png`：目前 data/chains.json 的全部 52 張合成圖與產生器。
- `after-no-zoom.png`：Chromium CDP 雙擊與雙指縮放後 scale 仍為 1；不等同 iPhone 實測。
- `drag-frames.json`：逐幀時間與 transform；本機有波動，沒有宣稱穩定 60fps。實機手感仍待驗收。
- `mobile2-mascot-face.png`、`mobile2-mascot-wave.png`、`mobile2-mascot-alpha.json`：本輪 alpha 修復前後。
- `validate-mobile2.mjs`：真實 CDP 合成與 v1 交貨、雙擊／雙指縮放、div 連點、修復2/5狀態、舊棋盤重載、待領取與回收、tier1出售；0 頁面錯誤。
- `tests/mobile-progression.test.mjs`：新舊棋盤、100 次訂單抽樣、1000 次星星窩掉落、開放格3格門檻與去重、鎖格回收排除、結局持續訂單。
- `node --test tests/*.test.mjs`：6 檔通過。`check-alpha.py`：49 張角色圖通過；額外比對相對 main 22a7d6d 所有 57 張修改原圖，RGB 最大差 0。

## 震動（全部未在實機測試）

iPhone 不能保證會震，這輪也沒有實機測到成功。iOS 18+ switch/label 技巧只可能在部分舊版／情境有效，含 WebKit fc1ef83 修補的版本會擋程式 click；拿起發生在 pointermove，沒有可靠使用者啟用。iOS 18 以前、桌機、LINE／IG 等內建瀏覽器都不提供本功能的可靠震動承諾。Android Chrome 在支援硬體且系統允許時可走 navigator.vibrate（拿起8ms、合成24ms）；設定關閉、系統關閉觸覺或其他裝置限制時可能無震動，未逐機驗證低電量影響。

依據：[WebKit 修補](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)、[MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)。

## 未完成與互審範圍

飛飛四種表情的透明眼珠／頭髮與碎片未修；淡藍／紫／粉白方塊未在本機重現，僅補資產快取版本。iPhone 縮放、拖曳手感、震動均未實機測試，60fps 不保證。未 merge、未推 main、未部署。整體未完成正式驗收，沒有建立正式 release tag／Drive 發行封存。

小頌本輪只讀程式，未獲准執行測試，不把他的結論當成獨立實測。第一輪回報的 div 第二下點擊、出售文字殘留已修；回收依使用者一鍵要求保留，補上件數／總金幣與鎖格保護；花店有 stage:1 前置，修花店時已達修復2；goods 新圖替換是使用者本輪明確允許。第二輪複查：小頌確認以上修正，最新程式無新增阻擋；沒有執行測試或像素比對。小夏另驗 face／wave PNG/WebP 原本 alpha>0 的像素 RGBA 逐位元組相同。A 素材缺口仍保留，不等於整體驗收通過。
