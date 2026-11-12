# iPhone 觸覺研究（2026-11-13）
沒有 iPhone 實機測試。切換 checked、收到事件、API 回傳 true 都不是震動證據。

| 問題 | 可確認的結論與來源 |
|---|---|
| navigator.vibrate | Safari/iOS 未提供任意振動 API；WebKit 明確反對現有 API，見 [WebKit standards position](https://github.com/WebKit/standards-positions/issues/267)。Android 也不能由 true 推論有馬達反應。 |
| 18.0 還是 18.4 | 控制項本身從 **Safari 17.4** 加入，並非 18.4。原始碼提供 switch haptic 路徑；**觸覺最早出貨版本未確認**，不可把控制項版本直接當觸覺版本；未找到支持「必須 18.4」的官方證據。[WebKit 原始公告](https://webkit.org/blog/15054/an-html-switch-control/)、[17.4 功能](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/)。 |
| 真實點 switch／label | 最可靠的網頁途徑：有 renderer、非 disabled 的原生 switch，讓瀏覽器處理 trusted click 與使用者手勢。真實點 label 的預設轉送保留 trusted；程式建立的事件不能自行升級。[CheckboxInputType.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp)、[修正及原生測試](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)。 |
| label.click() | 舊引擎利用 label 轉送誤標 trusted 的漏洞。2026-05-21 WebKit main 的 fc1ef83 修正，測試直接涵蓋「真實 onclick 裡呼叫 label.click() 不可震」。因此使用者手勢仍不足以繞過新版限制。[原始差異與測試](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)。 |
| input.click()／checked= | 程式 click 非 trusted；直接改 checked 是 WasSetByJavaScript，不走 trusted 切換觸覺。見上列 CheckboxInputType.cpp 的 willDispatchClick、performSwitchVisuallyOnAnimation。 |
| touchstart／touchend／pointerup／click | 任何 handler 裡的 **程式 click** 在修正後都不可信。舊版同步 label.click() 可能成功，事件種類不能保證；touchend/pointerup 比延遲回呼更接近啟用時機。WebKit regression test 已證明 click handler 也不能通過新版。 |
| touchmove | 不應視為新的使用者啟用；即使前一次啟用尚未過期，程式 click 仍不可信。原生 switch 自己的拖曳追蹤是另一回事，不等於遊戲 touchmove 可以要求馬達。見 CheckboxInputType.cpp handleTouchEvent／SwitchTrigger。 |
| PWA standalone | 沒有找到 standalone 可繞過此檢查的 WebKit 依據。同一引擎的表單邏輯仍受限制；實機待驗，不宣稱 PWA 比 Safari 更能震。[同一原始碼](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CheckboxInputType.cpp)。 |
| LINE／IG 內建瀏覽器 | WebKit 有 WKWebView 的 switch 原生回歸測試，但無法據此保證 LINE／IG 的設定、引擎版本與硬體行為；各 app 待實機驗。不能以偽造 UA 當通過。[WKWebView 測試](https://github.com/WebKit/WebKit/commit/fc1ef83eae10068fe468587d959e868041ddfe03)。 |

版本歧義：實作維護者 [Flarum 文件](https://docs.flarum.org/en/extend/haptic-feedback/) 將封鎖標為 iOS 26.5；[Ionic 2024 年的功能需求與作者測試](https://github.com/ionic-team/ionic-framework/issues/29942) 則已有 iOS 18 label workaround 紀錄。WebKit main 修正日期不能直接等同已出貨 iOS 版本，因此本報告以「含 fc1ef83 修正的引擎」界定，26.5 為維護者報告，未獨立驗證精確首發版本。

## 接進遊戲
拿起改在 pointerdown 同步呼叫，避開原本 pointermove 超過門檻才觸發；合成在 pointerup 的成功提交同步呼叫。兩者維持舊版 label fallback 與 Android vibrate，**新版 iOS 拖曳震動仍無可靠通用解法**，不加遮住棋盤的假開關。

交單改成真正的 label + rendered switch，使用者直接點「交付」讓原生預設動作切換；這比程式 click 更符合新 WebKit 測試條件。程式產生的 input click 不再重複交單，鍵盤另有 Enter/Space 支援。原生開關跟著既有震動設定 disabled；從卡片／拖曳交單仍用 best-effort order pulse。系統 haptic 強度不可調。

測試頁 `haptic-test.html` 並列直接點擊、各種 handler、vibrate、checked 與延遲；每項寫預期。實機請比較 Safari、加入主畫面及 LINE/IG，而非假定相同。

1px、opacity .001、clip-path 隱藏方式能否在各版 iOS 真正產生觸覺尚無實機證據；本次只保證有 rendered control，不保證馬達反應。設定關閉時 click 會即時檢查最新值並取消 label 預設轉送，避免舊卡片保留啟用狀態。
