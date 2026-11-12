# 飛飛表情去背修復：第 2 輪（最後一輪）

## 回應小頌第 1 輪審查

1. 八張非開心 expr 的裙襬、腿、鞋子外圈藍灰線：擴至全身清除。距 alpha≥250 實心像素超過 2 px 的可見像素，以及對齊參考內部以外的青藍細線，alpha 歸零，再清除脫離塊。每張第 1 輪與第 2 輪放大對照見 `round2-edge-*.png`（米色／草綠底）。
2. sad、worried 頭像右側髮線：套用相同全圖清理，與其他飛飛圖一起檢查。
3. 原先只量頭髮的光暈指標不足：保留舊指標，但另加全身 `outer_ring_pixels`。使用 scipy 歐氏距離，實心定義 alpha≥250、距離 >2 px；與小頌上一份未附程式的量法數字略有差異，因此不冒稱相同量法。表內同一套算法重算三個版本。
4. 眼睛原有灰藍色塊不改 RGB；裙襬與腿部舊有描邊斷點本輪不補畫。這兩項列為已知限制。
5. 第 1 輪報告的舊「通過」已由後續獨立量測 FAIL 取代。本次結果以新的第 2 輪審查為準。上一輪完整交付報告保留在 `fantaco-logs/xiaoxia-final-feifei1-r1.md`。

開心版（happy 及預設頭像）不套用擴大的偏冷色清除，避免削薄原描邊；只保留全圖距離 >2 px 的外圈檢查。

第 2 輪相對 `4b227d8` 不新增補色、所有 RGB（包含透明像素）保持完全一致，只將選出的 alpha 改成 0。原本第一輪補洞的方法仍可從 `33ada91` 重現；累計補色數因本輪清掉少量邊緣像素而減少。

基準 `33ada9198ad30a6cf7271e8340d1276ad97f8e27`；只修改 16 張飛飛 PNG。全程 Pillow / numpy / OpenCV / scipy 與 headless Chromium；沒有生圖、付費 API、AppleScript、其他 worktree 操作。

## 遊戲使用位置

`js/portraits.js:134` 的 `avatarSrc`：happy 用 `assets/chars/avatars/feifei.png`，其他表情用 `avatars/feifei-<表情>.png`。`js/orders-ui.js:185` 的訂單呼叫這個入口。`avatars/feifei-happy.png` 雖不是目前 happy 的直接入口，也一併修正。

`js/portraits.js:140` 的 `portraitSrc` 與 `js/story.js:414,478`：故事讀取 `expr/feifei-<表情>.png`，說話時讀 `-open.png`。共 5 表情 × 2 張。四種表情破洞嚴重，happy 主要是藍邊。沒有這些表情的 WebP 對應檔；`assets/chars/feifei.webp` 是原版全身備援，非本輪表情衍生檔，與核准參考 `assets/chars/feifei.png` 一起保持不變。

CSS、JS、其他角色、米色圓形頭像底、綠色可交付框均未更動。訂單截圖可確認兩種 UI 底仍保留。

## 方法與統計定義

`repair.py` 每次從 git 基準讀取，SIFT 特徵配對及 RANSAC 仿射對齊核准參考圖；矩陣與有效配對數記在 `counts.json`。參考 alpha 向內縮 1 像素後作內部區域，另補參考支持的封閉洞。完全透明的頭髮、髮夾、背帶等洞取對齊參考色；眼部使用兩個橢圓範圍，洞取原圖周圍原有深色；參考色太亮的洞也改取周圍深色，避免對齊誤差把膚色搬進頭髮。頭像先縮至參考尺度配對，保留原表情的白色高光。所有原本 alpha > 0 的像素 RGB 完全不動，只修 alpha。原本有色但半透明的內部區域補回 alpha 255。

青藍色判定只用於頭髮區（不含水壺）：B > R×1.05、G > R×1.02、B−R > 2；alpha 歸零。主體外脫離且不在參考內部的連通塊移除；外緣僅局部 3×3 平滑與淡邊清除，最後移除所有脫離主體的碎片。

下表「透明洞」是參考內部 alpha=0 的 8 鄰接連通塊數／面積；「缺損」另含 alpha<250 的半透明內部，不應混稱為全透明洞。碎片為主體外、不在參考內部的脫離連通塊（獨立檢查另列全部脫離塊）（獨立檢查另列全部脫離塊）（獨立檢查另列全部脫離塊）。光暈是上述頭髮青藍色像素數，不是所有美術瑕疵的人工數量。各指標都用固定對齊區域量測修前與修後；零表示此定義下清除，不能當成無條件的視覺完美保證。填補數是原 alpha=0、修後可見的像素；可能含封閉洞與邊緣，與向內縮遮罩的洞面積不必相同。

| 圖檔（assets/chars/ 下） | 透明洞數/面積 前→後 | 缺損數/面積 前→後 | 碎片數 前→後 | 光暈像素 前→後 | 補色像素 | 補洞方法 |
|---|---:|---:|---:|---:|---:|---|
| avatars/feifei-determined.png | 396/19690 → 2/2 | 672/59830 → 2/2 | 12 → 0 | 4001 → 0 | 19691 | 參考對齊取色＋眼部鄰近深色 |
| avatars/feifei-happy.png | 0/0 → 0/0 | 72/111 → 0/0 | 6 → 0 | 4718 → 0 | 0 | 無全透明洞補色；僅 alpha／藍邊整理 |
| avatars/feifei-sad.png | 442/16870 → 2/3 | 706/58778 → 2/3 | 16 → 0 | 4023 → 0 | 16876 | 參考對齊取色＋眼部鄰近深色 |
| avatars/feifei-surprised.png | 370/18203 → 2/3 | 755/60130 → 2/3 | 18 → 0 | 4849 → 0 | 18238 | 參考對齊取色＋眼部鄰近深色 |
| avatars/feifei-worried.png | 402/19342 → 3/3 | 717/62273 → 3/3 | 19 → 0 | 4264 → 0 | 19362 | 參考對齊取色＋眼部鄰近深色 |
| avatars/feifei.png | 0/0 → 0/0 | 123/437 → 0/0 | 8 → 0 | 3373 → 0 | 0 | 無全透明洞補色；僅 alpha／藍邊整理 |
| expr/feifei-determined-open.png | 412/11459 → 1/1 | 212/21966 → 1/1 | 3 → 0 | 2214 → 0 | 11614 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-determined.png | 412/11459 → 1/1 | 212/21966 → 1/1 | 3 → 0 | 2214 → 0 | 11614 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-happy-open.png | 0/0 → 0/0 | 0/0 → 0/0 | 0 → 0 | 2331 → 0 | 0 | 無全透明洞補色；僅 alpha／藍邊整理 |
| expr/feifei-happy.png | 0/0 → 0/0 | 0/0 → 0/0 | 0 → 0 | 2300 → 0 | 0 | 無全透明洞補色；僅 alpha／藍邊整理 |
| expr/feifei-sad-open.png | 342/13867 → 0/0 | 192/24815 → 0/0 | 99 → 0 | 1843 → 0 | 13965 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-sad.png | 429/9561 → 0/0 | 234/21146 → 0/0 | 20 → 0 | 2075 → 0 | 9753 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-surprised-open.png | 406/9865 → 0/0 | 207/21288 → 0/0 | 42 → 0 | 2440 → 0 | 9911 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-surprised.png | 406/9865 → 0/0 | 207/21288 → 0/0 | 42 → 0 | 2440 → 0 | 9911 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-worried-open.png | 378/10438 → 0/0 | 232/22199 → 0/0 | 11 → 0 | 2381 → 0 | 10579 | 參考對齊取色＋眼部鄰近深色 |
| expr/feifei-worried.png | 378/10438 → 0/0 | 232/22199 → 0/0 | 11 → 0 | 2381 → 0 | 10579 | 參考對齊取色＋眼部鄰近深色 |

### 獨立檢查（不使用參考遮罩）

直接對全圖 alpha 做封閉零透明區、全部脫離連通塊、全圖青藍色統計。封閉零透明區含髮絲間隙／手臂縫隙，青藍色含水壺等原設計，所以此表不要求全零，也不把這些值全部叫作瑕疵。參考遮罩內補洞歸零僅代表修補範圍通過，須配合此表與深淺底目視對照。

| 圖檔 | 全圖封閉零透明區 數/面積 前→後 | 全圖青藍像素 前→後 | 全部脫離塊 前→後 | 對齊有效配對 |
|---|---:|---:|---:|---:|
| avatars/feifei-determined.png | 387/11292 → 53/845 | 6407 → 2400 | 39 → 0 | 19 |
| avatars/feifei-happy.png | 0/0 → 2/807 | 7768 → 3050 | 6 → 0 | 118 |
| avatars/feifei-sad.png | 377/7210 → 17/869 | 7112 → 2915 | 35 → 0 | 24 |
| avatars/feifei-surprised.png | 338/7106 → 29/908 | 7735 → 2781 | 50 → 0 | 34 |
| avatars/feifei-worried.png | 365/10709 → 28/900 | 7092 → 2758 | 46 → 0 | 36 |
| avatars/feifei.png | 2/2 → 6/566 | 6080 → 2705 | 8 → 0 | 98 |
| expr/feifei-determined-open.png | 317/4080 → 6/628 | 4746 → 1543 | 41 → 0 | 70 |
| expr/feifei-determined.png | 317/4080 → 6/628 | 4746 → 1543 | 41 → 0 | 70 |
| expr/feifei-happy-open.png | 3/48 → 4/646 | 4835 → 2504 | 0 → 0 | 328 |
| expr/feifei-happy.png | 3/48 → 4/617 | 4835 → 2535 | 0 → 0 | 329 |
| expr/feifei-sad-open.png | 220/4267 → 4/679 | 4284 → 1651 | 107 → 0 | 71 |
| expr/feifei-sad.png | 318/3726 → 8/665 | 4672 → 1614 | 29 → 0 | 93 |
| expr/feifei-surprised-open.png | 281/3393 → 4/655 | 5133 → 1588 | 44 → 0 | 100 |
| expr/feifei-surprised.png | 281/3393 → 4/655 | 5133 → 1588 | 44 → 0 | 100 |
| expr/feifei-worried-open.png | 272/5162 → 5/651 | 5048 → 1540 | 21 → 0 | 114 |
| expr/feifei-worried.png | 272/5162 → 5/651 | 5048 → 1540 | 21 → 0 | 114 |

## 證據與驗證

每張眼睛／頭髮／邊緣的深底、米色底放大對照：`before-after-avatars-feifei*.png`、`before-after-expr-feifei*.png`（16 張）；總覽 `overview-before-after.png`，每組左修前、右修後。`counts.json` 有逐張數字、補法、對齊資訊；`validation.json` 有逐張 RGB 數字。

沿用指定 `/Volumes/外接資料碟/ai-lab/fantaco-logs/mobile1-rgb-check.py`，原檔未改，本資料夾 `rgb-check.py` 是完全相同的副本。16 張均通過；兩邊 alpha≥250 的 RGB p99=0、max=0。更嚴格檢查：原本任何 alpha>0 的像素 RGB 最大差也是 0。尺寸全數不變。

390×844 headless 遊戲畫面：`before-game-<表情>-390x844.png` 與 `after-game-<表情>-390x844.png`，另有 `-open-390x844.png`，5 種表情 × 閉嘴/張嘴 × 前後＝20 張；訂單前後 `before-game-order-390x844.png`、`after-game-order-390x844.png`，合計 22 張。`capture.mjs` 使用真實遊戲頁，注入驗收劇情；張嘴版透過正式 portraitSrc 選圖凍結。這不是從新局自然通關的證明。`browser-check.json` 記錄來源與零頁面錯誤。

重跑：先用外接碟 TMPDIR，執行 `~/media-tools/venv/bin/python review/mobile-fix/feifei-fix/repair.py`；本機 127.0.0.1:8893 啟動此專案，source guizang-env.sh 後執行 `node review/mobile-fix/feifei-fix/capture.mjs`。修前圖片由 git 讀取，不建立或修改其他 worktree。

## 範圍與未完成項目

尚未由我的王在 iPhone 實機目視驗收；不宣稱修復之前未重現的 iPhone 淡色方塊。未 merge、未推 main、未部署。PR #7 維持 draft；後續正式發布仍需另行處理素材快取版本，本輪不改程式/UI。沒有新增正式 release tag 或 Drive 發行包（這是既有 draft PR 的素材修復）。

## 小頌只讀交叉檢查

第 1 輪後續獨立量測判 FAIL；第 2 輪目視＋程式碼審查 PASS，縮小 happy 清理範圍後再次確認維持 PASS；小頌環境阻擋 Python，未獨立量測。結論記錄於 `review-result.md`。

比對核准 `assets/chars/feifei.png`：左右外側髮絲原本就有分岔輪廓，中間殘留青藍底。happy 系列第一輪將這些青藍區改透明，故獨立封閉透明區面積增加；不是挖掉棕色頭髮。原本可見棕色髮絲 RGB 保留，左右分岔見總覽及前後放大圖。determined 放大仍有輕微像素階梯／深點，手機尺寸不明顯，未為消除它而重畫或改原 RGB。

三組 determined、surprised、worried 的閉嘴／open 在起點就完全相同，本輪保留既有狀態，不擅自改嘴形。這是既有素材限制，不宣稱五種表情都有獨立張嘴設計。

## 全身外圈細線（第 2 輪新增）

此數字與清除條件同源，歸零不是獨立視覺證據，須搭配米色／草綠底目視。

| 檔案 | 起點→第1輪→第2輪 外圈像素 | 本輪清除像素 |
|---|---:|---:|
| avatars/feifei-determined.png | 17072 → 117 → 0 | 164 |
| avatars/feifei-happy.png | 395 → 0 → 0 | 0 |
| avatars/feifei-sad.png | 18967 → 191 → 0 | 245 |
| avatars/feifei-surprised.png | 18073 → 8 → 0 | 173 |
| avatars/feifei-worried.png | 18357 → 57 → 0 | 114 |
| avatars/feifei.png | 52 → 3 → 0 | 3 |
| expr/feifei-determined-open.png | 5878 → 263 → 0 | 1041 |
| expr/feifei-determined.png | 5878 → 263 → 0 | 1041 |
| expr/feifei-happy-open.png | 11 → 0 → 0 | 0 |
| expr/feifei-happy.png | 11 → 0 → 0 | 0 |
| expr/feifei-sad-open.png | 5951 → 194 → 0 | 509 |
| expr/feifei-sad.png | 6502 → 243 → 0 | 931 |
| expr/feifei-surprised-open.png | 6526 → 220 → 0 | 983 |
| expr/feifei-surprised.png | 6526 → 220 → 0 | 983 |
| expr/feifei-worried-open.png | 6806 → 313 → 0 | 1139 |
| expr/feifei-worried.png | 6806 → 313 → 0 | 1139 |

新增清除總數 8465 像素；累計補色 162093 像素。角色內部水壺的藍色保留。頭髮光暈與全身外圈是不同指標，不相加。
