import { keyLabel } from "@/lib/songs/labels";

/** Small pill showing a song's key. */
export function KeyBadge({ musicKey }: { musicKey: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted">
      {keyLabel(musicKey)}
    </span>
  );
}
