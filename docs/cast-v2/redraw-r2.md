# cast6 第2輪製作記錄

姐姐使用 Codex 內建 imagegen，兩次生成，最後採第一張完整候選；第二張頭寬較接近，但長髮更厚，未採用。輸入為第1輪姐姐與布魯；第二張只作比例及畫風參考。輸出透明 PNG 1086×1448，整張等比縮到532×710（四捨五入），置中平移到540×720，alpha≥128的腳底y685。沒有分割頭身、沒有非等比拉伸。之後用本機繪圖局部修姐姐兩側髮際（各約2px），並延長兩側既有鬢角髮梢，使可見頭寬接近布魯；五官沒有縮放或搬動。

提示全文：

> Edit image 1, the waving girl, as ONE seamless complete full-body transparent PNG. Image 2 is scale/style reference ONLY, don't draw boy. Preserve girl's entire pose, short pink ruffle dress, belt, socks, white shoes, facial identity, round eyes, open smile, blush, top pink bow. Exact same framing and height, feet at same baseline. Repair head/neck/shoulder join so no horizontal seams at neck. Head should be same dimensions as boy: hair-top to chin 217px out of 656px body height, head width 200px, face maximum width 136px. Lower jaw rounder and 7% wider without changing eyes. Critical: radically REDUCE brown hair mass by 25% while keeping long straight hair. Raise fringe hairline to expose more forehead (boy has a large exposed forehead) and use thin natural tapered strands falling behind shoulders, NOT two ruler-straight straps over chest. Hair top stays at same height; upper hair silhouette has slight outward wisps at temples to bring total head width to 200px, but less hair overall. Chin height same as original. One coherent redraw, no pasted head, no flat cut edges at shoulders. Keep girl's body and legs dimensions as original; don't elongate. Clean polished 2D children's sprite matching image 2, no background, no labels. Full figure fit with margins.

提示中的數字是目標，不代表生成結果已符合；實測另列。

哈特從第1輪圖 y27–169 的右外輪廓向內修，最大10px，兩端平滑遞減；刪除外側透明殘邊，在新輪廓補深棕描邊。精靈從第1輪 y260–330 的左右肩袖各向內修最多6px，於y288附近幅度最大，兩端遞減，補深藍描邊。描邊鄰域會再涉及上下約2px；像素差異範圍見 `review/cast6/local-edit-check.json`。精靈另把褲襠縫頂 y460–468 補成深藍衣料，使兩褲管的分開點落在y469；只補原透明縫約20px，不移動腿或鞋。所有其他內部像素保留原位置，沒有縮窄整張圖、沒有變形眼睛或臉。

原圖已存在 Git 歷史；本輪修改前後的完整對照都在 review/cast6。暫存候選、處理腳本及原設定匯出用 TMPDIR，收尾刪除。不保留付費服務、憑證或密鑰。
