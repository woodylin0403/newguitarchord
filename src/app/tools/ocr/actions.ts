"use server";

import Anthropic from "@anthropic-ai/sdk";

import { parseOcrChart, type OcrChart } from "@/lib/ocr/align";
import { requireEditor } from "@/lib/supabase/authz";

export interface OcrResult {
  ok: boolean;
  /** what the model read; chord positions are measured client-side */
  chart?: OcrChart;
  error?: string;
}

// Sonnet 5, no extended thinking — runs inside a Vercel function (60s cap).
// The model only transcribes text now; alignment is measured from the image
// (src/lib/ocr/align.ts), which is where every model-only attempt fell short.
const MODEL = "claude-sonnet-5";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB after base64 decode
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const PROMPT = `附圖是一張吉他和弦譜：每一行歌詞的正上方有一行和弦（有些行只有歌詞，或只有和弦）。最上面可能有一行標題列，例如「Em 4/4 歌名 1」（調號、拍號、歌名、編號）。

你的工作只有「讀字」——和弦落在哪個字上，程式會從圖上量測，你只要給一個粗估當備援。

只回傳一個 JSON 物件，不要任何其他文字：
{
  "header": true,
  "title": "歌名（沒有就空字串）",
  "key": "標題列的調號，例如 Em（沒有就空字串）",
  "time": "拍號，例如 4/4（沒有就空字串）",
  "lines": [
    {
      "chords": [{ "chord": "Em", "at": 2 }, { "chord": "B7", "at": 11 }],
      "lyrics": "當聖靈在我的心 我要歌頌主 像當年",
      "section": null,
      "label": null
    }
  ]
}

規則：
- lines 依圖上由上到下的順序；一組「和弦行＋它下面的歌詞行」算一個元素。只有歌詞的行 chords 給 []；只有和弦的行 lyrics 給 ""。標題列不要放進 lines。header 表示圖最上面有沒有標題列。
- chords：這一行上方的和弦，由左到右，原樣照抄（m7、maj7、sus4、add9、D/F# 都不要簡化）。印在一起沒有空隔的要拆開，例如「B7Em」→ B7、Em；「C#m7F#m7」→ C#m7、F#m7。
- at：你粗估這個和弦落在 lyrics 的第幾個字元（從 0 起算，空白也算一個字元）。
- lyrics：歌詞原文照抄，括號、（二次）等都保留；詞組之間有明顯空隔就放一個半形空白。
- section：若這一行是新段落的開頭填 "verse"、"chorus" 或 "bridge"，否則 null；label 是段落標記文字（例如「一」「1」），沒有就 null。`;

/**
 * Transcribe a chord-chart image via Claude vision. Editor/admin.
 * `dataUrl` is a `data:image/...;base64,...` string from the browser.
 */
export async function convertChartImage(dataUrl: string): Promise<OcrResult> {
  const { error: authError } = await requireEditor();
  if (authError) return { ok: false, error: authError };

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
      .join("");

    const chart = parseOcrChart(extractJson(text));
    if (!chart) {
      return { ok: false, error: "沒有辨識到歌詞或和弦，換清楚一點的圖再試。" };
    }
    return { ok: true, chart };
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

/** Parse the model's reply as JSON, tolerating a ``` fence or stray prose. */
function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}
