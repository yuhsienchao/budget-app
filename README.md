# 每日記帳 App

## 部署步驟

### 1. Firebase 設定
1. 前往 https://console.firebase.google.com/
2. 點「新增專案」→ 名稱填 `budget-app` → 建立
3. 左側選「Firestore Database」→「建立資料庫」→ 選「測試模式」→ 選台灣最近的地區（asia-east1）
4. 左側齒輪「專案設定」→「一般」→ 往下找「您的應用程式」→ 點「</> 網頁」圖示
5. 應用程式暱稱填 `budget` → 點「註冊應用程式」
6. 複製 firebaseConfig 裡的所有值，填入 Vercel 環境變數

### 2. GitHub 設定
1. 在 GitHub 建立新 repo，名稱填 `budget-app`
2. 把這個資料夾的所有檔案推上去：
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的帳號/budget-app.git
git push -u origin main
```

### 3. Vercel 部署
1. 前往 https://vercel.com/ 用 GitHub 登入
2. 點「Add New Project」→ 選你的 budget-app repo → Import
3. 展開「Environment Variables」，加入以下變數（值從 Firebase 複製）：
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID
4. 點「Deploy」

部署完成後 Vercel 會給你一個網址，手機電腦都可以用！
