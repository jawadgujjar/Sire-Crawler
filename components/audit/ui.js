"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleAlert, TriangleAlert, Info, ChevronDown, Check } from "lucide-react";

// ─── Formatting ───────────────────────────────────────────────────────────────

export const nf = new Intl.NumberFormat("en-US");
export const fmt = (n) => nf.format(Math.round(n || 0));

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatMs(ms) {
  if (ms === undefined || ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── Severity ─────────────────────────────────────────────────────────────────

export const SEVERITY_STYLE = {
  error: { Icon: CircleAlert, icon: "text-critical", soft: "bg-critical-50", ring: "ring-critical/15", bar: "bg-critical", label: "Error", plural: "Errors" },
  warning: { Icon: TriangleAlert, icon: "text-warning", soft: "bg-warning-50", ring: "ring-warning/25", bar: "bg-warning", label: "Warning", plural: "Warnings" },
  notice: { Icon: Info, icon: "text-notice", soft: "bg-notice-50", ring: "ring-notice/15", bar: "bg-notice", label: "Notice", plural: "Notices" },
};

export function SeverityIcon({ severity, size = 16, className = "" }) {
  const s = SEVERITY_STYLE[severity];
  return <s.Icon size={size} strokeWidth={2.2} className={cx(s.icon, "shrink-0", className)} aria-hidden="true" />;
}

export function SeverityBadge({ severity, children }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-2 ring-1 ring-inset", s.soft, s.ring)}>
      <SeverityIcon severity={severity} size={13} />
      {children ?? s.label}
    </span>
  );
}

export function scoreTone(score) {
  if (score >= 90) return { stroke: "#0ca30c", text: "text-good-ink", soft: "bg-good-50", label: "Excellent" };
  if (score >= 80) return { stroke: "#1d4ed8", text: "text-brand", soft: "bg-brand-50", label: "Good" };
  if (score >= 60) return { stroke: "#fab219", text: "text-warning-ink", soft: "bg-warning-50", label: "Needs work" };
  return { stroke: "#d03b3b", text: "text-critical", soft: "bg-critical-50", label: "Poor" };
}

// ─── Status code pill ─────────────────────────────────────────────────────────

export function StatusPill({ page }) {
  let label, dot, tone;
  if (!page.fetched) [label, dot, tone] = ["Blocked", "bg-faint", "text-mute"];
  else if (!page.status) [label, dot, tone] = ["Failed", "bg-critical", "text-critical"];
  else if (page.status >= 400) [label, dot, tone] = [String(page.status), "bg-critical", "text-critical"];
  else if (page.status >= 300) [label, dot, tone] = [String(page.status), "bg-serious", "text-ink-2"];
  else [label, dot, tone] = [String(page.status), "bg-good", "text-ink-2"];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md bg-line-2 px-2 py-0.5 text-xs font-semibold tabular-nums", tone)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

// ─── Layout primitives ────────────────────────────────────────────────────────

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={cx("rounded-2xl border border-line/80 bg-white shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={cx("flex items-start justify-between gap-4 px-6 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }) {
  const variants = {
    primary: "bg-brand text-white shadow-glow hover:bg-brand-600 active:bg-brand-600 disabled:shadow-none",
    secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-canvas hover:ring-[#d5dceb]",
    ghost: "text-ink-2 hover:bg-line-2 hover:text-ink",
    danger: "bg-white text-critical ring-1 ring-inset ring-critical/25 hover:bg-critical-50",
    light: "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-xl",
    lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-3 transition-colors hover:bg-canvas">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-mute">{description}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function Segmented({ value, onChange, options, className = "" }) {
  return (
    <div className={cx("inline-flex rounded-xl bg-line-2 p-1", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
            value === o.value ? "bg-white text-ink shadow-sm" : "text-mute hover:text-ink"
          )}
        >
          {o.icon}
          {o.label}
          {o.count !== undefined && (
            <span className={cx("rounded-full px-1.5 text-[10px] tabular-nums", value === o.value ? "bg-brand-50 text-brand" : "bg-white/70 text-mute")}>{fmt(o.count)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="flex gap-1 overflow-x-auto" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "relative flex items-center gap-2 whitespace-nowrap px-4 py-3.5 text-sm font-semibold transition-colors",
            value === t.value ? "text-brand" : "text-mute hover:text-ink"
          )}
        >
          {t.icon}
          {t.label}
          {t.badge !== undefined && (
            <span className={cx("rounded-full px-2 py-0.5 text-[11px] tabular-nums", value === t.value ? "bg-brand-50 text-brand" : "bg-line-2 text-mute")}>{t.badge}</span>
          )}
          {value === t.value && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />}
        </button>
      ))}
    </div>
  );
}

export function Dropdown({ label, icon, children, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="md" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {icon}
        {label}
        <ChevronDown size={15} className={cx("transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div
          className={cx("animate-fade-up absolute z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-lift", align === "right" ? "right-0" : "left-0")}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon, title, description, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-canvas">
      <span className="mt-0.5 text-brand">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        {description && <span className="block text-xs text-mute">{description}</span>}
      </span>
    </button>
  );
}

// ─── Data display ─────────────────────────────────────────────────────────────

/** Semi-circular health gauge. */
export function ScoreGauge({ score, size = 200 }) {
  const tone = scoreTone(score);
  const r = 80;
  const len = Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * len;
  return (
    <div className="relative" style={{ width: size, height: size * 0.6 }}>
      <svg viewBox="0 0 200 120" width={size} height={size * 0.6} role="img" aria-label={`Site health ${score} out of 100`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#eef2f8" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${len}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-5xl font-extrabold tracking-tight text-ink">{score}<span className="text-2xl font-bold text-faint">%</span></span>
      </div>
    </div>
  );
}

export function ScoreRing({ score, size = 56, stroke = 6, light = false }) {
  const tone = scoreTone(score);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? "rgb(255 255 255 / 0.12)" : "#eef2f8"} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone.stroke} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className={cx("absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums", light ? "text-white" : "text-ink")}>{score}</span>
    </div>
  );
}

export function Delta({ value, goodWhenDown = true, suffix = "" }) {
  if (value === null || value === undefined || value === 0) return <span className="text-xs font-medium text-faint">No change</span>;
  const good = goodWhenDown ? value < 0 : value > 0;
  return (
    <span className={cx("inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums", good ? "bg-good-50 text-good-ink" : "bg-critical-50 text-critical")}>
      {value > 0 ? "+" : "−"}
      {fmt(Math.abs(value))}
      {suffix}
    </span>
  );
}

/** Horizontal bars, one series. Hover shows value and share. */
export function BarList({ data, total, onSelect, color = "#2a78d6", format = fmt }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = sum ? Math.round((d.value / sum) * 100) : 0;
        const Comp = onSelect ? "button" : "div";
        return (
          <li key={d.label}>
            <Comp
              onClick={onSelect ? () => onSelect(d) : undefined}
              title={`${d.label}: ${format(d.value)} (${pct}%)`}
              className={cx("group grid w-full grid-cols-[110px_1fr_64px] items-center gap-3 text-left", onSelect && "cursor-pointer")}
            >
              <span className="truncate text-xs font-medium text-ink-2">{d.label}</span>
              <span className="relative h-5 rounded-md bg-line-2/70">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-all duration-500 group-hover:opacity-80"
                  style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value ? 3 : 0, background: color }}
                />
              </span>
              <span className="text-right text-xs font-semibold tabular-nums text-ink">
                {format(d.value)}
                <span className="ml-1 font-normal text-faint">{pct}%</span>
              </span>
            </Comp>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical columns, one series, values on the caps. */
export function ColumnChart({ data, color = "#2a78d6", height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-2 border-b border-line" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${d.label}: ${fmt(d.value)}`}>
            <span className="mb-1 text-[11px] font-semibold tabular-nums text-ink-2">{d.value ? fmt(d.value) : ""}</span>
            <span
              className="w-full max-w-[24px] rounded-t-[4px] transition-all duration-500 group-hover:opacity-80"
              style={{ height: `${(d.value / max) * (height - 22)}px`, minHeight: d.value ? 3 : 0, background: color }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-[11px] font-medium text-mute">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Stacked horizontal bar with a 2px surface gap between segments. */
export function StackedBar({ segments, height = 12 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="rounded-full bg-line-2" style={{ height }} />;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <div key={s.label} title={`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} className="h-full min-w-[3px] transition-all duration-500" />
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-xs text-ink-2">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.icon}
          {i.label}
          {i.value !== undefined && <span className="font-semibold tabular-nums text-ink">{fmt(i.value)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">{icon}</div>
      <h4 className="text-base font-bold text-ink">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-mute">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pageCount, onChange, total, pageSize }) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-3.5 text-xs text-mute">
      <span className="tabular-nums">
        Showing <b className="text-ink">{fmt(from)}–{fmt(to)}</b> of <b className="text-ink">{fmt(total)}</b>
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</Button>
        <span className="px-2 tabular-nums">{page + 1} / {pageCount}</span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function CheckItem({ ok, label, detail, warn }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ok ? "bg-good-50 text-good-ink" : warn ? "bg-warning-50 text-warning-ink" : "bg-critical-50 text-critical")}>
        {ok ? <Check size={12} strokeWidth={3} /> : <span className="text-[11px] font-black">!</span>}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {detail && <span className="block break-words text-xs text-mute">{detail}</span>}
      </span>
    </li>
  );
}

export function Logo({ light = false, compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-[#4f86ff] via-brand to-navy-2 shadow-glow ring-1 ring-inset ring-white/20">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      </span>
      {!compact && (
        <span className={cx("text-[17px] font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>
          Sire<span className={light ? "text-[#9ec5f4]" : "text-brand"}>Crawler</span>
        </span>
      )}
    </span>
  );
}
