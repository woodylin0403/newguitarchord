@AGENTS.md

# 教會詩歌吉他譜網站 (hymnbook)

## 專案目標

把教會的紙本詩歌本數位化成一個**吉他譜網站**，讓會眾與敬拜團在手機上就能看譜、移調、彈唱。

- 紙本來源：328 首詩歌，掃描圖存於 `public/scans/`，目錄與中繼資料存於 `data/`。
- 逐首把掃描圖轉錄成結構化歌詞 + 和弦資料。

## 核心功能需求

1. **ChordPro 格式儲存和弦**
   歌詞與和弦內嵌在一起，例如：`[D]神啊 [A]我的心切[Bm]慕你`。
   這是唯一的真實來源（source of truth），顯示、移調、Capo 建議都從它推導。

2. **移調 (Transpose)**
   使用者可即時把整首歌升/降半音，和弦符號隨之重算（含等音處理，例如 F# / Gb 視調性選擇）。

3. **Capo 建議**
   依原調算出「夾幾格 + 用什麼和弦組」的建議，優先給出好按的開放和弦指法（C、G、D、A、E、Em、Am 等）。

4. **依原調分類**
   歌曲以原調分組瀏覽。`songs.json` 的頂層鍵就是原調：`C, Am, D, E, F, Dm, G, Em, A`。

5. **搜尋**
   依歌名搜尋（中文），之後可擴充歌詞全文搜尋。

## 非功能需求

- **手機優先**：版面、字級、和弦對齊都以手機直式閱讀為準；桌機是加分。
- **SEO 很重要**：
  - 每首歌一個乾淨網址（例如 `/songs/<slug>` 或 `/songs/<key>/<number>`）。
  - 內容在**伺服器端算好**（SSG / SSR），不要靠前端 JS 才生出歌詞與和弦。
  - 每首歌有正確的 `<title>`、meta description、structured data。
- 移調 / Capo 這類互動可在客戶端做，但預設（未互動）狀態必須是完整的伺服器端 HTML。

## 資料

### `data/songs.json` — 詩歌目錄（328 首）

頂層物件，鍵 = 原調，值 = 該調的歌曲字串陣列：

```
"<序號>|<歌名>|<書頁>|<拍號?>"
```

- `序號`：**每個調自己從 1 開始**（不是全書流水號）。
- `歌名`：中文歌名。
- `書頁`：紙本詩歌本頁碼。
- `拍號`：選填，例如 `3/4`、`6/8`、`12/8`；沒有就省略。

範例：`"3|讚美救主耶穌|1|3/4"` = C 調第 3 首，紙本第 1 頁，3/4 拍。

各調數量：C 61、Am 10、D 70、E 24、F 46、Dm 11、G 60、Em 10、A 36。

### `data/manifest.json` — 掃描圖 ↔ 書頁對照

陣列，每筆對應一個 `book_page`：`images`（該頁的行級裁切圖檔名）、`full_page`、`candidates`（該頁包含哪些 `song_id` 與標題）、`clean_cut`。

### `public/scans/` — 掃描圖（334 個 PNG）

- `P<頁碼>_L<n>.png` / `P<頁碼>_R<n>.png`：單行裁切圖（左欄 / 右欄第 n 行）。
- `page_P<頁碼>.png`：整頁掃描。

轉錄時用這些圖當校對依據。

## 之後的規劃

- **資料庫用 Supabase**：目前先用 `data/` 裡的 JSON + 之後新增的 ChordPro 檔；等結構穩定再遷移到 Supabase（歌曲表、和弦內容、標籤等），網站改讀 Supabase。
- 在導入 Supabase 前，先不要綁死資料存取層——把「讀歌曲」包成一層可替換的模組。

## 技術堆疊

- Next.js 16（App Router）+ TypeScript + Tailwind CSS v4，`src/` 目錄，import alias `@/*`。
- 測試：Vitest（`npm test` / `npm run test:watch`），測試檔放在 `src/**/*.test.ts`。
- ⚠️ 這是 Next.js 16，API 與慣例可能和舊版不同；動手前先讀 `node_modules/next/dist/docs/`（見 `AGENTS.md`）。

## 程式架構

### `src/lib/chords/` — 吉他和弦按法

- `shapes.ts`：`getChordShape(symbol)` → `{ frets: (number|null)[6], movable }`（低音 E→高音 E，null=悶音、0=空弦、≥1=格數）。先經 `simplifyQuality` 收斂成大/小/`7`/`m7`/`maj7`，查開放和弦表；查不到就用 E 型 / A 型 barre 產生器（挑較低把位）。`shapeBaseFret()` 決定指法圖從第幾格畫起。
- `src/components/ChordDiagram.tsx`：純 SVG 指法圖，`stroke=currentColor` 自動配合主題。

### `src/lib/music/` — 樂理函式庫（純函式，前後端共用）

| 檔案 | 內容 |
|---|---|
| `pitch.ts` | 12 個音高類別（0=C…11=B）、升記號/降記號拼字表、`parseNoteName` |
| `keys.ts` | `CATALOG_KEYS`（九個原調）、`parseKey`、`transposeKeyName`（依目標調自動選升/降記號）、`semitonesBetweenKeys` |
| `chord.ts` | `parseChord` / `formatChord` / `transposeChord`；和弦性質（`m7`、`sus4`、`/F#`…）原樣保留，只有根音與 bass 音會被解讀 |
| `transpose.ts` | `transposeChordToken`、`transposeChordProText`（只動 `[...]` 內的和弦） |
| `capo.ts` | `suggestCapo` / `bestCapo`：給原調，回傳「夾幾格 + 彈什麼調的開放和弦」，最低把位優先 |
| `chordpro.ts` | `parseChordPro` → `{ meta, sections[] }`；支援 `{title}`、`{key}`、`{capo}`、`{soc}`/`{eoc}` 等指令與 `[chord]` 行內和弦 |
| `index.ts` | 對外統一出口，一律 `import { ... } from "@/lib/music"` |

### `src/lib/songs/` — 歌曲資料存取層（**Supabase 遷移時只改這裡**）

| 檔案 | 內容 |
|---|---|
| `types.ts` | `SongSummary`（slug / key / number / title / bookPage / timeSignature）、`RawCatalog` |
| `parse.ts` | 純函式：`parseCatalog`、`parseCatalogEntry`、`songSlug`、`groupByKey`、`filterByTitle` |
| `catalog.ts` | **只給 Server Component 用**（讀檔案系統）。`loadCatalog` / `getCatalogByKey` / `getSong(slug)` / `getAllSlugs` / `searchSongs`，用 `React.cache` 做請求內記憶化 |
| `content.ts` | **Server only**。`getSongSource(slug)` / `getSongDocument(slug)` 讀 `data/songs/<slug>.chordpro`；沒有檔案回 `null` |
| `scans.ts` | **Server only**。`getSongScans(slug)` 透過 `data/manifest.json` 找到該首所在書頁的掃描圖與同頁其他詩歌 |
| `labels.ts` | `keyLabel`（`Am` → 「A 小調」）等顯示字串 |

- Slug 格式：`<key 小寫>-<number>`，例如 `c-3`、`dm-11`（key 已含在 slug 中，跨調不會撞號）。
- ChordPro 檔若有自己的 `{key:}`，以它為實際彈奏調；否則用 `songs.json` 的原調。
- `data/manifest.json` 只到「書頁」層級：一頁通常有 5~8 首共用同一批掃描圖，所以歌曲頁顯示的是整頁掃描 + 同頁清單，精確切圖要等逐首轉錄。

### `src/app/` — 頁面

| 路由 | 說明 |
|---|---|
| `/` | 首頁：搜尋框 + 依原調分組列出全部 328 首（單頁，利於 SEO） |
| `/keys/[key]` | 單一原調的清單（`/keys/am` 等，SSG） |
| `/songs/[slug]` | 歌曲頁（328 頁 SSG）：有 ChordPro 就顯示 `ChordProView`（移調 + Capo），否則顯示 Capo 建議 + 掃描原稿。含 `generateMetadata`（canonical、OG） |
| `/search` | 標題搜尋（讀 `searchParams`，動態算，`robots: noindex`） |

### `src/components/`

- `ChordProView`（client）：移調 ±11 半音、即時 Capo 建議、和弦指法條、字級調整、和弦疊在歌詞上方。未互動時是完整的 SSR HTML。
- `PerformanceView`（client）：`/songs/[slug]/play` 的全螢幕演奏視圖。
- `SearchBox`（client）、`SongList`、`KeyBadge`、`ChordDiagram`（server / pure）。

## 待辦：Supabase 功能（使用者要求，尚未動工）

把原定「之後再做」的 Supabase 遷移提前，一次涵蓋四個需求：Google 登入、管理員站上編輯歌詞/和弦、留言、（演奏模式已完成）。

### 需要使用者先自行設定

1. 建 Supabase 專案 → 取得 `Project URL`、`anon key`、`service_role key`。
2. Supabase → Authentication → Providers → Google 啟用；在 Google Cloud Console 建 OAuth client（redirect URI 用 Supabase 給的 `https://<ref>.supabase.co/auth/v1/callback`）。
3. 把三把金鑰放進 `.env.local`：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`；再加 `ADMIN_EMAILS=<你的 gmail>`。

### 規劃

- 套件：`@supabase/supabase-js`、`@supabase/ssr`。
- DB schema：
  - `song_contents(slug pk, chordpro text, updated_at, updated_by)` — 站上編輯的真實來源。
  - `profiles(id pk = auth.uid, email, role)` — role 由 `ADMIN_EMAILS` 對照，或手動設。
  - `comments(id, song_slug, user_id, body, created_at, deleted_at)` — RLS：登入者可新增自己的、管理員可刪任何。
  - 歌曲目錄（title/key/number/page）暫時仍讀 `data/songs.json`，之後再進 `songs` 表。
- 資料層改法（只動 `src/lib/songs/`）：`content.ts` 先讀 `song_contents`，查不到再 fallback `data/songs/<slug>.chordpro`（現有 93 檔當種子）。寫一支 seed script 把現有 `.chordpro` 灌進 `song_contents`。
- Auth：`@supabase/ssr` cookie session；`app/auth/callback/route.ts`；Next 16 用 `proxy.ts`（不是 `middleware.ts`）刷新 session。登入按鈕放 header。
- 編輯：`/songs/[slug]/edit`（管理員限定）— textarea 放 raw ChordPro + 即時預覽（重用 `ChordProView`）。Server Action 存檔 → `revalidatePath('/songs/[slug]')`。歌曲頁要從純 SSG 改成 ISR / `revalidate`。
- 留言：歌曲頁底部；登入才能留言，管理員可刪。
- 建議實作順序：① Supabase client + schema + seed（資料層切過去，站照常跑）② Google 登入 + 管理員判斷 ③ 站上編輯 ④ 留言。

### 進度

- **① 完成（待使用者跑 SQL）**：
  - `.env.local`（已建，使用者已填 URL / publishable / secret / ADMIN_EMAILS）。用的是新版 `sb_publishable_` / `sb_secret_` 金鑰，`@supabase/supabase-js` v2 直接吃。
  - `src/lib/supabase/public.ts`（無狀態 anon client，任何情境可用，env 缺就回 null）
  - `src/lib/supabase/admin.ts`（service_role，**server only**，seed 與管理員寫入用）
  - `src/lib/supabase/server.ts`（`@supabase/ssr` cookie client + `getCurrentUser()` + `isAdminEmail()`）— 步驟②會用
  - `supabase/schema.sql` — **使用者要在 Supabase SQL Editor 執行一次**（建 `song_contents` / `profiles` / `comments` + RLS + 註冊 trigger）。可重跑。
  - `src/lib/songs/content.ts` 改成：先查 `song_contents`（`loadOverrides` 一次抓全表、`React.cache`），沒有再讀 `data/songs/<slug>.chordpro`。連不到 Supabase 就純檔案模式，站不會壞。
  - `scripts/seed-content.ts`（`npm run seed:content`，選用，把現有 .chordpro 批次灌進 DB）
  - 歌曲頁加 `export const revalidate = 300`（ISR，站上編輯後不用重 build 也會更新）
  - 連線測過：anon / service 兩把金鑰都能連，只差 table（等使用者跑 SQL）。
- **② 程式完成，卡在 Supabase 設定**：
  - `src/lib/supabase/browser.ts`（client component 用）、`src/proxy.ts`（Next 16 middleware，刷新 session cookie）、`src/app/auth/callback/route.ts`（OAuth code → session）、`src/app/api/me/route.ts`（client 查登入/管理員，不讓靜態頁變 dynamic）。
  - `src/components/AuthNav.tsx`（header 的登入 / 頭像選單，純 client，靜態頁維持 SSG）。`src/lib/supabase/server.ts` 加 `getSessionInfo()`。
  - 實測：按「登入」→ 正確產生帶 PKCE 的 OAuth authorize URL，但 Supabase 回 `provider is not enabled`。**使用者要去 Supabase → Authentication → Sign In / Providers → Google 真的打開並 Save（填入 Google Cloud 的 Client ID / Secret）。** 打開後即可測完整登入。
- **③ 完成（待使用者測管理員流程）**：
  - `/songs/[slug]/edit`（server component，`getSessionInfo()` 擋非管理員 → 顯示提示）。
  - `src/components/SongEditor.tsx`（client）：左邊 raw ChordPro textarea、右邊即時預覽（`ChartPreview`），儲存 / 復原 / 「刪除站上修改回原始檔」。
  - `src/app/songs/[slug]/edit/actions.ts`（`"use server"`）：`saveSongContent` / `revertSongContent`，每次都重新驗證管理員身分，用 `getAdminSupabase()`（service_role）寫 `song_contents`，然後 `revalidatePath`。
  - `src/components/AdminEditLink.tsx`：歌曲頁的「編輯」鈕，fetch `/api/me`，只有管理員看得到（保持歌曲頁 SSG）。
  - **順帶修 bug**：抽出共用 `src/components/SongLine.tsx`，`ChordProView` / `PerformanceView` / `ChartPreview` 共用。修正「未移調時和弦會被重新拼字」（`Bb`→`A#`）——現在 `semitones === 0` 就直接顯示原字串。
  - 非管理員擋門實測 OK。管理員登入 → 編輯 → 存檔的完整流程待使用者測。
- **④ 完成（待使用者測登入後留言）**：
  - `supabase/schema.sql` 的 `comments` 表已含在內（RLS：可讀未刪的、登入者可新增自己的、可改自己的；管理員刪別人的走 service_role）。
  - `src/lib/comments/queries.ts` `listComments(slug)`：抓 `comments` + 另抓 `profiles` 合併作者名/頭像（沒建 FK，用兩次查詢 merge）。
  - `src/app/api/songs/[slug]/comments/route.ts`：GET 列表（公開）、POST 新增（`getServerSupabase()` 驗登入，`user_id` 靠 DB default `auth.uid()`）。
  - `src/app/api/comments/[id]/route.ts`：DELETE 軟刪（`deleted_at`），本人用 session client、管理員用 `getAdminSupabase()`。
  - `src/components/SongComments.tsx`（client）：歌曲頁最底部，fetch `/api/me` + 留言列表；登入才顯示輸入框；本人或管理員看得到「刪除」。歌曲頁維持 SSG。
  - 匿名狀態實測 OK（顯示「登入後即可留言」、空列表）。登入 → 留言 → 刪除的完整流程待使用者測。

**Supabase 四項功能全部程式完成。**

- **⑤ 站上新增歌曲（完成，待跑 SQL）**：
  - `supabase/schema.sql` 加了 `public.songs` 表（slug / title / music_key / number / time_signature），**使用者要重跑一次 SQL**。
  - `src/lib/songs/catalog.ts`：`loadCatalog` 合併 `songs.json` + `songs` 表（`loadCustomSongs`，`getPublicSupabase`）；`SongSummary` 加 `source: "hymnal" | "custom"`、`bookPage` 可為 null；`nextSlugForKey()` 算下一個空 slug（例 `c-62`）。
  - `/songs/new`（管理員限定）+ `src/components/NewSongForm.tsx`：填歌名/原調/拍號 + ChordPro 編輯區（沿用 `ChordPad` + `ChartPreview`）。
  - `src/app/songs/new/actions.ts`：`createSong`（寫 `songs` + `song_contents`，失敗回滾）、`deleteSong`（只能刪 custom）。
  - 首頁 `AdminNewSongLink`（fetch `/api/me`，只有管理員看得到）；編輯頁對 custom 歌顯示「刪除整首」。
  - 歌曲頁未 build 過的新 slug 靠 `dynamicParams` on-demand 算（頁面有 `revalidate = 300`）。

- **站名**：`烏鴉的天空 詩歌吉他譜`（`SITE_NAME`）；header 短版 `烏鴉的天空`（`SITE_SHORT`）。

- **SEO**：`src/app/sitemap.ts`（首頁 + 9 原調 + 全部歌，含 custom）、`src/app/robots.ts`、`src/lib/site.ts` 的 `SITE_URL`（`NEXT_PUBLIC_SITE_URL`，未設回 localhost）。

- 部署：Vercel，`.claude/launch.json` `autoPort:false`（OAuth 綁 :3000）。

## 目前進度

- [x] 專案骨架（Next.js scaffold）
- [x] 掃描圖搬到 `public/scans/`，目錄留在 `data/`
- [x] 歌曲資料模型 + 目錄解析（`src/lib/songs/`）
- [x] ChordPro 解析（`src/lib/music/chordpro.ts`）
- [x] 移調 / Capo 邏輯（`src/lib/music/`），46 個單元測試
- [x] 首頁 / 分類頁 / 歌曲頁 / 搜尋（`src/app/`），`next build` 產出 328 + 9 靜態頁
- [x] ChordPro 內容檔的存放與讀取（`data/songs/<slug>.chordpro`，格式見 `data/songs/README.md`）
- [x] 基本視覺基調：暖白紙感配色 + 單一褐色 accent、`globals.css` 定義 `.chord` / `.songline`、首頁改為精簡版（搜尋 + 9 張原調卡）、sticky header
- [~] 逐首轉錄掃描圖成 ChordPro：第 1 頁 C-1～C-6 已完成待核對，其餘 322 首待做
- [x] 全站改成暗色為主、金黃 accent 的「音樂 app」風格（歌詞/和弦方向已確認）
- [x] 和弦指法圖：`src/lib/chords/shapes.ts`（開放和弦表 + движ movable barre 產生器）+ `src/components/ChordDiagram.tsx`（純 SVG），歌曲頁頂端橫向捲動和弦條，隨移調更新
- [x] 看譜字級調整（A− / A+，5 段，存 localStorage，`--song-scale` 縮放 `.chart`）
- [x] 演奏模式 `/songs/[slug]/play`：全螢幕、只留段落標題+和弦+歌詞、大字級（6 段）、快速移調、Wake Lock 防螢幕休眠。`src/components/PerformanceView.tsx`
- [ ] Supabase 遷移 + Google 登入 + 站上編輯 + 留言（見下方「待辦：Supabase 功能」）
- [~] 轉錄進度：**C 全段（61）+ Am 全段（10）+ D-1～D-21 已完成**，共 92 首。第 1～2 頁使用者已確認；其餘待核對。下一步：D-22 起（p16）
- [ ] 之後：列印樣式、字體、`sitemap.xml`
- [ ] Supabase 遷移

### 轉錄規則（與使用者確認過）

- 檔名 `data/songs/<slug>.chordpro`，一次做「一整頁」（`manifest.json` 的一個 `book_page`），使用者逐頁核對後再往下。
- **和弦簡化**：只保留基本三和弦 + 七和弦（大、小、`7`、`m7`、`maj7`）。掃描上的 `sus`、`add9`、`6`、轉位（`/F#`）一律簡化；`dim`→`m`、`aug`→大三和弦。程式端有 `simplifyChordSymbol()` 可當保險，但轉錄時就要先簡化。
- **歌詞**：多節（1. 2. …）全部打進去，用 `{start_of_verse: 一}` / `{start_of_verse: 二}` 分節；副歌 `{start_of_chorus}`。
- 掃描裡的裁切圖檔名（`P01_L2` 等）**不一定照歌曲順序**，以圖上標題為準。

### 設計慣例（現階段）

- **雙主題，使用者可切**（header 的 `ThemeToggle`：自動 / 淺 / 深，存 `localStorage['hymnbook.theme']`，`layout.tsx` 有 no-flash inline script，`<html suppressHydrationWarning>`）：
  - **淺色 =「微光」**：暖米白 `#f5f4ee`、鼠尾草綠 accent `#46795a`、圓角、`.elevate` 柔和陰影。
  - **深色 =「台上」**：近黑 `#0e0e10`、金黃 accent `#e7b23c`、較扁平、`--shadow: none`。
  - token 結構：`:root`=淺；`@media(dark) :root:not([data-theme=light])`=深；`:root[data-theme=dark]`=深。多了 `--shadow` / `--radius` 兩個 token。
- 字體（`next/font`）：`Fraunces`（`--font-display`，標題，CJK 落到襯線）+ `Figtree`（`--font-sans` 內文）+ `Space Mono`（`--font-mono` 和弦）。標題加 `font-display` class。
- 配色全部走 CSS 變數，Tailwind 用語意 token（`bg-surface`、`bg-surface-2`、`text-muted`、`border-border`、`bg-accent-soft`、`text-accent`…），**不要寫死顏色**。
- 容器統一 `max-w-2xl`，手機優先。header sticky，歌曲頁的移調/Capo bar 也 sticky（`top-[53px]`）。
- 看譜區塊用 `.songline`（和弦疊在歌詞上、無和弦的行也維持行高）。三個看譜視圖共用 `SongLine`。和弦落在空白上時 `.gap` 會自動撐寬到和弦寬度。
- 已轉錄的歌：歌曲頁只顯示和弦譜，掃描原稿收進 `<details>`；未轉錄：顯示 Capo 建議 + 攤開掃描。
- 圖示用 inline SVG（stroke `currentColor`），不引 icon 套件。
- 風格提案 artifact：https://claude.ai/code/artifact/28eac242-8b8e-4cd9-a90f-0af06cdc2787

### 編輯器（`SongEditor`）

- 左 raw ChordPro textarea + 右即時預覽（`ChartPreview`）。
- `ChordPad`（`src/components/ChordPad.tsx`）：點和弦鈕在游標處插入 `[X]`。三排：**本曲**（`collectChords`）、**此調**（`diatonicChords(key)` — 六個順階和弦 + V7）、**其他**（12 個根音 × 大/小/7/m7/maj7）＋「空白」鈕。
- `diatonicChords` 在 `src/lib/music/keys.ts`，有測試。

## 本機預覽

```bash
npm run dev
```

開 http://localhost:3000 。
