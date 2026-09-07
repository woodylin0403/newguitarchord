"use server";

import Anthropic from "@anthropic-ai/sdk";

import { getCurrentUser, isAdminEmail } from "@/lib/supabase/server";

export interface OcrResult {
  ok: boolean;
  text?: string;
  error?: string;
}

// Sonnet 5, not Opus — this runs inside a Vercel function (60s cap) and Opus at
// high effort routinely blew past it, leaving the UI stuck on "辨識中".
const MODEL = "claude-sonnet-5";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB after base64 decode
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const PROMPT = [
  "你是吉他和弦譜轉錄助手。附圖是一張「和弦圖」：每一段是「和弦列」在上、",
  "「歌詞列」在下，和弦符號的左緣，垂直對齊它應該落下的那個歌詞字。",
  "",
  "轉成 ChordPro。重點在「對位」——請對每一組（和弦列 + 歌詞列）照這個步驟做：",
  "1. 先把歌詞列完整讀出來。以「欄」為單位：一個全形中文字算 1 欄，一個半形空白算 1 欄。",
  "2. 對和弦列裡的每一個和弦，看它的「左緣」在圖上水平對齊到歌詞的第幾欄（從 1 開始數）。",
  "   —— 是用像素水平位置去比對和弦左緣 vs 每個字的左緣，不是看它是第幾個和弦。",
  "3. 把 [和弦] 插在「第 N 欄那個字」的正前方。若第 N 欄剛好落在兩字之間的空白，",
  "   寫成 [和弦] 再接一個半形空白，再接下一個字。",
  "4. 若同一行有兩個和弦算到同一欄，把後面那個往後挪一欄。",
  "",
  "務必逐一核對每個和弦的水平位置，不要整排往左推。第一個和弦幾乎都不在行首",
  "（左邊有一段縮排），要放到它真正對齊的字前面。做完再回頭比對一次圖再輸出。",
  "",
  "其他規則：",
  "• 和弦原樣保留，圖上寫什麼就輸出什麼（含 m7、maj7、sus、add、6、9、轉位 /G 等），不要簡化。",
  "• 逐行輸出歌詞，保留原本的分行。",
  "• 圖最上方若有調號與拍號（例如「A 4/4」），第一行輸出 {key: A}，第二行 {time: 4/4}。",
  "• 有標題就輸出 {title: 標題}。",
  "• 出現 1. 2. 或「副歌」等段落標記時，用 {start_of_verse} / {start_of_chorus} 分段；沒有就不要加。",
  "",
  "只輸出 ChordPro 文字本身，不要任何說明、前後綴或 ``` 圍欄。",
  "",
  "對位範例：歌詞列是「哦主 我神 你的聖名」（欄：哦=1 主=2 空=3 我=4 神=5 空=6 你=7…）。",
  "和弦列裡 A 的左緣對齊第 2 欄、C#m7 對齊第 5 欄、D 對齊第 7 欄。",
  "輸出： 哦[A]主 我[C#m7]神 [D]你的聖名",
].join("\n");

/**
 * Convert a chord-chart image to ChordPro text via Claude vision. Admin only.
 * `dataUrl` is a `data:image/...;base64,...` string from the browser.
 */
export async function convertChartImage(dataUrl: string): Promise<OcrResult> {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: "沒有權限（需要管理員登入）。" };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "伺服器未設定 ANTHROPIC_API_KEY。" };
  }

  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim(),
  );
  if (!m) return { ok: false, error: "圖片格式無法辨識。" };
  const mediaType = m[1];
  const b64 = m[2];
  if (!ALLOWED.has(mediaType)) {
    return { ok: false, error: "只支援 PNG / JPEG / WebP / GIF。" };
  }
  if ((b64.length * 3) / 4 > MAX_BYTES) {
    return { ok: false, error: "圖片太大（上限 5 MB），請壓縮後再試。" };
  }

  const client = new Anthropic({ maxRetries: 1 });
  try {
    // No extended thinking: it pushed the call past Vercel's 60s function
    // limit. Accuracy now comes from the column-counting prompt alone.
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/webp"
                  | "image/gif",
                data: b64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (res.stop_reason === "refusal") {
      return { ok: false, error: "Claude 無法處理這張圖，換一張更清楚的。" };
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text) {
      return { ok: false, error: "沒有辨識到內容，換清楚一點的圖再試。" };
    }
    return { ok: true, text: stripFence(text) };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) {
        return { ok: false, error: "呼叫太頻繁或用量不足，稍後再試。" };
      }
      if (err.status === 401) {
        return { ok: false, error: "ANTHROPIC_API_KEY 無效。" };
      }
      return { ok: false, error: `辨識服務錯誤（${err.status}）。` };
    }
    return { ok: false, error: "辨識失敗，請再試一次。" };
  }
}

/** Strip a leading/trailing ``` fence the model may add despite instructions. */
function stripFence(t: string): string {
  const m = /^```[\w-]*\n([\s\S]*?)\n```$/.exec(t.trim());
  return (m ? m[1] : t).replace(/\s+$/, "") + "\n";
}
