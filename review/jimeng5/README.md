# 第五輪對照圖

修改前取自 commit 77051cd3a250dfbe98970546e21e92cdf1808c45，修改後為本輪素材。放大採最近鄰，方便看清實際像素，未替成品額外平滑。

眨眼眼嘴空白：左10.18px、右10.66px；開心MP4與WebM逐幀最低9.30px；480px GIF最低5.71px，等比例換算720px為8.57px。以亮度Y=0.2126R+0.7152G+0.0722B<240判為線，8鄰接連通；眼嘴最近像素中心距離減1px作為邊緣空白。臉部ROI隨動畫移動、旋轉，排除頭框，不刪除小連通塊。眨眼與三種開心動畫全120幀皆為3塊。

GIF實際使用18個不透明色（含白色、藍灰與16個中間色），另有透明索引；480×480、120幀、5000ms、無限循環、首尾相同，709,578 bytes。外緣仍是GIF二值透明，內部有抗鋸齒。MP4與WebM提高編碼品質以避免亮度240門檻下的孤立壓縮雜點。

- `review/jimeng5/blink-eye-mouth-before-after.png`
- `review/jimeng5/gif-antialias-before-after.png`
- `review/jimeng5/pose-before-after.png`
- `review/jimeng5/rose-grip-before-after.png`
- `review/jimeng5/style-compare.png`

完整量測見 `assets/jimeng/redraw-validation.json`。官方眨眼參考只有頭部、嘴型不同，此處僅比較眼睛和嘴角的相對位置。
