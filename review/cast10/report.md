# cast10：精靈加高全身重畫、姐姐腰身微調（待看圖驗收）

基準：39b59feaf899ee8aa619b64c3391994c32eb98b0。分支：xiaoxia/cast-redraw-v2。PR #5 維持 draft；不 merge、不推 main，不碰 PR #4。
本報告與素材同批提交；外部正式報告收尾補入實際 commit hash。

## 結果與取捨

精靈540×800、腳底y765，皇冠沒有縮小；改成完整一人重畫，不是放大原臉再接縮小身體。姐姐540×720與腳底y685不變，只補腰帶上方一點衣料，頭腿與腰帶完全不動。哈特主圖逐位元等於5b125dc與39b59fe。

不是所有數字都達標：精靈頭部面積比布魯小5.1%，超過±5%約0.1個百分點；頭高較短12.9%、頭高／不含帽總高較低9.9%。為保住整體自然感，沒有再局部拉長頭、搬貼臉或扭曲身體。主要身長、腿長、不含帽總高、臉寬與髮量在±5%。臉仍比原設定略圓、眼睛較大、刺繡邊較寬，不能宣稱逐線完全一致。這些留給我的王看圖確認。

## 原設定與重畫方式

原設定 `git show origin/main:assets/chars/spirit.png`；姐姐與頭腿比較取39b59fe。比例基準 `assets/chars/bulu.png`，自然感參考 `assets/chars/feifei.png`。採用內建生圖完整全身來源 `review/cast10/source/spirit-built-in.png`，後製僅整張等比縮放、平移、清理alpha碎點與0.30px柔邊。原臉／原帽沒有貼回成品。來源、最後提示詞、方法與縮放參數見provenance.md與normalization.json。

皇冠按「藍色髮圈連通區頂端−全圖alpha≥128頂端」量：原設定156−33=123px，新版133−7=126px（+2.4%），沒有為塞進畫布縮帽。含帽總高與不含帽總高分開列；人工髮頂標132與色彩連通髮頂133相差1px。

## 精靈和布魯逐項比較

長度px、面積px²。髮頂／下巴／腰帶中心及臉界是人工標定，約有1～2px誤差；腳底與分腿點由像素量。頭面積含耳、不含帽；髮量包含藍髮圈與黑髮，分割邊界有估計誤差。遮罩已排除舉手指尖。

|項目|布魯|精靈不含帽|相對差距|精靈含帽|
|---|---:|---:|---:|---:|
|頭高／不含帽總高|0.3305|0.2978|-9.91%|不以帽子灌入此項|
|頭高|216.5|188.5|-12.93%|不以帽子灌入此項|
|臉寬|134|130|-2.99%|不以帽子灌入此項|
|頭部面積|32965|31283|-5.10%|不以帽子灌入此項|
|髮量|14946|15561|+4.11%|不以帽子灌入此項|
|肩外輪廓全寬|161|228|+41.61%|不以帽子灌入此項|
|身長（下巴到腰）|147.5|148.5|+0.68%|不以帽子灌入此項|
|腿長（分腿點到腳底）|214|223|+4.21%|不以帽子灌入此項|
|總高|655|633|-3.36%|758（+15.73%）|

定位：髮頂132、下巴320.5、腰帶中心469、分腿點542、腳底765、帽頂7。肩寬含泡泡袖與頭髮，不是肩骨寬，因此比布魯寬41.6%。同一量法布魯髮量14946，與cast9曾用15088有142px差別，原因是耳／臉閉合邊界；本表不混用兩種基準。

## 自然感與邊緣

自我檢查：頭、脖子、衣服連貫，無局部貼臉接縫、雙瀏海或魚眼。姿勢保留招手＋插腰，六顆彩球與尖耳齊全；黑髮與深藍金紋外套已依小頌意見重畫恢復。與飛飛相比，精靈站得較正、眼線較平，未做五官對稱拉伸。

兩人alpha>0都是1個連通塊、不透明直切透明的硬邊像素0，PNG與lossless WebP解碼逐像素差異0。邊緣已在白底、深底與alpha放大查看；這是影像檢查，不等於人工美術百分之百通過。

## 姐姐改動與不變證明

最終修改y363～375，共261個RGBA像素；最大新增寬度每側3px，整體沒有縮放、非等比拉伸或改姿勢。胸口可見衣料y349：93→93px，0%；腰y369：93→96px，+3.23%。胸口被長髮和荷葉遮住，本輪保留，不為湊胸寬動頭髮。

對39b59fe：y0～362（包含頭與大部分長髮）差異0、其餘長髮保護遮罩差異0；腿腳y520～719差異0；腰帶及以下y376～719差異0。頭與身體接合相對位置沒有平移。兩張expr各自與自己的cast9版本比較，頭腿差異同為0；avatar檔逐位元相同。驗證腳本與sister-edit.json、sister-protected-mask.png、validation.json都有保存。

## 遊戲對齊：逐檔與行號

|檔案與行號|改動／查核結果|
|---|---|
|js/portraits.js:37|精靈540×800、feet765、髮頂132、下巴320.5、帽頂7、輪廓和臉界同步|
|js/portraits.js:32–35|僅校正飛飛684、阿飄684、西卡685、布魯685的實際腳底；素材不動。既有686／687會使實際鞋底偏離1～3px|
|js/portraits.js:129–168|只有精靈／姐姐資產加?v=cast10，含avatar、閉／張嘴、主圖fallback；fallback比檔名先去query|
|data/cast-metrics.json:29、37、45、53、63–77|四個腳底座標與精靈整組尺寸同步JS|
|css/quality.css:3181–3185|解除640px story-stage的overflow:hidden（共用容器根因，避免其他場景照樣被裁），保留story外層視窗裁切；解決桌機陪襯被整人裁掉|
|index.html:22、381|quality.css與app.js改?v=cast10，避免讀舊CSS／入口|
|js/app.js:6、10|story及portraits模組改?v=cast10|
|js/story.js:3|portraits依賴同步?v=cast10|
|assets/chars/spirit.png、spirit.webp|540×800，腳底765，lossless WebP同步|
|assets/chars/expr/spirit-happy.png、spirit-happy-open.png|同為540×800，頭型與腳底一致，閉嘴只改嘴部|
|assets/chars/avatars/spirit.png|從新圖裁頭像256×256|
|assets/chars/jiejie.png、jiejie.webp、expr/jiejie-happy.png、expr/jiejie-happy-open.png|同一腰身小改動同步；姐姐avatar不需改且位元一致|

其餘尺寸假設查核：css/quality.css:3015–3020雖有540／720預設，但applyCastMetrics以inline變數覆蓋；3093–3110使用img-h與feet算高度及透明底邊距，已支援不同畫布，不必硬改預設。story.js:103–144讀metrics計內容框，146–378負責橫向排版，無寫死720腳底。data/game.json主圖路徑不變；orders-ui.js經avatarSrc取得新頭像。沒有service worker／cache storage需同步；WebP雖目前story讀PNG仍已重出。

哈特expr實際腳底700，故其metadata維持700；主圖腳底685但原檔不可改。哈特既有主圖fallback可能浮空約10CSS px，這輪沒有擴大處理。其他人的畫布尺寸完全不變；「y685」是共用美術基準，飛飛／阿飄alpha≥128最低實像素為684，故定位採實際值，不偷偷移圖。

## 實際驗證

以獨立Playwright瀏覽器建立臨時測試暱稱，初始化完成後直接啟動真實story模組測試對話；不讀寫我的王日常Chrome或登入資料。這是story畫面驗證，不是遊戲完整通關。桌機1100×820、手機390×844、橫式844×390，pageerror全0，新圖尺寸載入正確，皇冠／鞋底未裁切。

正式截圖含對話框；另存-feet診斷圖只隱藏對話框露鞋底。game-alignment.png是實際截圖拼版。還有獨立像素診斷：保持同一DOM座標與尺寸，只去背景／陰影／UI，逐個角色截圖，量最大輪廓的最底一列，不使用feet metadata去推結果。

- 1100×820：spirit y688、bulu y688、jiejie y688；差0px。
- 390×844：spirit y712、bulu y712；差0px。
- 844×390：spirit y270、bulu y269、jiejie y269；差1px。

橫式1px是小倍率取樣邊緣差；CSS加來源alpha的連續座標差不超過0.011px。手機依遊戲原排版只顯示一位陪襯，不強塞第三人。七人照用真實visualScale(vh820,role1)畫主圖，再以實際鞋底對齊；是七人比較展示，不能誤稱遊戲同時顯示七人。

4組Node測試通過（cast10尺寸／快取／fallback、board-layout、daily-reset、events）；沒有用代數恆等式冒充地面驗證。像素與雜湊檢查由validate.py，實際渲染由game-check.mjs＋pixel-ground.py。

## 哈特雜湊

SHA256：99e828263d17ba27db7db67ef0e55c207e00a71eb59016ae731b905a3e2c1b0d。
與5b125dc和39b59fe的assets/chars/hate.png逐位元完全相同，所有哈特素材都沒有改。

## 互審與未完成項

小頌只看圖、讀程式／JSON；其session不能執行Python，因此未獨立重算像素。他已確認原型設計恢復、姐姐接縫修正通過。初次指出的桌機裁切與截圖初始化競態已修；最後小頌確認必修全部解除、可簽；仍保留頭高與畫風由我的王驗收。完整往返另存review-xiaosong.md。

精靈頭高較短，head/span=0.298，遊戲visualScale走只對齊身高分支；顯示頭高約主參考87%。沒有宣稱所有頭身比例都達標。臉圓／眼睛大／刺繡邊寬等畫風差異與頭面積-5.1%仍待我的王看圖接受。沒有發布、merge、main推送、release tag或Drive安裝包；這輪是指定draft分支審稿，不當作已驗收正式版本。

另加1100×820布魯＋姐姐（無精靈）對照，確認共用容器修法也解除原有裁切，圖見game-1100x820-without-spirit-feet.png。

## review內所有PNG完整相對路徑

- `review/cast10/before-after-sister.png`
- `review/cast10/before-after-spirit.png`
- `review/cast10/cmp-seven.png`
- `review/cast10/edges-sister.png`
- `review/cast10/edges-spirit.png`
- `review/cast10/game-1100x820-feet.png`
- `review/cast10/game-1100x820-without-spirit-feet.png`
- `review/cast10/game-1100x820-without-spirit.png`
- `review/cast10/game-1100x820.png`
- `review/cast10/game-390x844-feet.png`
- `review/cast10/game-390x844.png`
- `review/cast10/game-844x390-feet.png`
- `review/cast10/game-844x390.png`
- `review/cast10/game-alignment.png`
- `review/cast10/game-sole-pixels.png`
- `review/cast10/mask-bulu.png`
- `review/cast10/mask-spirit.png`
- `review/cast10/overlay-spirit-vs-blue.png`
- `review/cast10/sister-changes-mask.png`
- `review/cast10/sister-protected-mask.png`
- `review/cast10/sister-review-crops.png`
- `review/cast10/source/proportion-guide.png`
- `review/cast10/source/spirit-built-in.png`
- `review/cast10/source/spirit-original-main.png`

## 範圍與清理

沒有用即夢／點數／付費API／AppleScript控制Chrome；未碰PR #4、fantaco-jimeng、photo-live-beauty、threads-revival。沒有密鑰寫進報告或log。只用本次TMPDIR暫存，交付前刪除；本機8799測試server與Playwright收尾關閉。沒有啟動PS／Illustrator，收尾pgrep確認無程序。
