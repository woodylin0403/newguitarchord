import { getChordShape, shapeBaseFret } from "@/lib/chords/shapes";

const STRINGS = 6;
const FRETS = 4;
const GAP = 10; // between strings
const ROW = 13; // between frets
const PAD_X = 8;
const PAD_TOP = 13; // room for ×/○ markers
const W = PAD_X * 2 + GAP * (STRINGS - 1);
const H = PAD_TOP + ROW * FRETS + 3;

/**
 * A compact guitar chord-box for one chord symbol. Server component (pure SVG).
 * `label` overrides the printed name (e.g. the transposed symbol).
 */
export function ChordDiagram({
  symbol,
  label,
}: {
  symbol: string;
  label?: string;
}) {
  const name = label ?? symbol;
  const shape = getChordShape(symbol);

  if (!shape) {
    return (
      <div className="flex w-16 shrink-0 flex-col items-center gap-1">
        <div style={{ height: H }} className="grid place-items-center">
          <span className="text-muted">—</span>
        </div>
        <span className="font-mono text-xs">{name}</span>
      </div>
    );
  }

  const base = shapeBaseFret(shape.frets);
  const stringX = (i: number) => PAD_X + i * GAP;
  const fretY = (row: number) => PAD_TOP + row * ROW; // row 0 = nut line

  const fretted = shape.frets
    .map((f, i) => ({ f, i }))
    .filter((d): d is { f: number; i: number } => typeof d.f === "number" && d.f > 0);
  const minFret = fretted.length ? Math.min(...fretted.map((d) => d.f)) : 0;
  const barreStrings = fretted.filter((d) => d.f === minFret).map((d) => d.i);
  const hasBarre =
    shape.movable && barreStrings.length >= 2 &&
    Math.max(...barreStrings) - Math.min(...barreStrings) >= 2;

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="text-foreground"
        aria-hidden
      >
        {/* frets */}
        {Array.from({ length: FRETS + 1 }, (_, r) => (
          <line
            key={`f${r}`}
            x1={PAD_X}
            y1={fretY(r)}
            x2={PAD_X + GAP * (STRINGS - 1)}
            y2={fretY(r)}
            stroke="currentColor"
            strokeWidth={r === 0 && base === 1 ? 2.5 : 1}
            opacity={r === 0 && base === 1 ? 1 : 0.55}
          />
        ))}
        {/* strings */}
        {Array.from({ length: STRINGS }, (_, i) => (
          <line
            key={`s${i}`}
            x1={stringX(i)}
            y1={fretY(0)}
            x2={stringX(i)}
            y2={fretY(FRETS)}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.55}
          />
        ))}

        {/* base-fret label when not starting at the nut */}
        {base > 1 && (
          <text
            x={PAD_X - 4}
            y={fretY(0) + ROW}
            textAnchor="end"
            className="fill-muted"
            fontSize={8}
          >
            {base}
          </text>
        )}

        {/* open / muted markers */}
        {shape.frets.map((f, i) =>
          f === 0 ? (
            <circle
              key={`o${i}`}
              cx={stringX(i)}
              cy={PAD_TOP - 6}
              r={2.4}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.7}
            />
          ) : f === null ? (
            <text
              key={`m${i}`}
              x={stringX(i)}
              y={PAD_TOP - 3}
              textAnchor="middle"
              className="fill-muted"
              fontSize={8}
            >
              ×
            </text>
          ) : null,
        )}

        {/* barre */}
        {hasBarre && (
          <rect
            x={stringX(Math.min(...barreStrings)) - 3}
            y={fretY(minFret - base) + (ROW - 6) / 2}
            width={
              stringX(Math.max(...barreStrings)) -
              stringX(Math.min(...barreStrings)) +
              6
            }
            height={6}
            rx={3}
            fill="currentColor"
          />
        )}

        {/* finger dots */}
        {fretted.map(({ f, i }) =>
          hasBarre && f === minFret ? null : (
            <circle
              key={`d${i}`}
              cx={stringX(i)}
              cy={fretY(f - base) + ROW / 2}
              r={3}
              fill="currentColor"
            />
          ),
        )}
      </svg>
      <span className="font-mono text-xs">{name}</span>
    </div>
  );
}
