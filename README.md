
# Taggy｜標籤小人 v0.5.5 Beta

企劃與製作：黃筱崴

## 關於 Taggy

想透過一個簡單的互動遊戲，讓大家思考標籤與人之間的關係。

遊戲中可以自由輸入不同的標籤，並將標籤掛在小人身上。
這些標籤可能是身分、個性、能力，也可能是我們對他人的想像或評價。

完成後，小人會穿著由標籤文字組成的印花服裝登場，
並透過 AI 將這些標籤串接成一段自我介紹。

當我們把這些標籤放在同一個人身上時，
又會看見一個什麼樣的人呢？

未來希望能將這個遊戲運用在共融教育、
身心障礙議題討論及相關文化行動計畫中，
也會透過使用者提供的標籤及回饋持續更新遊戲。

## 目前功能

- 自訂小人顏色及色號
- 自由新增、拖曳及取下標籤
- 身上整理及標籤尺整理
- 巨星登場動畫
- 自動生成標籤印花服裝
- GPT 自然語言生成自我介紹
- 本機文字組句備援
- 共用標籤庫
- 單日標籤收集紀錄
- 使用者遊玩回饋
- 製作團隊管理後台
- CSV 資料匯出

## 使用技術

- HTML
- CSS
- JavaScript
- SVG
- GitHub Pages
- Supabase
- PostgreSQL
- Supabase Edge Functions
- GPT API

## 專案架構

taggy1124/
├── index.html
├── admin.html
├── style.css
├── game.js
├── admin.js
├── config.js
├── schema.sql
├── README.md
└── supabase/
    └── functions/
        └── generate-intro/
            └── index.ts

## 各檔案用途

- index.html：遊戲主頁面
- admin.html：製作團隊管理後台
- style.css：前台與後台共用樣式
- game.js：遊戲操作及互動功能
- admin.js：後台管理、統計及資料匯出
- config.js：Supabase 連線設定
- schema.sql：資料表及資料庫權限設定
- generate-intro/index.ts：GPT 自我介紹生成

預設標籤可以直接在 game.js 的 initial 中修改。

## 部署方式

### GitHub Pages

1. 將專案檔案上傳至 GitHub。
2. 進入 Settings > Pages。
3. Source 選擇 Deploy from a branch。
4. 選擇 main 及 /(root)。
5. 儲存並開啟網站。

### Supabase

1. 建立 Supabase 專案。
2. 在 SQL Editor 執行 schema.sql。
3. 修改 config.js，填入 Project URL 及 Publishable key。
4. 測試標籤庫及使用者回饋是否正常寫入資料庫。

config.js 不可放入 secret key、service_role key
或其他私密金鑰。

### 管理後台

在 Supabase Authentication > Users 建立管理者帳號，
取得使用者 UUID 後，在 SQL Editor 執行：

    INSERT INTO public.tag_admins (user_id)
    VALUES ('管理者UUID');

完成後即可透過 admin.html 登入管理後台。

### GPT API

使用 Supabase Edge Functions 串接 GPT。

部署 generate-intro：

    supabase functions deploy generate-intro --no-verify-jwt

於 Supabase Edge Functions Secrets 設定：

- OPENAI_API_KEY
- OPENAI_MODEL
- ALLOWED_ORIGIN

目前預設使用 gpt-4o-mini。

API 金鑰不放在 GitHub 或前端程式中。

目前每日全站最多生成 100 次，以 UTC 日期計算。
未啟用 AI、連線失敗或超過使用額度時，
會自動改用本機文字組句。

## 標籤收集及資料使用

遊戲會在開始前詢問使用者是否同意分享標籤。

同意分享後，新增的標籤會保存至共用標籤庫，
並保留每筆輸入紀錄及時間。

收集的標籤及使用者回饋將作為未來遊戲更新、
共融教育活動、團隊文化行動計畫、成果紀錄
及倡議推廣之用。

不同意分享仍可正常遊玩。

製作團隊保有檢視、整理、修改、
隱藏及刪除使用者輸入內容的權利。

## AI 使用提醒

本遊戲部分功能會將使用者輸入的文字
傳送至 AI 服務進行處理。

請勿於本遊戲中透露真實姓名、
聯絡方式或其他足以辨識個人身分的資料。

## 資料庫管理

- label_library：共用標籤庫
- label_events：原始標籤輸入紀錄
- feedback：使用者遊玩回饋
- tag_admins：管理者權限
- intro_quota：AI 使用額度

單日收集紀錄以台灣時間 UTC+8 計算，
離線補送的資料以伺服器收到資料的日期為準。

標籤輸入次數不等於實際參與人數。

## 版本紀錄

### v0.5.5

- 調整遊玩前同意說明
- 正式命名為 Taggy
- 前台及後台程式分檔
- 合併共用 style.css

### v0.5.3－v0.5.4

- 修正新增標籤功能
- 支援重複新增標籤
- 新增標籤狀態提示
- 將新增標籤與資料庫同步分開處理

### v0.5.2

- 製作團隊管理後台
- 單日及日期區間收集紀錄
- 標籤修改、合併、隱藏及刪除
- CSV 資料匯出

### v0.5－v0.5.1

- GPT 自然語言生成
- 本機文字組句備援
- AI 功能使用提醒
- 製作署名

### v0.4－v0.4.2

- 共用標籤庫
- 遊玩前同意說明
- 使用者回饋問卷

### v0.3

- 巨星登場動畫
- 自動生成標籤印花服裝
- 自我介紹文字氣泡
- 小人尺寸及標籤排列位置調整

### v0.1－v0.2

- 小人基本造型
- 自由拖曳標籤
- 自訂色彩
- 身上整理及標籤尺
- Supabase 串接

## 待完成事項

- [ ] GitHub Pages 部署
- [ ] Supabase 資料庫連線測試
- [ ] GPT API 連線測試
- [ ] 管理後台權限測試
- [ ] 手機及平板操作測試
- [ ] 無障礙操作優化
- [ ] API 使用量及費用管理
- [ ] 防止惡意投稿及大量 API 呼叫
- [ ] 資料保存期限及聯絡方式
- [ ] 實際課堂遊玩測試
- [ ] 依使用者回饋持續更新

## 備註

目前仍為 Beta 測試版本，
會依照實際使用情況及回饋持續調整。

---

每一個標籤，都是一種觀點。
每一種感受，都值得被聽見。

企劃與製作｜黃筱崴

