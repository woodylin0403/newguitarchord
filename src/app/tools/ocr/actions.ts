"use server";

import Anthropic from "@anthropic-ai/sdk";

import { getCurrentUser, isAdminEmail } from "@/lib/supabase/server";

export interface OcrResult {
  ok: boolean;
  text?: string;
  error?: string;
}

const MODEL = "claude-sonnet-5";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB after base64 decode
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const PROMPT = [
  "你是吉他和弦譜轉錄助手。附圖是一張「和弦圖」：和弦符號寫在歌詞上方，",
  "每個和弦符號的第一個字元，垂直對齊它應該落下的那個歌詞字。",
  "",
  "做法：對每一行，逐一看每個和弦符號在圖上的水平位置（它的左緣 x 座標），",
  "找出正下方那一行歌詞裡「哪一個字」的位置最接近，[和弦] 就插在那個字的正前方。",
  "",
  "特別注意第一個和弦：它常常不在該行第一個字的上方（左邊有一段縮排空白），",
  "這時要把它插在它真正對齊的字前面，例如變成「哦[A]主」，",
  "不要因為它是該行第一個和弦就放到行首。逐一比對每個和弦，不要整排往左推。",
  "",
  "其他規則：",
  "• 和弦寫成 [C]。和弦落在兩字之間的空白處時，寫成 [C] 再接一個半形空白，再接下一個字。",
  "• 逐行輸出歌詞，保留原本的分行。",
  "• 和弦原樣保留，圖上寫什麼就輸出什麼（含 m7、maj7、sus、add、6、9、轉位 /G 等），不要簡化。",
  "• 圖最上方若有調號與拍號（例如「A 4/4」），第一行輸出 {key: A}，第二行 {time: 4/4}。",
  "• 有標題就輸出 {title: 標題}。",
  "• 出現 1. 2. 或「副歌」等段落標記時，用 {start_of_verse} / {start_of_chorus} 分段；沒有就不要加。",
  "",
  "只輸出 ChordPro 文字本身，不要任何說明、前後綴或 ``` 圍欄。",
  "",
  "範例：某行歌詞「哦主 我神 你的聖名」，圖上 A 對齊「主」、C#m7 對齊「神」、D 對齊「你」，",
  "輸出為： 哦[A]主 我[C#m7]神 [D]你的聖名",
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

  const client = new Anthropic();
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      // A little reasoning materially improves chord-to-syllable alignment
      // (especially the first chord of a line); low effort keeps cost bounded.
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
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
