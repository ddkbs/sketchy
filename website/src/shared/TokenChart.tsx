import { useState } from "react";

/** Measured cost per answer in USD, six questions in one session (Claude Sonnet, mean of 2 runs). */
const SERIES = [
  {
    id: "text",
    label: "Plain text",
    color: "#a8861c",
    perAnswer: [0.039, 0.0746, 0.0925, 0.113, 0.1334, 0.156],
  },
  {
    id: "json",
    label: "Sketchy (JSON scenes)",
    color: "#6b8ef0",
    perAnswer: [0.0652, 0.0877, 0.1122, 0.1364, 0.1601, 0.184],
  },
  {
    id: "compact",
    label: "Sketchy (compact scenes)",
    color: "#ef5444",
    perAnswer: [0.0498, 0.0677, 0.0829, 0.1058, 0.1255, 0.1446],
  },
].map((s) => ({
  ...s,
  total: s.perAnswer.map((_, i) => s.perAnswer.slice(0, i + 1).reduce((a, b) => a + b, 0)),
}));

const W = 680;
const H = 320;
const PAD = { left: 56, right: 24, top: 16, bottom: 40 };
const MAX = 0.8;
const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / 5;
const y = (v: number) => PAD.top + (1 - v / MAX) * (H - PAD.top - PAD.bottom);
const usd = (v: number) => `$${v.toFixed(2)}`;

/** Cumulative cost over one session, with a crosshair tooltip and a table view. */
export function TokenChart() {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="not-prose my-6">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.id} className="flex items-center gap-2">
            <span className="inline-block h-[2px] w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Cumulative cost over six answers in one session. Plain text ends at $0.61, Sketchy with JSON scenes at $0.75, Sketchy with compact scenes at $0.58."
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * 5);
            setHover(Math.max(0, Math.min(5, i)));
          }}
        >
          {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={12}
                fill="rgba(255,255,255,0.45)"
              >
                {usd(v)}
              </text>
            </g>
          ))}
          {SERIES[0]!.total.map((_, i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 14}
              textAnchor="middle"
              fontSize={12}
              fill="rgba(255,255,255,0.45)"
            >
              {i + 1}
            </text>
          ))}
          <text
            x={(PAD.left + W - PAD.right) / 2}
            y={H}
            textAnchor="middle"
            fontSize={12}
            fill="rgba(255,255,255,0.45)"
          >
            answers in the session
          </text>
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}
          {SERIES.map((s) => (
            <g key={s.id}>
              <polyline
                points={s.total.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={x(5)}
                cy={y(s.total[5]!)}
                r={4}
                fill={s.color}
                stroke="#0b0b0e"
                strokeWidth={2}
              />
              {hover !== null && (
                <circle
                  cx={x(hover)}
                  cy={y(s.total[hover]!)}
                  r={4}
                  fill={s.color}
                  stroke="#0b0b0e"
                  strokeWidth={2}
                />
              )}
            </g>
          ))}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-border-strong bg-background/95 px-3 py-2 text-[12.5px] shadow-lg"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              transform: hover > 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <div className="mb-1 text-muted-foreground">
              After {hover + 1} answer{hover ? "s" : ""}
            </div>
            {SERIES.map((s) => (
              <div key={s.id} className="flex items-center gap-2 tabular-nums">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto pl-3 text-foreground">{usd(s.total[hover]!)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-[13px] text-muted-foreground">
        Cumulative cost of six explanations in one session, Claude Sonnet list prices, mean of two
        runs.
      </figcaption>
      <table className="mt-4">
        <thead>
          <tr>
            <th>Answer</th>
            {SERIES.map((s) => (
              <th key={s.id}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERIES[0]!.perAnswer.map((_, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {SERIES.map((s) => (
                <td key={s.id} className="tabular-nums">
                  {usd(s.perAnswer[i]!)}{" "}
                  <span className="text-muted-foreground">({usd(s.total[i]!)})</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
