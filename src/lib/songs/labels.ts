import { parseKey, type CatalogKey } from "@/lib/music";

/** Human label for a key, e.g. `C` -> "C 大調", `Am` -> "A 小調". */
export function keyLabel(key: string): string {
  const info = parseKey(key);
  if (!info) return key;
  const root = info.name.replace(/m$/, "");
  return `${root} ${info.mode === "minor" ? "小調" : "大調"}`;
}

/** Short label used in tight spots, e.g. `Am` -> "Am". */
export function keyShort(key: CatalogKey): string {
  return key;
}
