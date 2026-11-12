# 生圖來源與處理

只用 Codex 內建 image_gen 和本機 Pillow / numpy / OpenCV，沒有 API 呼叫、即夢、即夢點數或額外付費。
原設定：`origin/main:assets/chars/jiejie.png`、`origin/main:assets/chars/spirit.png`；cast8 基準 HEAD：65216ca。比例參考 `assets/chars/bulu.png`；自然感與腿粗參考 `assets/chars/feifei.png`。
姐姐先整人重畫，再由內建生圖調小蝴蝶結；保留末次高解析來源 `source/sister-built-in.png`。
提示詞重點：完整三頭身角色，水平眼線、正面自然視角、原設定五官特色、粉色多層荷葉服、棕色半紮長髮、揮手與叉腰、粉色條紋長襪及白鞋；腿粗參考飛飛；禁止魚眼、鼓臉與拼貼放大臉。末次僅要求把蝴蝶結縮至約55%，保持角色其餘造型。
本機後製：以 alpha>=128 外框取整人範圍，整人單一倍率縮至666px高，置入540×720透明畫布，腳底y685。僅像素整數四捨五入；沒有分區拉伸、局部放大、液化、膨脹或魚眼運算。去除8個分離alpha碎點；外圈alpha做0.35px柔邊，未改RGB，alpha128輪廓僅9px跨門檻。
精靈曾以同一內建生圖產生全身探索稿，但未採用、未替換遊戲素材：原帽／身高／畫布條件衝突尚待使用者決定，探索稿不當成完成品。

腳本從 repo 根目錄執行，TMPDIR 必須是外接碟；使用既有 media-tools venv，不安裝依賴。小頌只目視交叉檢查，未畫圖、未獨立重算數字。
