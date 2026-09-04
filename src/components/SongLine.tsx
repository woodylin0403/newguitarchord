import { Fragment } from "react";

import { transposeChordToken, type ChordProLine } from "@/lib/music";

/**
 * One rendered ChordPro line — chords stacked over lyric syllables. Pure and
 * shared by the inline view, performance view and editor preview.
 *
 * - Chords keep their written spelling until the reader actually transposes.
 * - When a chord sits on a blank gap (its lyric starts with whitespace, e.g.
 *   `[Am7] 因為`), the gap is widened to at least the chord's width so the
 *   chord lands *in* the blank instead of overlapping the next word.
 * - `markSpaces` (editor preview) underlines that gap so it's visible.
 */
export function SongLine({
  line,
  semitones = 0,
  targetKey = "",
  markSpaces = false,
}: {
  line: ChordProLine;
  semitones?: number;
  targetKey?: string;
  markSpaces?: boolean;
}) {
  if (line.kind === "blank") return <div className="h-4" aria-hidden />;
  if (line.kind === "comment") {
    return <p className="song-comment my-1 italic text-muted">{line.text}</p>;
  }

  return (
    <p className="songline">
      {line.chunks.map((chunk, i) => {
        const chord =
          chunk.chord === null
            ? null
            : semitones !== 0
              ? transposeChordToken(chunk.chord, { semitones, targetKey })
              : chunk.chord;
        return (
          <span key={i}>
            <span className="chord">{chord ?? " "}</span>
            <span className="lyric">
              {renderLyric(chunk.lyric, chord, markSpaces)}
            </span>
          </span>
        );
      })}
    </p>
  );
}

function renderLyric(
  lyric: string,
  chord: string | null,
  markSpaces: boolean,
) {
  const leading = /^([ 　\t]+)([\s\S]*)$/.exec(lyric);
  const chordOnGap = chord && (lyric === "" || leading !== null);

  if (!chordOnGap) {
    if (!markSpaces) return lyric || " ";
    return leading ? (
      <Fragment>
        <span className="ws">{leading[1]}</span>
        {leading[2]}
      </Fragment>
    ) : (
      lyric || " "
    );
  }

  const ws = lyric === "" ? " " : leading![1];
  const rest = lyric === "" ? "" : leading![2];
  // Reserve room for the chord text (mono, ~0.62em per char at its font size).
  const minWidth = `${Math.max(1, chord.length) * 0.62}em`;

  return (
    <Fragment>
      <span
        className={markSpaces ? "gap ws" : "gap"}
        style={{ minWidth }}
        aria-hidden
      >
        {ws}
      </span>
      {rest}
    </Fragment>
  );
}
