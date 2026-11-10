# 眠花糖與魔法氣球物語

FANTACO 魔幻藝術節的免費親子瀏覽器遊戲。扮演官方吉祥物眠花糖，陪飛飛走過《魔法氣球物語》。

試玩：https://jianghaoillusion-ai.github.io/fantaco-game/

完全免費，沒有內購。給全家人一起玩。

## 每週加關卡

關卡是資料驅動的。新增一關只需要：

1. 在 `data/stages/` 新增一個 JSON（可複製 `03-sika.json` 再改劇情與波次）
2. 把檔名（不含 .json）加進 `data/stages/index.json` 的 `stages` 清單

不必改程式。敵人類型目前有 `fog`（緊張霧）、`deflate`（洩氣怪）、`shadow`（黑影嘀嘀）。新種類再在 `js/battle.js` 的 `KINDS` 登記即可。

## 預覽版先做了什麼、什麼先留位置

已做：本機暱稱、localStorage 存檔、三關故事與戰鬥、經驗與升級、稀有度掉落（機率公開）、星星種子、收集冊、兌換禮品頁（顯示「即將開放」）、〈飛向藍藍天〉歌詞頁。

先留位置、這一版還沒接上：

- Google／電子信箱登入（見 `js/auth.js`）
- Cloudflare Workers + D1 雲端存檔（見 `js/save.js` 的 `syncCloud`）
- 星星種子換實體禮品（不蒐集地址）
- 現場活動兌換碼／QR（系統欄位預留，不上線）
- 布魯、哈特與之後每週新關

## 歌詞來源

〈飛向藍藍天〉詞｜呂濟寬　曲｜小橋  
完整歌詞取自官方 MV 說明文字：https://youtu.be/XPvIihQWrcA  
（該支影片沒有字幕檔，FB／IG 未再另找一份完整歌詞。）

## 美術

眠花糖與貼紙來自官方設計檔（三屆資料夾「眠花糖」）。其他角色與怪物為配合線條風格的原創簡筆，非正式劇照。
