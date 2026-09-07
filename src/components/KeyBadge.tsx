import { Badge } from "@/components/ui/badge";
import { keyLabel } from "@/lib/songs/labels";

/** Small pill showing a song's key. */
export function KeyBadge({ musicKey }: { musicKey: string }) {
  return (
    <Badge variant="outline" className="rounded-full">
      {keyLabel(musicKey)}
    </Badge>
  );
}
