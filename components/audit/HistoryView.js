"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { CHECK_BY_ID } from "@/lib/audit/checks";
import { Card, CardHeader, Delta, EmptyState, SeverityIcon, ScoreRing, cx, fmt, formatDate } from "./ui";

function ScoreTrend({ entries }) {
  const [hover, setHover] = useState(null);
  const w = 640;
  const h = 200;
  const pad = { l: 36, r: 16, t: 16, b: 28 };
  const xs = (i) => pad.l + (entries.length === 1 ? (w - pad.l - pad.r) / 2 : (i / (entries.length - 1)) * (w - pad.l - pad.r));
  const ys = (v) => pad.t + (1 - v / 100) * (h - pad.t - pad.b);
  const path = entries.map((e, i) => `${i ? "L" : "M"}${xs(i)},${ys(e.score)}`).join(" ");
  const area = `${path} L${xs(entries.length - 1)},${ys(0)} L${xs(0)},${ys(0)} Z`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Site health over time">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={ys(v)} y2={ys(v)} stroke="#eef2f8" strokeWidth="1" />
            <text x={pad.l - 8} y={ys(v) + 4} textAnchor="end" fontSize="11" fill="#6f7c96">{v}</text>
          </g>
        ))}
        <path d={area} fill="#2a78d6" opacity="0.1" />
        <path d={path} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {entries.map((e, i) => (
          <g key={e.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={xs(i)} cy={ys(e.score)} r="14" fill="transparent" />
            <circle cx={xs(i)} cy={ys(e.score)} r={hover === i ? 6 : 4.5} fill="#2a78d6" stroke="#fff" strokeWidth="2" />
          </g>
        ))}
        {entries.length > 0 && (
          <text x={xs(entries.length - 1)} y={ys(entries[entries.length - 1].score) - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b1736">
            {entries[entries.length - 1].score}%
          </text>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lift"
          style={{ left: `${(xs(hover) / w) * 100}%`, top: `${(ys(entries[hover].score) / h) * 100}%`, marginTop: -10 }}
        >
          <div className="font-bold text-ink">{entries[hover].score}% health</div>
          <div className="text-mute">{formatDate(entries[hover].finishedAt)}</div>
          <div className="mt-1 tabular-nums text-ink-2">{fmt(entries[hover].counts.error)} errors · {fmt(entries[hover].counts.warning)} warnings</div>
        </div>
      )}
    </div>
  );
}

export default function HistoryView({ report, history }) {
  const entries = history.filter((h) => h.host === report.rootHost).sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
  const current = entries.find((e) => e.finishedAt === report.finishedAt);
  const prev = entries.filter((e) => e.finishedAt < report.finishedAt).pop();

  if (entries.length < 2 || !prev) {
    return (
      <Card>
        <EmptyState
          icon={<TrendingUp size={22} />}
          title="Track your progress over time"
          description={`This is your first saved audit of ${report.rootHost} in this browser. Run the audit again after making fixes to see new and fixed issues, and how your health score changes.`}
        />
      </Card>
    );
  }

  const ids = new Set([...Object.keys(prev.issues), ...Object.keys(current?.issues || {})]);
  const changes = [...ids]
    .map((id) => ({ id, before: prev.issues[id] || 0, after: current?.issues?.[id] || 0 }))
    .filter((c) => c.before !== c.after && CHECK_BY_ID[c.id])
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
  const fixed = changes.filter((c) => c.after < c.before);
  const worse = changes.filter((c) => c.after > c.before);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Site health over time" subtitle={`${entries.length} audits of ${report.rootHost}`} />
          <div className="px-4 pb-4 pt-2">
            <ScoreTrend entries={entries} />
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-[15px] font-bold text-ink">Compared with previous audit</h3>
          <p className="text-xs text-mute">{formatDate(prev.finishedAt)}</p>
          <dl className="mt-4 space-y-3">
            {[
              ["Site health", report.score, prev.score, false, "%"],
              ["Errors", report.counts.error, prev.counts.error, true, ""],
              ["Warnings", report.counts.warning, prev.counts.warning, true, ""],
              ["Notices", report.counts.notice, prev.counts.notice, true, ""],
              ["Pages crawled", current?.pages ?? 0, prev.pages, null, ""],
            ].map(([label, now, before, goodDown, unit]) => (
              <div key={label} className="flex items-center justify-between gap-3 border-b border-line-2 pb-3 last:border-0">
                <dt className="text-sm text-ink-2">{label}</dt>
                <dd className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-faint">{fmt(before)}{unit} →</span>
                  <span className="text-sm font-bold tabular-nums text-ink">{fmt(now)}{unit}</span>
                  {goodDown !== null ? <Delta value={now - before} goodWhenDown={goodDown} /> : <span className="w-14" />}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Improved", subtitle: "Issues with fewer affected pages than last time", list: fixed, empty: "No issues improved since the previous audit." },
          { title: "Got worse", subtitle: "New issues or more affected pages than last time", list: worse, empty: "Nothing got worse. Great job." },
        ].map((col) => (
          <Card key={col.title}>
            <CardHeader title={col.title} subtitle={col.subtitle} />
            {col.list.length === 0 ? (
              <p className="px-6 py-8 text-sm text-mute">{col.empty}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line-2 pb-2">
                {col.list.map((c) => {
                  const check = CHECK_BY_ID[c.id];
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                      <SeverityIcon severity={check.severity} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{check.name}</span>
                      <span className="text-xs tabular-nums text-faint">{fmt(c.before)} →</span>
                      <span className="w-10 text-right text-sm font-bold tabular-nums text-ink">{fmt(c.after)}</span>
                      <Delta value={c.after - c.before} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="All audits" subtitle="Stored in this browser" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas/70 text-xs font-bold uppercase tracking-wider text-mute">
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Health</th>
                <th className="px-4 py-3 text-right">Pages</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-right">Warnings</th>
                <th className="px-6 py-3 text-right">Notices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {[...entries].reverse().map((e) => (
                <tr key={e.id} className={cx(e.finishedAt === report.finishedAt && "bg-brand-50/50")}>
                  <td className="px-6 py-3 text-ink">{formatDate(e.finishedAt)}{e.finishedAt === report.finishedAt && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">CURRENT</span>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><ScoreRing score={e.score} size={34} stroke={4} /></div></td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.pages)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.counts.error)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(e.counts.warning)}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{fmt(e.counts.notice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
