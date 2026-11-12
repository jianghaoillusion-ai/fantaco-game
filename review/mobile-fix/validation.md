# 驗證紀錄

2026-11-12，本機指定 worktree。

- `node --test tests/*.test.mjs`：5 個測試檔通過，0 失敗。包含棋盤14種尺寸、cast10尺寸與快取、每日重設、活動、觸覺開關。
- `node review/mobile-fix/capture.mjs before`：基準22a7d6d，觸控浮圖與手指重疊（底緣483.225，手指y461.5），成功合成到tier2。
- `node review/mobile-fix/capture.mjs after`：浮圖底緣429.2，手指y461.5，間隔32.3px；成功合成到tier2。
- 同一實際瀏覽器流程：可合成格computedStyle綠底 rgb(230,248,207)與非none外框；滑鼠浮圖中心維持指標位置；無效落點收回；touchCancel不改棋盤；倒數與進度條不相交，23小時59分仍容納；震動關閉保存及reload保持；無pageerror。
- 圖片：存檔後重讀，53張變更圖與git基準比較，全部RGB完全相同、最大差異0，原本alpha255像素RGB p99=0。尺寸不變。PNG/WebP解碼為RGBA比較，WebP無損重存。
- `git diff --check`：通過。
- iPhone／Android實際震動：未在實機測試。沒有把模擬API呼叫當成硬體驗證。

小頌第一次交叉檢查指出：舊CSS蓋掉高亮、飛飛色彩規則過廣、RGB驗證應存檔後全像素比較、iOS說明要一致、快取缺口。已修正、補圖與測試；小頌唯讀複審確認重大阻擋消除、可交使用者驗收（小頌未重跑測試）。未發現密鑰或新增付費／對外資料呼叫。
