# cast9 第 2 輪（最後一輪）：姐姐已修正，整體仍未通過

這份整份取代上一輪報告。第1輪報告保留在 `/Volumes/外接資料碟/ai-lab/fantaco-logs/xiaoxia-final-cast9-r1.md`。不是全部完成、不是發布許可。
起點：cast8 最終 HEAD `65216ca`；本輪接續第1輪與小頌審查 HEAD `6178f43`，沒有重置歷史。
本輪素材提交：`8c843e69f9a7c502cb6202b70b3e428ed41985bd`。只在 `xiaoxia/cast-redraw-v2`，PR #5 維持 draft。

## 逐項回應小頌第1輪

1. 精靈沒有加高：仍未解除。原帽高約120px、不含帽身高至少622.25px、腳底y685，帽頂必須到y−57.25；三項無法同時滿足。已送出畫布加高／帽子縮小／接受身高未達標選項，尚未收到決定，不擅自違反任一項。540×800也必須把腳底改成y765才能增加頭頂空間；單加畫布底部無效。精靈仍為cast8，不宣稱已修。
2. 精靈局部放大的大頭感：未解除，因正式圖仍是cast8。待尺寸取捨後才能完成全身重畫與整合。
3. 姐姐臉不是原設定：重新整人繪製，以origin/main原圖為身份基準，恢復柔和圓眼、腮紅、微側臉、偏右蝴蝶結。不是原臉逐像素搬貼，也不宣稱完全相同。小頌本輪目視認為比cast8自然、原型臉可接受。
4. 姐姐比例：頭部面積由+19.5%降至+1.1%，身長由−19.7%改為+3.1%。頭高−12.0%、頭身比−9.8%、臉寬−7.5%，仍未全達標；為保自然五官與髮型，不局部放大頭或扭曲臉。總高−2.4%。長髮的髮量、袖子加頭髮的肩外輪廓仍大於布魯，完整列數字。
5. 小差異：蝴蝶結恢復偏右、抬手恢復眼睛附近（仍低於原設定），裙子與袖子依原型重畫，細節不逐線相同；裙擺層數與露腿長度不能稱完全恢復原設定。腳踝仍收細但整段腿已加粗。襪子「原圖2條、新版3條」是第1輪誤判：原圖與新版兩腳各取三條直線，全部都量到3條，小頌同意更正。
6. expr、avatars未同步：姐姐已同步主PNG／lossless WebP、happy閉嘴／happy-open張嘴、avatar及js/portraits.js、data/cast-metrics.json。閉嘴只用本機補嘴部小區域的膚色和笑弧，臉型、頭髮與身體不變；精靈仍未定案，沒有改其衍生檔。
7. 遊戲不同高度支援：本輪沒有改精靈畫布，不能說已驗證不同高度。姐姐已在實際story模組的測試對話載入，桌機1100×820、手機390×844，圖片成功、pageerror為0；這是對話場景檢查，不是完整遊戲通關。既有對話框會遮到鞋子，另附隱藏對話框的診斷截圖供對齊檢視，沒有修改正式對話框。

## 使用的原設定與方式

`git show origin/main:assets/chars/jiejie.png`、`git show origin/main:assets/chars/spirit.png`。布魯 `assets/chars/bulu.png` 為比例標準；飛飛 `assets/chars/feifei.png` 為視角、自然感、腿寬參考。cast8對照取 `65216ca`，哈特取 `5b125dc`。
只用Codex內建生圖與本機Pillow/numpy/OpenCV。姐姐全身重畫，未用液化、非等比拉伸、凸透鏡、膨脹、局部放大頭。後製整張單一倍率0.47810481等比縮小，透明540×720、alpha≥128腳底y685。移除來源324個分離像素，最高alpha僅2/255；外緣0.30px alpha柔化。採用來源 `review/cast9/source/sister-built-in-r2.png`；方法腳本存review/cast9/scripts/。

# cast9 第2輪量測

沿用小頌量法，姐姐重新定位；布魯與姐姐本輪實測，精靈像素未改，沿用已核對的cast8數字。
姐姐髮頂46、下巴236.5、腰388.5、腳底685。頭區遮罩見mask-sister-r2.png。
頭區多邊形排除舉手；耳朵排除y140以上髮絲高光。肩外輪廓包含頭髮及袖子，不是肩骨寬。裙子遮住分腿點，不捏造腿長。

|項目|布魯|姐姐（差距）|精靈（差距）|
|---|---:|---:|---:|
|頭高／不含帽總高|0.33053435114503815|0.2981（-9.8%）|0.3384（+2.4%）|
|臉寬|134|124（-7.5%）|130（-3.0%）|
|頭部面積|32965|33341（+1.1%）|31544（-4.3%）|
|髮量（下巴以上）|15088|22453（+48.8%）|15154（+0.4%）|
|肩外輪廓全寬|161|295（+83.2%）|205（+27.3%）|
|身長|147.5|152（+3.1%）|107（-27.5%）|
|腿長（分開點起）|214|未量／遮蔽|139（-35.0%）|
|總高不含配件|655|639（-2.4%）|560（-14.5%）|
|總高含配件|655|663（+1.2%）|680（+3.8%）|
|頭高|216.5|190.5（-12.0%）|189.5（-12.5%）|
|髮量含長髮|15088|34388（+127.9%）|15154（+0.4%）|
|腰到腳底|291|296.5（+1.9%）|263.5（-9.5%）|

## 姐姐與飛飛腿寬

同高y595：姐姐左右單腿57/57px；飛飛54/57px；比例105.6%／100.0%。
依小頌第2輪建議，主統計改取y580～610兩人都不含鞋子的中段：姐姐平均56.290px、飛飛55.871px，比例1.0075，約101%。兩人都是量外輪廓（姐姐襪子、飛飛裸腿）。y620腳踝仍只有45px，相對飛飛55／56px較細，不掩蓋局部差異。先前y572～632含襪口與鞋上緣的0.943只作歷史參考，不再當主結論。

## 魚眼、原設定與邊緣自我檢查

姐姐整人重畫，頭→脖子→肩膀連貫，五官未鼓起，沒有貼大臉或雙排瀏海；眼線接近水平但仍有微小角度，不宣稱精確0°。姐姐、哈特、精靈五官仍不同。臉寬為布魯92.5%，膚色臉面積約61.7%（瀏海覆額也造成差異），在同排會顯得臉較小。這是公開列出的取捨。
姐姐白底／深底／alpha放大已目視，未見明顯殘背景、斷線或光暈。alpha>0連通塊1，硬切邊像素0；這些不能代替逐像素的人工美術驗收。精靈仍保留cast8的舊問題，不聲稱乾淨通過。
小頌本輪只能目視與讀腳本，Python權限受限，**未獨立重算數字，也未做像素級邊緣驗證**。互審見 `review/cast9/review-r2-xiaosong.md`。小頌未畫圖、未改素材。

最後互審補充：遊戲的比例判定以0.341為基準，姐姐0.298偏低12.6%，會走「只對齊身高」分支，畫面頭高約基準87%；不能宣稱比例已對齊。CSS計算兩人腳底約y711.99，差距0.011px。閉嘴補片框邊與原圖RGB最大差6/255，未見明顯接縫。訂單畫面已用全新測試瀏覽器暱稱進入，姐姐頭像載入成功，截圖game-orders-mobile.png；未讀寫使用者的瀏覽器存檔。

## 哈特與驗證

哈特PNG檔案逐位元等於 `git show 5b125dc:assets/chars/hate.png`。
SHA256：`99e828263d17ba27db7db67ef0e55c207e00a71eb59016ae731b905a3e2c1b0d`。
沒有修改哈特任何素材。姐姐PNG/WebP解碼相同；閉嘴與張嘴表情僅嘴部小區域不同。既有3組node測試通過。布魯、飛飛、阿飄、西卡、精靈正式素材沒有改。

## 還沒做到與後續

精靈增高／自然化仍待使用者選擇尺寸例外。姐姐頭高、頭身比、臉寬未達±5%，揮手高度、裙層與露腿比例未完全等於原設定，長髮與袖子造成髮量／肩外輪廓大；不把這版稱作全數合格。未發布、未merge、不推main，沒有新增發布tag或Drive安裝包；這是未完成draft工作，不是完成版本備份。
同一PR追蹤即可，不另開排程或skill；本輪不寫長期記憶。後續由小夏在我的王選擇精靈方案後接續，仍需小頌互審與我的王看圖驗收。

## review 圖檔完整相對路徑

- `review/cast9/before-after-sister.png`
- `review/cast9/before-after-spirit.png`
- `review/cast9/candidate-sister-r2.png`
- `review/cast9/candidate-sister.png`
- `review/cast9/cmp-seven.png`
- `review/cast9/edges-sister.png`
- `review/cast9/edges-spirit.png`
- `review/cast9/game-orders-mobile.png`
- `review/cast9/game-sister-desktop.png`
- `review/cast9/game-sister-feet-diagnostic.png`
- `review/cast9/game-sister-mobile.png`
- `review/cast9/legs-sister-vs-feifei.png`
- `review/cast9/mask-sister-r2.png`
- `review/cast9/mask-sister.png`
- `review/cast9/overlay-sister-vs-blue.png`
- `review/cast9/overlay-spirit-vs-blue.png`
- `review/cast9/source/sister-built-in-r2.png`
- `review/cast9/source/sister-built-in.png`
- `review/cast9/xiaosong/cmp-seven.png`
- `review/cast9/xiaosong/edges-hate.png`
- `review/cast9/xiaosong/edges-jiejie.png`
- `review/cast9/xiaosong/edges-spirit.png`
- `review/cast9/xiaosong/legs-sister-vs-feifei.png`
- `review/cast9/xiaosong/naturalness-vs-feifei.png`
- `review/cast9/xiaosong/overlay-sister-vs-blue.png`
- `review/cast9/xiaosong/overlay-spirit-vs-blue.png`

## 範圍與清理

只推自己的分支，推送前再次確認branch；PR #5保持draft。未碰PR #4、fantaco-jimeng、photo-live-beauty、threads-revival。沒有即夢、付費API或AppleScript控制Chrome；沒有寫密鑰。Playwright只開本次本機測試瀏覽器，結束已關。未啟動PS／Illustrator，收尾再次以pgrep確認。暫存在外接碟TMPDIR，本次r2子目錄及Python快取收尾刪除，既有其他工作檔不刪。
