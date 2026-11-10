# 玩法系統與數值

遊戲是免建置的靜態網站；用本機 HTTP 伺服器開啟 index.html。沒有付費、廣告或新套件。既有官方角色和主線文案保留，玩法以生成、二合一、交訂單、推進故事為循環。

## 可調整的資料

- data/game.json：體力上限 80，每 90 秒回 1 點，每次生成花 1 點；每日禮物沿用免費體力及星星種子。滿盤不扣體力，離線最多回滿，不累積超額點數。
- data/chains.json：星星 8 階、花園 8 階、糖果 8 階、森林 6 階、魔術 7 階、花茶 5 階。此版延伸糖果、森林、花茶三條鏈；新增階段重用現有素材，沒有新增官方造型。高階物品可成為循環訂單需求。
- 生成器 unlock 使用 start 或 story:<旗標>；花茶生成器在 v4 後免費取得，解決原本花茶只靠不可取得的二階花圃產出的問題。花圃二階仍有 8% 花茶加成，由 bonusDrops 控制。
- 訂單金幣＝5＋需求階數×5；星星沿用「星星種子」名稱。一般循環訂單經驗＝15＋階數×10，種子＝3＋階數×2；難單額外給 20 經驗、6 種子、6 體力。主線獎勵各自記在 story-orders.json。
- 主線全數完成後，每完成 5 張循環訂單前進一個探索區域。每兩個區域提高需求階數，保留簡單訂單；難度最高不超過各鏈最高階，之後繼續產生訂單與區域，不把數值無限膨脹。區域是可持續累積的探索進度，重用既有場景，沒有宣稱無限新美術或故事。
- 點選普通物品後可按出售騰出空格，每階換 1 金幣；生成器不能出售。金幣可用於本輪新增的地圖修復與遊戲內商店，沒有真錢交易。

## 儲存相容與驗證

沿用 localStorage 的 fantaco.mianhuatang.save.v2 key，接受 v1 舊資料遷移。v2 補齊 coins、endless、orderSeq 和巢狀預設；保留舊盤面、背包、獎勵、進度。寫入失敗時顯示提示，不假裝成功。存檔只在目前瀏覽器，既有 syncCloud 仍是 stub，不是雲端同步。

執行 `node --test tests/*.test.mjs`，不需安裝依賴（本次使用 Node 24）。gameplay.test.mjs 測試純玩法及儲存；app-flow.test.mjs 使用真實 app.js、JSON 與存檔邏輯，以模擬 DOM／音效驗證生成、合成、main 全部 35 張主線、12 張無限訂單、重讀、重複領獎保護、取消觸控及出售。

目前 18 項通過，另通過 JS 語法檢查與 git diff --check。流程測試直接配置訂單物品，驗證交付及狀態轉換，不代表以正常體力從零合成完所有高階物品的耗時或手感驗收。Chrome 已通過手機／iPad 四種視窗尺寸的操作流程；實體裝置 Safari 觸控與視覺分支的最終動畫仍待驗收。

## 第二輪：地圖與免費商店（schema 3）

主循環：生成／合成 → 交訂單領金幣、星星種子、修復木材 → 地圖消耗資源與指定物品分步修復 → 揭霧、解鎖生成器及下一區 → 回盤面。故事對白保持 main 原文；章節必須同時符合原故事條件與地圖門檻。既有存檔已到達的章節不重新上鎖。等級每修復一步 +1，交單 XP 仍保存但不再直接升級。

### 資料與數值

- main 尚未定義 map.json 格式，目前用轉接層，待對齊。`js/map-adapter.js` 載入 `data/map-regions-draft.json`；未建立 `js/map.js`、`js/shop.js`、`data/map.json`。正式格式由 main 負責。
- 暫定 7 區：微笑村、微笑城堡、魔幻森林、西卡的糖果屋、布魯的舞台、哈特的城堡、藍藍天。每區兩步，修完前區才可修下一區；微笑村與微笑城堡從開局可見。
- 第 i 區（從 0 起算）第 n 步（0/1）的消耗：金幣 `10+15i+10n`、星星種子 `2+i+n`、木材 `1+n`、指定鏈第 `2+n` 階一件。每步開 4 格並升 1 級。完成前五區依序取得 garden、tea、forest、candy、magic 生成器；原有故事來源也保留，避免改壞既有故事需求。
- 開局 12 格連通島，中心向外展開；格數預算與裝置尺寸分開保存。保留 main 選格數演算法，旋轉時重排到已開格；裝不下的物品送進可取出的超額魔法袋，不截斷、不免費擴充容量。
- 生成花 1 體力，冷卻 2 秒；優先最近一圈（含斜角）空格隨機落點，依序向外找。滿盤／沒體力／冷卻中不扣點。體力上限 80、90 秒回 1，保留離線回復。
- 同時 2–3 張角色訂單。main 新故事若未填金幣，介面轉接補 `5+需求階數×5`，不改故事 JSON。每單另給 1 修復木材。
- 每日挑戰：台北午夜重置，交 3 單領 10 星星種子，一天一次；原每日禮物另外保留。
- 魔法袋預設 8 格、上限 24；每次擴充一格消耗 `10+(目前容量−8)×5` 星星種子，材料獨立堆疊。點袋內物品即可取回盤面，棋盤物品可拖進已開啟的袋子。
- 商店：30 金幣換 20 體力、12 星星種子換 40 體力、15 金幣換 star 第 2 階、4 星星種子換 garden 第 2 階。體力最多補到上限；滿體力不收費。道具直接入袋，滿袋不收費。無真錢、廣告、付費貨幣。
- 交易先檢查所有貨幣、材料與實際物品，再一次扣款。修復重複操作不會多收錢或重複領獎。

### 存檔格式與相容

localStorage key 保留 `fantaco.mianhuatang.save.v2`，payload 的 `version` 與 `schemaVersion` 均為 3；避免遺漏使用舊 key 的玩家。讀不到 v2 時仍遷移 v1。

新增欄位：`map:{regions:{區域ID:已完成步數},unlockedGenerators:[],legacyChapters:[]}`、`fog:{openCount:12,legacyOpen:false}`、`magicBag:{capacity:8,materials:{wood:數量}}`、`challenge:{day:"YYYY-MM-DD",orders:0,claimed:false}`、`generatorCooldowns:{物品uid:可再次生成的時間戳}`。一般物品仍以 `inventory` 陣列為唯一正本，不複製一份到 magicBag。

舊 v2 的盤面、背包、資源、章節、故事旗標保留，舊盤面標記 legacyOpen，避免把原物品鎖進迷霧；其他欄位補預設。未知未來 schema 拒絕開啟／寫入，不降級覆蓋。JSON 損毀時回到新檔預設；localStorage 寫入失敗會顯示提醒。仍是單一瀏覽器本機存檔，沒有新增雲端資料庫或跨分頁同步。

### 視覺接線（小頌）

外觀由小頌分支接續，`css/loop-controls.css` 只提供最低限度可操作狀態。UI 掛勾：`.cell.fog.locked` / `data-locked`、`.piece.cooling` / `data-cooldown-until`、`.generator-countdown`、`.order.ready` / `.order-give`、`#challenge-card`、`#inventory.open`、`#bag-materials`、`.map-region.locked|available|restored` / `data-region-id` / `data-step` / `data-affordable`、`.repair-region`、`.shop-offer` / `data-offer-id`。

在 document 監聽 CustomEvent：`fantaco:generated`（uid,item,index）、`fantaco:merged`（item,combo）、`fantaco:discovered`（item,definition）、`fantaco:order-completed`（order,item,from）、`fantaco:map-repaired`（id,step,reward,complete）、`fantaco:shop-purchased`（id）、`fantaco:challenge-claimed`（seeds）、`fantaco:bag-expanded`（capacity）。事件只通知，不應再次扣款或再次給獎。

操作入口 `window.__GAME.repair(regionId)`、`.buy(offerId)`、`.claimChallenge()` 會統一完成驗證、存檔與更新畫面；不要另外維護貨幣／地圖狀態。地圖修復結果可供視覺分支接建築演出，本分支未新增故事句子。

### 測試

`node --test tests/*.test.mjs` 驗證純邏輯與 app 流程；包含原故事全流程、循環訂單、版本遷移、扣款失敗零變動、冷卻、台北午夜、超額袋與旋轉不丟物。

另有 `tests/browser-flow.mjs` 使用已安裝 Playwright／Chrome；設 `PLAYWRIGHT_MODULE` 為 Playwright index.mjs 絕對路徑、`TEST_URL` 為本機伺服器網址、`TMPDIR` 為外接碟暫存，再執行 `node tests/browser-flow.mjs`。瀏覽器測試包含實際按鈕操作、四種視窗尺寸與重整；訂單物品及修復資源使用測試注入，並非聲稱已驗證完整數值遊玩時長。沒有替代實體 iPhone／iPad Safari 觸控驗收。
