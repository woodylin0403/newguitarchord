import type { ChordProDocument } from "@/lib/music";
import { SongLine } from "./SongLine";

const SECTION_LABELS: Record<string, string> = {
  chorus: "副歌",
  bridge: "橋段",
  verse: "",
  none: "",
};

/** Static render of a ChordPro document — no transpose, no controls. Used for
 *  the editor's live preview. `markSpaces` underlines blank gaps a chord sits on. */
export function ChartPreview({
  document: doc,
  markSpaces = false,
}: {
  document: ChordProDocument;
  markSpaces?: boolean;
}) {
  return (
    <div className="chart space-y-6">
      {doc.sections.map((section, si) => {
        const heading = section.label || SECTION_LABELS[section.type] || null;
        return (
          <section key={si}>
            {heading && (
              <h3 className="mb-2 inline-block rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                {heading}
              </h3>
            )}
            {section.lines.map((line, li) => (
              <SongLine key={li} line={line} markSpaces={markSpaces} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
