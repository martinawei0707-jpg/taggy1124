# Taggy｜標籤小人 v0.5.5（共用 CSS 版）

上傳網站根目錄的 index.html、admin.html、style.css、game.js、admin.js、config.js（皆位於網站根目錄）。schema.sql 在 Supabase SQL Editor 執行；supabase/ 供 Edge Functions 部署。既有 config.js 已填妥時請保留，不要用範例覆蓋。此版合併共用 style.css，並以 body class 隔離頁面樣式；JavaScript 與後端程式不變。請使用 GitHub Pages 或本機 HTTP 伺服器測試。下方保留歷史部署說明，其中舊版的上傳步驟需一併上傳 style.css、game.js、admin.js。

# 標籤小人 v0.5.4 共用標籤庫
1. 在 Supabase SQL Editor 執行 schema.sql（不刪除原有資料）。
2. 修改 config.js，填 Project URL 與 publishable key（或舊 anon key）；不可使用 secret/service_role。
3. 將 index.html 與 config.js 放到 GitHub Pages 網站根目錄。
4. 用兩個瀏覽器測試：A 新增標籤，B 按更新標籤庫或等約 15 秒。確認 Table Editor 的 label_library 與 label_events 有資料。

每人獨立操作小人。同意分享者新增文字才進入共用庫，重複輸入累計 submissions；原始每筆文字與時間保留於 label_events。不保存姓名、位置或自我介紹。共用庫文字公開，請提醒學生不要輸入個資。管理者可在 Supabase Table Editor 將 visible 設為 false 隱藏不適當標籤（已載入的瀏覽器需重新整理；本機自行輸入的文字仍留在該裝置）。匿名寫入有濫用風險，公開長期部署前建議增加伺服器端限流與審核。同意分享後，未連線時自訂標籤與待同步佇列儲存在本機，連線成功後補送。若瀏覽器清除資料則未同步內容可能遺失。舊場次資料不自動匯入。


## 遊玩前同意
每次開啟頁面須選擇分享或僅遊玩。僅遊玩新增文字只留在當次頁面，不寫入上傳佇列；可讀取公開標籤庫。停止後續分享會清空未送出佇列（已發出的請求可能仍完成）。舊版待同步資料不會自動匯入。正式公開前請補上團隊聯絡方式及資料保存期限，並確認未成年參與及相關資料使用程序。

## v0.4.2 遊玩回饋
既有部署請重新執行 schema.sql（新增 feedback 表與 submit_feedback 函式，不刪除舊資料），再更新 index.html；保留自己原有的 config.js。新部署依前述步驟。回饋可由操作頁或登場後開啟，所有題目可略過，至少填一項且勾選獨立同意才可送出。僅遊玩者亦可自願提供回饋。未連線或送出失敗不會顯示成功，不會自動補送。管理者可於 Supabase Table Editor 查看 feedback，或在 SQL Editor 執行 SELECT * FROM public.feedback ORDER BY created_at DESC; 並匯出 CSV。匿名前端不可讀取回饋資料。公開部署前仍需設定管理者聯絡方式、保存期限及防濫用措施。資料庫未實際連線測試。

## v0.5 自然語言（企劃與製作：黃筱崴）
重新執行 schema.sql，保留原有資料。以 Supabase CLI 在專案資料夾登入並 link 專案，再執行 `supabase functions deploy generate-intro --no-verify-jwt`。在 Edge Functions Secrets 設定 OPENAI_API_KEY、OPENAI_MODEL（預設 gpt-4o-mini）、ALLOWED_ORIGIN（例如 https://你的帳號.github.io，不含路徑）。不得把私密金鑰放入 GitHub。Supabase 內建的 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 僅在伺服器使用。更新 GitHub Pages 的 index.html，保留已設定的 config.js。AI API 另計費，須有 API 帳戶與額度。每日全站最多 100 次 AI 請求（UTC，失敗也計入）；可於 SQL 函式調整。Origin 檢查不是身分驗證，公開端仍可能遭濫用，正式長期公開前應加上更完整的防濫用措施。關閉 AI、未連線、逾時或服務失敗時，使用原本的本機組句。首頁獨立顯示 AI 使用提醒，不另設 AI 同意勾選項。分享模式預設啟用 AI，僅遊玩模式預設關閉；遊戲中可自行切換。關閉 AI 不影響標籤或回饋同意。不將生成文字存入資料庫。AI 供應商可能依政策保留處理紀錄。未完成實際 API 或資料庫連線測試。

## v0.5.4 管理後台
重新執行 schema.sql，再上傳 index.html、admin.html，保留既有 config.js 與 Edge Function。於 Supabase Authentication > Users 建立管理帳號（不要開放自行註冊），複製該使用者 UUID，再於 SQL Editor 執行 `insert into public.tag_admins(user_id) values ('你的使用者UUID');`。開啟網站的 admin.html 登入。只有名單內帳號具管理權限。單日及日期區間以台灣時間 UTC+8 計算，原始紀錄日期為伺服器收到資料的日期（離線補送會算在補送日）。修改與合併保留原始文字，刪除會永久刪除相關原始紀錄；隱藏僅影響公開庫，已載入或本機保存的文字不會遠端清除。後台可匯出詞頻、原始紀錄、標籤庫及回饋 CSV。前台僅遊玩模式不啟用 AI。實際資料庫與權限仍須部署後驗證。

## v0.5.4
手動新增允許重複吊牌，立即顯示於標籤區第一個位置；雲端詞庫仍去重。新增畫面與同步分離。

## v0.5.4
新增按鈕直接處理、Enter 支援、輸入框移至標籤區上方及獨立狀態提示。資料庫架構不變。
