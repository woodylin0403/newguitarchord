# 歌曲和弦內容（ChordPro）

每首轉錄好的詩歌一個檔案：

```
data/songs/<slug>.chordpro
```

`slug` = 原調小寫 + `-` + 該調序號，和網址一致。對照 `../songs.json`：

| songs.json 條目 | slug | 檔名 |
|---|---|---|
| `C` 區塊第 3 首 | `c-3` | `data/songs/c-3.chordpro` |
| `Dm` 區塊第 11 首 | `dm-11` | `data/songs/dm-11.chordpro` |
| `D` 區塊第 55 首（如鹿切慕溪水） | `d-55` | `data/songs/d-55.chordpro` |

沒有對應檔案的歌，網站會顯示 Capo 建議 + 掃描原稿，等待轉錄。

## 格式

見 [`EXAMPLE.chordpro`](./EXAMPLE.chordpro)。重點：

- `{title:}`、`{key:}`、`{capo:}`、`{time:}` 等中繼資料寫在最前面。
  - `{key:}` 若省略，網站用 `songs.json` 的原調。
- `[和弦]` 直接插在歌詞對應的字前面，例如 `[D]神啊 [A]我的心切[Bm]慕你`。
- `{start_of_chorus: 副歌}` … `{end_of_chorus}` 標示副歌；`{soc}` / `{eoc}` 是簡寫。
  另有 `{start_of_verse}` / `{start_of_bridge}`。
- `{comment: 文字}` 是譜上的提示（力度、速度等）。
- `#` 開頭的行是原始碼註解，不會顯示。
- 空行分段。

## 解析與呈現

- 解析器：[`src/lib/music/chordpro.ts`](../../src/lib/music/chordpro.ts)
- 讀取：[`src/lib/songs/content.ts`](../../src/lib/songs/content.ts)
- 移調 / Capo：[`src/lib/music/`](../../src/lib/music/)（和弦性質如 `m7`、`sus4`、`/F#` 會原樣保留）
