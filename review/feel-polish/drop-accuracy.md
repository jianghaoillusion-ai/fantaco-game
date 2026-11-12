# 拖曳落點誤差

macOS headless Chromium、CDP touch input，沒有 iPhone 實機。每情境 63 格（7×9），共315次。以存檔 board 的實際位置判斷落格，視覺誤差由 drag-float 的 boundingClientRect 量得。

| 情境 | 平均誤差 CSS px | 最大誤差 CSS px | 誤判格數 |
|---|---:|---:|---:|
| iPhone 13 尺寸／DPR3 | 0.000014 | 0.000022 | 0/63 |
| iPhone 15 Pro 尺寸／DPR3 | 0.000012 | 0.000022 | 0/63 |
| iPhone SE 尺寸／DPR2 | 0.000019 | 0.000034 | 0/63 |
| 捲動80px／DPR2 | 0.000014 | 0.000022 | 0/63 |
| visualViewport 1.5倍／DPR3／正式拖曳模組隔離棋盤 | 0.000006 | 0.000011 | 0/63 |

圖示中心刻意在手指上方 **32 CSS px**；誤差是相對這個預期位置的殘差。手指命中與高亮一致，DPR不換算成CSS座標。小數只是浮點數殘差，不代表螢幕有百萬分之一像素精度。

前四項使用實際遊戲頁。捲動情境以測試 CSS 允許頁面移動，確認 scrollY=80。縮放測試用 drag-fixture.html 載入正式 drag.js，確認 visualViewport.scale=1.5 後測完63格；棋盤格30px、margin20px。正式頁原本禁止縮放，強制改meta後整頁重新排版不穩，**未宣稱正式頁縮放完整通過**。

safe-area 已包含在DOM rect，不重複加偏移；headless沒有瀏海硬體，需實機驗收。未覆蓋所有格邊1px、斜角、中途捲動、visualViewport offset非零、多指取消及iOS原生pinch。每格樣本在 drop-accuracy.json，隔離縮放原始結果在 zoom-accuracy.json。

重跑：drop-test.mjs 產出四個遊戲情境；zoom-test.mjs 產出隔離縮放情境。本檔合併兩者，不能把被viewport擋回1倍的嘗試列為縮放通過。
