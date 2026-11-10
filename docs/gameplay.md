# v9 玩法整合

以 main 877e91a 的畫面與元件為準，CSS、素材、首頁與地圖不覆蓋。

- 四張訂單固定一簡單、兩中等、一困難；既有訂單保持位置，物品 UID 預留不互搶。
- 相鄰合成沿用 main 的揭霧元件。花園沿用 main 的 45 秒自動產出，滿盤等空位，不消耗能量。
- 拖到不能放的格子會顯紅並彈回；拖到下方魔法袋可收納。滿袋不移除來源。
- 交單與袋子取物在動畫結束時重新核對物品，避免連點或同時拖曳造成複製／遺失。
- 進度寫到 localStorage 的 fantaco.mianhuatang.save.v3；讀取 v3、v2、v1，保留舊鍵作備份。內部 schemaVersion 保持 4。
- 舊袋超過 20 格仍可完整取用，新購上限與星星種子價格沿用 main。
- 不觸發連擊；音樂與音效開關、音量及畫面沿用 main，選擇會保存。

## 本機驗證

無建置步驟，以本機 HTTP 靜態伺服器開啟 index.html。

`node --test tests/*.test.mjs`

瀏覽器驗證使用既有 Playwright，不需安裝新依賴：設定 `PLAYWRIGHT_MODULE` 為 Playwright 的 index.mjs 絕對路徑、`SCREENSHOT_DIR` 為輸出目錄、`TEST_URL` 為本機網址，再執行 `node tests/browser-flow.mjs`。

測試使用受控資源與到期時間加速流程，再透過真實頁面點按／觸控拖曳執行交易；這不是實體 iOS Safari 或長時間農材料驗收。靜態網站沒有安裝包；玩家 localStorage 不包含在原始碼備份內，也未啟用雲端資料庫。
