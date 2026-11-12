# 第 2 輪手機修正（最後一輪）

iPhone 多半仍不會震；所有裝置震動均「未在實機測試」。本輪不是全部驗收通過：原始淡藍／紫／粉白方塊仍未重現，不能宣稱已解決。

## 回應小頌第 1 輪的六個問題

1. 眼睛亮點：已從 22a7d6d 重算清理，兩張 sad 表情的白色亮點恢復。`alpha-eye-restored-feifei-sad.png`、`alpha-eye-restored-feifei-sad-open.png` 是原版／第1輪／第2輪五倍對照。
2. 無差別刪小塊：改成先以原始外輪廓填滿建立保護區，角色輪廓包住的小島（含眼睛、嘴巴）不刪。保留原圖所有 RGB。新增 `check-alpha.py`，先在第1輪圖重現失敗，再驗證修正後通過。仍會刪輪廓外、面積小於100的殘點；外部實心像素刪除量逐張公開，沒有宣稱全圖實心 alpha 不變。保留的小島不能一概當成髒點。保護區由原始 alpha>0 計算，會把外圍薄霧範圍也圈入，該範圍內部分斷開殘點仍保留，所以不能宣稱外圍碎點全清。
3. 淡色方塊：仍未找到來源。檢查了交貨頭像與道具引用、CSS，交貨頭像底色是圓形淡黃，備齊道具的圓角綠底有遊戲含義；沒有證據可把它們當成使用者回報的藍紫粉白方塊而刪掉。保留待釐清，需當時 iPhone 截圖與網址，未部署也未實機驗收。
4. 原有透明眼珠／頭髮：製作12張 `alpha-hole-proposal-*` 對照，右格僅把封閉透明洞的 alpha 補回，RGB 不變，沒有套用到遊戲。提案的部分眼珠近黑、頭髮冒出黑色色塊，洞裡顏色不能直接套用；髮絲與衣服仍有複雜鏤空；不把自動補洞當作已核准角色修復。提案圖不是成品。
5. 貼紙 WebP：盤點補齊14張，4張有清理的 PNG/WebP alpha 完全一致。WebP 各自保留原始 RGB，無損重存，不重新壓有損。角色與模組快取升為 mobile2。
6. 盤點數字：分列小連通區、極淡像素、alpha 變更量及刪除實心像素。小區塊不全是殘片，包含白色亮點，不能追求全部歸零。

拖曳落點仍是手指所在格，依原規格未改落點；實際手感待使用者測試。震動拿起仍在跨過拖曳門檻時觸發，避免一碰就震；此事件不能提供可靠的 iOS 啟用，沒有宣稱已繞過限制。

## 四項修改

|項目|檔案與內容|
|---|---|
|拖曳|`js/drag.js`、`js/app.js`、`css/quality.css`：touch 上移至少56px、1.2倍，可合成格高亮；滑鼠保持1.1倍與原位置；本輪保留第1輪行為|
|震動|`js/haptics.js`、`js/settings-ui.js`、`js/systems.js`、`js/app.js`、`index.html`、`css/settings.css`：8ms拿起、24ms合成，圖示開關、預設開並存 localStorage；本輪未改觸發行為|
|去背|`assets/chars/`、`assets/chars/avatars/`、`assets/chars/expr/`、`assets/mascot/sticker/`；清理腳本 `review/mobile-fix/cleanup-alpha.py`；`js/portraits.js`、`js/mascot.js`、相關模組與 `index.html` 快取 mobile2|
|狀態列|`css/quality.css` 倒數文字與進度條上下排；本輪保留第1輪修正|

## 震動支援（未在實機測試）

|裝置／瀏覽器|可期待的結果|
|---|---|
|Android Chrome，有馬達且系統允許|API 支援，拿起8ms、合成24ms；不是硬體實測保證|
|iPhone Safari，含 WebKit fc1ef83 修補|程式 label.click 會被擋，這個方法不會震；未確認各 iOS 正式版的收錄版本|
|iOS 18 之後、尚未包含修補的 Safari|只能 best-effort；拿起 pointermove 沒有可靠使用者啟用；放開合成可能有效，不能調強弱|
|iOS 18以前、桌機、無支援硬體／API|本功能無可靠震動|
|系統停用觸覺、低電量、靜音／勿擾等|可能無震動，依系統與裝置而異；沒有逐機驗證|

依據：[WebKit 修補](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)、[MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)。

## 本輪驗證

`node --test tests/*.test.mjs`：5個檔案全過。headless Chromium 390×844 真實CDP觸控：浮圖底緣429.2、手指y461.5，留32.3px；合成tier2、目標高亮、滑鼠位置、無效落點、取消不改棋盤、文字與進度條分離、震動開關重載保存，無頁面錯誤。`check-alpha.py`：49張角色圖的輪廓內實心 alpha 保留、RGB p99≤8（此腳本不含貼紙；貼紙由清理腳本的RGB驗證與另行PNG/WebP alpha逐像素檢查涵蓋）。57張有改素材與基準所有 RGB 最大差為0，尺寸不變，14組貼紙 PNG/WebP alpha 一致。全部只使用免費本機工具，沒用即夢、付費API或 AppleScript。

本輪57張素材的 alpha 共變更170,288像素，極淡像素147,022→0。77張角色／貼紙原始小區塊1002→840，這不是「剩840個髒點」：保留的角色內部小島包含眼睛亮點；其中也有被原始薄霧保護圈涵蓋的外圍殘渣；不能宣稱所有髮絲或碎點都乾淨。41張道具保留原有光效。

before截圖維持22a7d6d，after已以第2輪重截；測試存檔非私人存檔。第1輪小頌截圖仍保留於 xiaosong/，僅屬歷史證據；其餘 alpha-cleanup / alpha-mask 已重新產生。去背補洞提案僅供審閱，未寫回素材。
