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

## 圖片盤點（118張）

小區塊＝alpha>0、8連通、面積<100；包含角色設計細節，不等同全是殘片。極淡＝alpha 1～15。表中RGB p99均是存檔後重新解碼與22a7d6d比較。

|路徑|使用位置|問題／處理|小區塊前→後|極淡前→後|alpha變更像素|刪除實心像素|RGB p99|
|---|---|---|---|---|---|---|---|
|`assets/chars/apiao.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1452→0|1452|0|0.0|
|`assets/chars/apiao.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1452→0|1452|0|0.0|
|`assets/chars/avatars/apiao.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|10→0|2528→0|2528|0|0.0|
|`assets/chars/avatars/bulu.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|11→0|2483→0|2483|0|0.0|
|`assets/chars/avatars/feifei-determined.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|27→36|9176→0|10509|0|0.0|
|`assets/chars/avatars/feifei-happy.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|12→6|2009→0|3091|0|0.0|
|`assets/chars/avatars/feifei-sad.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|24→32|8152→0|9317|0|0.0|
|`assets/chars/avatars/feifei-surprised.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|24→47|8141→0|9399|0|0.0|
|`assets/chars/avatars/feifei-worried.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|21→46|8591→0|9944|0|0.0|
|`assets/chars/avatars/feifei.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|4→8|2165→0|3458|0|0.0|
|`assets/chars/avatars/hate.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|3→0|3713→0|3713|0|0.0|
|`assets/chars/avatars/jiejie.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1142→0|1142|0|0.0|
|`assets/chars/avatars/mascot.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|10→0|2042→0|2042|0|0.0|
|`assets/chars/avatars/sika.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|4→0|2496→0|2496|0|0.0|
|`assets/chars/avatars/spirit.png`|交貨框／頭像|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|5→0|9430→0|9430|0|0.0|
|`assets/chars/bulu.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1398→0|1398|0|0.0|
|`assets/chars/bulu.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1398→0|1398|0|0.0|
|`assets/chars/expr/apiao-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1452→0|1452|0|0.0|
|`assets/chars/expr/apiao-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1452→0|1452|0|0.0|
|`assets/chars/expr/bulu-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1398→0|1398|0|0.0|
|`assets/chars/expr/bulu-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1398→0|1398|0|0.0|
|`assets/chars/expr/feifei-determined-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|35→37|0→0|577|0|0.0|
|`assets/chars/expr/feifei-determined.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|35→37|0→0|577|0|0.0|
|`assets/chars/expr/feifei-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1445→0|3798|0|0.0|
|`assets/chars/expr/feifei-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1445→0|3798|0|0.0|
|`assets/chars/expr/feifei-sad-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|50→102|0→0|1072|6|0.0|
|`assets/chars/expr/feifei-sad.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|27→21|0→0|710|0|0.0|
|`assets/chars/expr/feifei-surprised-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|28→34|0→0|920|194|0.0|
|`assets/chars/expr/feifei-surprised.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|28→34|0→0|920|194|0.0|
|`assets/chars/expr/feifei-worried-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|24→15|0→0|640|0|0.0|
|`assets/chars/expr/feifei-worried.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|24→15|0→0|640|0|0.0|
|`assets/chars/expr/hate-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|14→0|2901→0|2901|0|0.0|
|`assets/chars/expr/hate-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|14→0|2901→0|2901|0|0.0|
|`assets/chars/expr/jiejie-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|4605→0|4605|0|0.0|
|`assets/chars/expr/jiejie-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|4605→0|4605|0|0.0|
|`assets/chars/expr/sika-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1302→0|1302|0|0.0|
|`assets/chars/expr/sika-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1302→0|1302|0|0.0|
|`assets/chars/expr/spirit-happy-open.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|8130→0|8130|0|0.0|
|`assets/chars/expr/spirit-happy.png`|故事表情|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|8130→0|8130|0|0.0|
|`assets/chars/feifei.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1445→0|3798|0|0.0|
|`assets/chars/feifei.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1445→0|3826|0|0.0|
|`assets/chars/hate.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|3→0|2912→0|2912|0|0.0|
|`assets/chars/hate.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|3→0|2912→0|2912|0|0.0|
|`assets/chars/jiejie.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|4605→0|4605|0|0.0|
|`assets/chars/jiejie.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|4605→0|4605|0|0.0|
|`assets/chars/sika.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1302→0|1302|0|0.0|
|`assets/chars/sika.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|1302→0|1302|0|0.0|
|`assets/chars/spirit.png`|故事備援立繪|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|8130→0|8130|0|0.0|
|`assets/chars/spirit.webp`|故事備援立繪（WebP 備援；目前角色程式未引用）|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|0→0|8130→0|8130|0|0.0|
|`assets/mascot/sticker/back.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/back.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/blink.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/blink.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/face.png`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|102→69|0→0|40|40|0.0|
|`assets/mascot/sticker/face.webp`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|102→69|0→0|40|40|0.0|
|`assets/mascot/sticker/front.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/front.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/hold-carrot.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/hold-carrot.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/hold-star.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/hold-star.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/jump.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/jump.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/keychain-jump.png`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|17→0|0→0|18|18|0.0|
|`assets/mascot/sticker/keychain-jump.webp`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|17→0|0→0|18|18|0.0|
|`assets/mascot/sticker/peek.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/peek.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/side.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/side.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/sit-closed.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/sit-closed.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/sleep.png`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|1→0|0→0|25|16|0.0|
|`assets/mascot/sticker/sleep.webp`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|1→0|0→0|25|16|0.0|
|`assets/mascot/sticker/surprise.png`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/surprise.webp`|眠花糖故事／主畫面|未改；保留原圖|0→0|0→0|0|0|0.0|
|`assets/mascot/sticker/wave.png`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|161→116|0→0|60|60|0.0|
|`assets/mascot/sticker/wave.webp`|眠花糖故事／主畫面|清淡霧與未受保護殘點；薄霧圈內殘點仍可能保留|161→116|0→0|60|60|0.0|
|`assets/tiles/candy-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/candy-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/forest-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/forest-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/forest-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/forest-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/forest-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/garden-8.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/goods-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|1→1|0→0|0|0|0|
|`assets/tiles/goods-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|106→106|0→0|0|0|0|
|`assets/tiles/goods-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|19→19|0→0|0|0|0|
|`assets/tiles/goods-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|62→62|0→0|0|0|0|
|`assets/tiles/magic-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/magic-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-3.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-4.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-5.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-6.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-7.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/star-8.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/tea-1.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|
|`assets/tiles/tea-2.webp`|交貨需求道具／棋盤（原圖已透明，保留原有光效）|未改；保留原圖|0→0|0→0|0|0|0|

## review 圖片檔名

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
- `review/mobile-fix/alpha-cleanup-mascot-sticker-face-webp.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-keychain-jump-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-keychain-jump-webp.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-sleep-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-sleep-webp.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-wave-png.png`
- `review/mobile-fix/alpha-cleanup-mascot-sticker-wave-webp.png`
- `review/mobile-fix/alpha-detail-avatars-feifei-sad.png`
- `review/mobile-fix/alpha-detail-avatars-feifei-worried.png`
- `review/mobile-fix/alpha-detail-expr-feifei-sad-open.png`
- `review/mobile-fix/alpha-detail-expr-feifei-sad.png`
- `review/mobile-fix/alpha-eye-restored-feifei-sad-open.png`
- `review/mobile-fix/alpha-eye-restored-feifei-sad.png`
- `review/mobile-fix/alpha-hole-proposal-avatars-feifei-determined.png`
- `review/mobile-fix/alpha-hole-proposal-avatars-feifei-sad.png`
- `review/mobile-fix/alpha-hole-proposal-avatars-feifei-surprised.png`
- `review/mobile-fix/alpha-hole-proposal-avatars-feifei-worried.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-determined-open.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-determined.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-sad-open.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-sad.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-surprised-open.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-surprised.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-worried-open.png`
- `review/mobile-fix/alpha-hole-proposal-expr-feifei-worried.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-determined-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-happy-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-sad-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-surprised-png.png`
- `review/mobile-fix/alpha-mask-chars-avatars-feifei-worried-png.png`
- `review/mobile-fix/before-delivery.png`
- `review/mobile-fix/before-drag.png`
- `review/mobile-fix/before-statusbar.png`
- `review/mobile-fix/xiaosong/after-mouse-drag.png`
- `review/mobile-fix/xiaosong/after-orders-390.png`
- `review/mobile-fix/xiaosong/after-play-390.png`
- `review/mobile-fix/xiaosong/after-settings-390.png`
- `review/mobile-fix/xiaosong/after-statusbar-320.png`
- `review/mobile-fix/xiaosong/after-statusbar-390.png`
- `review/mobile-fix/xiaosong/after-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/after-touch-drag.png`
- `review/mobile-fix/xiaosong/avatars-before-after-magenta.png`
- `review/mobile-fix/xiaosong/before-mouse-drag.png`
- `review/mobile-fix/xiaosong/before-orders-390.png`
- `review/mobile-fix/xiaosong/before-play-390.png`
- `review/mobile-fix/xiaosong/before-statusbar-320.png`
- `review/mobile-fix/xiaosong/before-statusbar-390.png`
- `review/mobile-fix/xiaosong/before-touch-drag-toprow.png`
- `review/mobile-fix/xiaosong/before-touch-drag.png`
- `review/mobile-fix/xiaosong/tiles-on-magenta-normal-and-alpha-x6.png`
- `review/mobile-fix/xiaosong/zoom-avatar-feifei-worried.png`
- `review/mobile-fix/xiaosong/zoom-avatar-feifei.png`
- `review/mobile-fix/xiaosong/zoom-avatar-spirit.png`
- `review/mobile-fix/xiaosong/zoom-expr-feifei-sad-open.png`
- `review/mobile-fix/xiaosong/zoom-expr-feifei-surprised-open.png`
- `review/mobile-fix/xiaosong/zoom-feifei-sad-left-eye-highlight.png`
- `review/mobile-fix/xiaosong/zoom-mascot-face.png`
- `review/mobile-fix/xiaosong/zoom-mascot-wave.png`
