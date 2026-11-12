# cast10 來源與方法

使用 Codex 內建 image_gen 與本機 Pillow／numpy／OpenCV；沒有即夢、付費 API、AppleScript 或外部生圖服務。小頌只讀交叉檢查。

精靈原設定：`git show origin/main:assets/chars/spirit.png`，另存 `source/spirit-original-main.png`。布魯主圖作比例參考，飛飛主圖作自然感參考。`source/proportion-guide.png` 是布魯與原帽的構圖示意，只餵給內建生圖參考；沒有把示意拼進最終成品。最終成品來自一次完整全身輸出 `source/spirit-built-in.png`，沒有把原臉搬貼或局部放大。中間多次生成用來收斂比例與原型，未採用圖不保留。

最後一次實際提示詞：

> Redraw complete FIRST elf coherently with original design fidelity from SECOND reference. Important corrections: original hair is a blue textured fluffy hair circlet with visible BLACK natural hair underneath around forehead and both temples/sideburns; restore BLACK hair under blue circlet like second reference. Original coat is DARK ROYAL BLUE all-over ornate GOLD floral woven patterns across entire jacket body and sleeve cuffs, NOT plain bright blue with gold only on front lapels. Restore all-over gold floral brocade while retaining puff sleeve diamond quilting. Retain original SIX colourful pompoms on tall gold crown, exactly same large crown size as first. Keep pose wave+hip, striped blue-white wide trousers white sneakers. Anatomy target: make head slightly TALLER naturally (not wider): hair top at125, chin333 on540x800 logical canvas, face width134 same as first; friendly original more oval face rather than overly circular baby face. Torso chin-to-waist148 => waist481, crotch551, feet765. Legs214 and total uncrowned640. Three main gold ruffled shirt tiers, slim blue waistband like original. No pasted face, no stretching, redraw entire figure naturally. Crown tip within canvas around5, cannot shrink crown. Smooth transparent alpha clean outline no background or specks. No words.

第一參考是前次整人生成的候選，第二參考是 origin/main 原設定。提示詞中的目標數字不當作實測數字，實測另見 measurements.json。

後製：整張單一倍率縮放，水平／垂直只因整數像素取整有不到1px的差別；刪獨立alpha碎點、alpha外緣0.30px柔化，放到540×800。精靈沒有局部形變、液化或拼貼。整張縮放與平移參數見 normalization.json。閉嘴表情只補嘴部區域，頭型和尺寸不變。

姐姐基準全部取39b59fe。只在腰帶上方露出的布料邊緣增加最多3px，窄描邊平移並補鄰近衣料色；不縮放身體或中央圖案。遇到髮絲保護區則整個側邊跳過，y376以下全還原，因此亮片腰帶沒有逐列錯位。最終改動僅y363～375共261像素。兩個表情套用同一身體差異，頭各自保留原像素，頭像檔不需要重出且檔案位元不變。

量測：腳底、分腿點由程式測出；髮頂／下巴／腰帶中線與臉界多邊形為人工標定，有約1～2px判讀誤差。headArea包含尖耳、排除帽子；hair為頭部扣臉與耳，含藍髮圈和黑髮。黑鬢角與膚色邊界有分割誤差，不能當解剖真值。頭部面積-5.1%是實測結果，不改遮罩湊合格。
