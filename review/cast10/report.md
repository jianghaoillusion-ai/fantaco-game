# cast10 第 2 輪（最後一輪）：姐姐腰帶與裙腰修正

基準：39b59feaf899ee8aa619b64c3391994c32eb98b0。分支：xiaoxia/cast-redraw-v2。PR #5 維持 draft；不 merge、不推 main，不碰 PR #4。
本輪 commit：以本報告所屬 git commit 為準；外部最終報告另填完整hash。
PR：https://github.com/jianghaoillusion-ai/fantaco-game/pull/5；遠端head已核對一致，isDraft=true。


## 逐項回應小頌第 1 輪審查

1. 姐姐改動看不出來：改為 y364～429，腰帶上緣 98→107px（+9.18%），中段 101→108px（+6.93%），左側延伸到上段裙腰再收回。胸、頭髮、腿腳保留。
2. 兩側方角與硬邊：改用平滑弧線引導邊緣窄帶平移及衣料補色，沒有縮放身體。右側在手上方收回，保留原手與腰帶的連接輪廓；8倍圖另存 right-junction-8x.png。alpha硬邊為0、連通塊1。
3. 精靈比例取捨：採小頌同一量法的髮量 +6.1%、頭高 −13.4%、頭身比 −10.2%，如實標示，按其建議保留通過的全身圖，不再拉頭。
4. 精靈設定差異：皇冠尖較粗短、外套較短、臉較圓、頭改站正仍存在，未宣稱逐線相同；保留第1輪通過結果，待我的王看圖接受。
5. 第1輪超出精靈的改動：四人的腳底數值校正與故事容器解除裁切保留，本輪未再調整。這使桌機陪襯角色可見，是既有行為變更，仍需我的王知情確認。
6. 精靈頭像：由新圖原始裁區重出512×512，沒有把舊256圖放大；身體、皇冠、兩張全身表情不變。

本輪免費使用本機 Pillow／numpy／OpenCV，沒有新呼叫生圖、即夢或付費API。沿用第1輪內建生圖來源。

## 結果與取捨

精靈540×800、腳底y765，皇冠沒有縮小；改成完整一人重畫，不是放大原臉再接縮小身體。姐姐540×720與腳底y685不變，微幅加寬腰身、腰帶與上段裙腰，頭腿完全不動。哈特主圖逐位元等於5b125dc與39b59fe。

不是所有數字都達標：小頌獨立量測髮量多6.1%，超過±5%約1.1個百分點；頭高與頭身比也較短。為保住自然感與已通過成果，本輪不改精靈。身長、腿長、不含帽總高、臉寬、頭面積都在±5%。

## 原設定與重畫方式

原設定 `git show origin/main:assets/chars/spirit.png`；姐姐與頭腿比較取39b59fe。比例基準 `assets/chars/bulu.png`，自然感參考 `assets/chars/feifei.png`。採用內建生圖完整全身來源 `review/cast10/source/spirit-built-in.png`，後製僅整張等比縮放、平移、清理alpha碎點與0.30px柔邊。原臉／原帽沒有貼回成品。來源、最後提示詞、方法與縮放參數見provenance.md與normalization.json。

皇冠按「藍色髮圈連通區頂端−全圖alpha≥128頂端」量：原設定156−33=123px，新版133−7=126px（+2.4%），沒有為塞進畫布縮帽。含帽總高與不含帽總高分開列；人工髮頂標132與色彩連通髮頂133相差1px。

## 精靈和布魯逐項比較

採小頌第1輪獨立量測，長度px、面積px²；本輪精靈主圖逐位元不變。頭部含耳不含帽，髮量含藍髮圈與黑髮，人工定位約1～2px誤差。原本我量的表仍保留於 r1 報告，不混用分割法。

|項目|布魯|精靈不含帽|差距|精靈含帽|
|---|---:|---:|---:|---:|
|頭高／不含帽總高|0.3305|0.2967|-10.2%|不計帽|
|頭高|216.5|187.5|-13.4%|不計帽|
|臉寬|134|128|-4.5%|不計帽|
|頭部面積|32965|31434|-4.6%|不計帽|
|髮量|15088|16005|+6.1%|不計帽|
|頭寬|204|215|+5.4%|不計帽|
|肩外輪廓寬|161|228|+41.6%|不計帽|
|身長|147.5|148.5|+0.7%|不計帽|
|腿長|214|223|+4.2%|不計帽|
|總高|655|632|-3.5%|758（+15.7%）|

精靈定位y：髮頂133、下巴320.5、腰469、分腿542、腳底765、皇冠頂7。JS的髮頂132是原來人工定位，與像素髮頂差1px，本輪不改通過的對齊。皇冠高126px，原設定123px；含帽確實更高。肩外輪廓包含泡泡袖，並非肩骨寬。

## 自然感與邊緣

自我檢查：頭、脖子、衣服連貫，無局部貼臉接縫、雙瀏海或魚眼。姿勢保留招手＋插腰，六顆彩球與尖耳齊全；黑髮與深藍金紋外套已依小頌意見重畫恢復。與飛飛相比，精靈站得較正、眼線較平，未做五官對稱拉伸。

兩人alpha>0都是1個連通塊、不透明直切透明的硬邊像素0，PNG與lossless WebP解碼逐像素差異0。邊緣已在白底、深底與alpha放大查看；這是影像檢查，不等於人工美術百分之百通過。

## 姐姐改動與不變證明

由39b59fe重新套用身體補色，不在第1輪補丁上累加。修改y364～429，共1558個RGBA像素；左側最大外擴6px，右側最大3px，右側在y374～385收回避開手，左側到y430收回。中央衣料不縮放、不非等比拉伸，只有外緣窄帶平移、採樣補色與抗鋸齒，沒有搬頭或腿。

|位置|改前px|改後px|差距|
|---|---:|---:|---:|
|胸口y349可見粉色衣料|93|93|0%|
|腰y369輪廓|96|100|+4.17%|
|腰帶上緣y375|98|107|+9.18%|
|腰帶中段y380|101|108|+6.93%|
|腰帶y384|103|109|+5.83%|
|上段裙腰y410|151|156|+3.31%|
|收回位置y430|183|183|0%|

腰／裙腰取alpha≥128的中央連通輪廓；胸衣料取粉色區，不把長髮算胸寬。y395右側接手，輪廓包含手，不能當純腰寬，所以未拿它宣稱腰寬比例。右側下段被插腰手遮住，維持原手位置，兩側擴寬幅度因此不完全對稱。

對39b59fe逐像素：頭（y0～362）差0、髮絲保護區差0、腿腳（y520～719）差0，實際y430以下全部相同。兩張expr各自與自己的cast9比較，頭腿差0；頭像檔逐位元相同。頭與身體接合位置不動。PNG與lossless WebP差0；完整數字見sister-edit.json、validation.json，腳本sister-r2.py。

## 遊戲對齊：逐檔與行號

|檔案與行號|改動／查核結果|
|---|---|
|js/portraits.js:37|精靈540×800、feet765、髮頂132、下巴320.5、帽頂7、輪廓和臉界同步|
|js/portraits.js:32–35|僅校正飛飛684、阿飄684、西卡685、布魯685的實際腳底；素材不動。既有686／687會使實際鞋底偏離1～3px|
|js/portraits.js:129–168|只有精靈／姐姐資產加?v=cast10r2，含avatar、閉／張嘴、主圖fallback；fallback比檔名先去query|
|data/cast-metrics.json:29、37、45、53、63–77|四個腳底座標與精靈整組尺寸同步JS|
|css/quality.css:3181–3185|解除640px story-stage的overflow:hidden（共用容器根因，避免其他場景照樣被裁），保留story外層視窗裁切；解決桌機陪襯被整人裁掉|
|index.html:22、381|quality.css與app.js改?v=cast10r2，避免讀舊CSS／入口|
|js/app.js:6、10|story及portraits模組改?v=cast10r2|
|js/story.js:3|portraits依賴同步?v=cast10r2|
|assets/chars/spirit.png、spirit.webp|540×800，腳底765，lossless WebP同步|
|assets/chars/expr/spirit-happy.png、spirit-happy-open.png|同為540×800，頭型與腳底一致，閉嘴只改嘴部|
|assets/chars/avatars/spirit.png|從新圖裁頭像512×512|
|assets/chars/jiejie.png、jiejie.webp、expr/jiejie-happy.png、expr/jiejie-happy-open.png|同一腰身、腰帶與裙腰修正同步；姐姐avatar不需改且位元一致|

其餘尺寸假設查核：css/quality.css:3015–3020雖有540／720預設，但applyCastMetrics以inline變數覆蓋；3093–3110使用img-h與feet算高度及透明底邊距，已支援不同畫布，不必硬改預設。story.js:103–144讀metrics計內容框，146–378負責橫向排版，無寫死720腳底。data/game.json主圖路徑不變；orders-ui.js經avatarSrc取得新頭像。沒有service worker／cache storage需同步；WebP雖目前story讀PNG仍已重出。

哈特expr實際腳底700，故其metadata維持700；主圖腳底685但原檔不可改。哈特既有主圖fallback可能浮空約10CSS px，這輪沒有擴大處理。其他人的畫布尺寸完全不變；「y685」是共用美術基準，飛飛／阿飄alpha≥128最低實像素為684，故定位採實際值，不偷偷移圖。

本輪程式只更新快取鏈：index.html:22、381，js/app.js:6、10，js/story.js:3，js/portraits.js:131，統一cast10r2；幾何、CSS、資料表維持第1輪。測試tests/cast10.test.mjs同步新版資產網址。

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

第1輪正式審查以xiaosong-review-cast10-r1.md為準，撤回舊報告「姐姐接縫已通過」的說法。本輪小頌先指出右側腰帶接手缺口，已修並補8倍並排證據。最後互審結果 PASS：右側尖角、白缺口、黑點消失，微幅豐滿自然。其本次session無shell量測權限，不能宣稱他獨立重算本輪數字。完整回覆見 review/cast10/review-xiaosong-r2.md。小頌提醒的上方原有凹角已核對y350～363、x295～334，RGBA差異0；validation與兩張表情圖已重跑。

精靈髮量與頭高差異、原設定造型差異，以及第1輪共用舞台行為變更仍待我的王看圖確認。沒有發布、merge、推main、release tag或Drive安裝包；本輪是指定draft分支審稿，不當作正式發布驗收。

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
- `review/cast10/right-junction-8x.png`
- `review/cast10/sister-changes-mask.png`
- `review/cast10/sister-protected-mask.png`
- `review/cast10/sister-review-crops.png`
- `review/cast10/source/proportion-guide.png`
- `review/cast10/source/spirit-built-in.png`
- `review/cast10/source/spirit-original-main.png`
- `review/cast10/xiaosong/alignment-check.png`
- `review/cast10/xiaosong/cmp-seven.png`
- `review/cast10/xiaosong/diff-sister.png`
- `review/cast10/xiaosong/edges-sister.png`
- `review/cast10/xiaosong/edges-spirit.png`
- `review/cast10/xiaosong/naturalness-vs-feifei.png`
- `review/cast10/xiaosong/overlay-spirit-vs-blue.png`

## 範圍與清理

沒有用即夢／點數／付費API／AppleScript控制Chrome；未碰PR #4、fantaco-jimeng、photo-live-beauty、threads-revival。沒有密鑰寫進報告或log。只用本次TMPDIR暫存，交付前刪除；本機8799測試server與Playwright收尾關閉。沒有啟動PS／Illustrator，收尾pgrep確認無程序。

收尾：測試網站與本次TMPDIR在提交前關閉／清除；未啟動Photoshop或Illustrator。
