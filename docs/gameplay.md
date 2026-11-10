# 玩法系統第四輪

正式地圖資料唯一來源是 `data/map.json`，沿用 main 的 `js/map.js`、`js/shop.js`、`js/world.js`。已移除草稿 map-regions-draft、map-adapter、map-loop、shop-logic，以及重複的 board-loop／daily-challenge／loop-ui；迷霧、每日挑戰與畫面掛勾使用 main 的 systems。

## 資料與交易

`regions` 每筆有穩定 `id`、`chapter`、`unlock`、`buildings`。解鎖條件沿用 `needRegion`、`needBuilding`（`id:等級`）、`needFlag`；成本使用 `coins`、`stars`，可另加 `items: [{chain,tier,count}]`（count 預設 1）。先檢查全部成本，再原子扣除；盤面與魔法袋的同一物品不會重複計數。已開區域不可再次扣款。

建築 `costs` 保留原本數字（金幣），也可用同格式成本物件。`need`、`xp`、`unlocks`、`clump` 沿用 main。所有修復必須先打開該區，滿等與條件不足不扣款。商店讀 `shop.items`，支援數字體力或 `energy: "full"`；滿體力、滿袋、尚未開區的商品不收費。

每週新增區域，只需在 `regions` 加資料與唯一 id，沿用既有章節即可；增加商品同樣只加 `shop.items`。測試以一個程式從未見過的區域與建築驗證解鎖、金幣／種子／道具扣款、修復、重讀。若新增全新故事章節，仍需由故事主責加入章節與故事內容。手繪美術及新區域預設位置由 PR #2 整合，本分支仍保留 main 的功能卡片地圖，並非 v4 手繪地圖成品。

## 給視覺分支的掛勾

`createMap(ctx)` 提供 `askUnlock(region)`、`confirmUnlockRegion()`、`restoreBuilding(building, region)`、`enterRegion(region)`；`createShop(ctx)` 提供 `buy(item)`。必須使用這些方法處理交易。

DOM 提供 `data-region-id`、`data-building-id`、`data-building-level`、`data-offer-id`。不要用 `data-level` 表示建築等級，該欄位是玩家 HUD。

成功交易後派發 document CustomEvent：

- `fantaco:region-unlocked`：`{id}`。
- `fantaco:map-repaired`：`{id, buildingId, step, complete}`。
- `fantaco:shop-purchased`：`{id}`。

持久狀態才是重讀後的依據，事件只供當次動畫。完整地圖不可由事件紀錄重建。

## 存檔與盤面

localStorage key 保留 `fantaco.mianhuatang.save.v2`，payload 升為 schema 4。區域開放用 `unlockedRegions`，修復等級用 `buildings`，目前區域用 `region`，迷霧用 `unlockedClumps`。未知的新區域／建築 id 不過濾，後續加資料可直接繼續。

舊 v1／v2／v3 的資源、章節、故事旗標、盤面、背包保留。v3 草稿兩步修復一次性對應至正式建築：village→stage、castle→hall、forest→lookout、candy→stall、bulu→lamp、hate→show、sky→fountain；第一步至少等級 1，完成兩步對應滿級。保留舊 map 紀錄與已解鎖生成器，不重複給獎勵。沒有 clumps 的舊盤面全開以免鎖住原物品；已有 clumps 則保留。未來 schema 拒絕降級。

所有裝置固定 7×9，只縮放格子。舊尺寸在載入時遷移一次，碰撞與多餘物品全數放入魔法袋，超出容量仍可取出、不截斷。既有擴充容量保留。新遊戲為 13 格相連島，修復或花金幣打開迷霧。生成器沿用 main 的 12 次產出／30 秒冷卻，體力 100 上限、90 秒恢復 1 點。

故事與無限訂單保留上一輪可取得性檢查；同時 2–3 張。每日挑戰沿用 main 的三張訂單獎勵，挑戰日期與每日禮物日期分開。無真錢、廣告或付費貨幣。只有瀏覽器本機存檔，沒有新增雲端資料庫。

## 驗證

`node --test tests/*.test.mjs`。包括 main 全部 35 張主線、12 張循環訂單、固定盤面、取消觸控、過期拖曳、交易失敗不改存檔、schema 遷移及資料新增區域。資源由測試直接配置，非完整農材料耗時驗收。

瀏覽器：`PLAYWRIGHT_MODULE=<既有 playwright/index.mjs> SCREENSHOT_DIR=<截圖資料夾> node tests/browser-flow.mjs`，先於 127.0.0.1:18765 啟動靜態伺服器。iPhone 15（393×852）、iPad（820×1180）驗證盤面、迷霧、修復、解鎖、商店、重讀及旋轉不丟物。實體 Safari 與手繪地圖拖曳／雙指縮放尚待 PR #2 整合驗收。

依本輪指示以 PR 交付，不另產出 zip 或 Drive 副本。
