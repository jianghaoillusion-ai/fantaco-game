主責小夏，請小頌只做唯讀審查，禁止改檔、push、merge或碰其他worktree。
範圍 /Volumes/外接資料碟/ai-lab/fantaco-feel-polish，分支 xiaoxia/feel-polish，基線80359c4。
已做：js/haptics.js、drag.js、app.js、fx.js、audio.js、orders-ui.js、css/orders.css與cache bust。研究/測試在review/feel-polish。
重點請查：原生label switch是否會重複交單/違反震動開關；同步提交+快照動畫有無丟物/重入；新SFX有無影響BGM；haptics-research.md事實與來源是否過度承諾。實機沒有測；正式頁禁縮放，1.5倍只驗同模組fixture，已明示。
證據：14個Node測試通過；interaction-results.json觸控合成、生成、交單一次、reduced motion通過；315格定位零誤判（四個真頁情境+一個模組縮放）；32個背景/過關音檔SHA256未改。fps錄製正在跑。
請回報嚴重度、位置、重現方法與最小修正；無阻擋也請說明審查限制。請勿把尚需iPhone實測當已完成。
