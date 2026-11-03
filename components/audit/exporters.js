import { CHECK_BY_ID, CATEGORIES } from "@/lib/audit/checks";

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Neutralise spreadsheet formula injection and quote everything that needs it
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\n\r]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows) {
  // BOM so Excel opens UTF-8 correctly
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = (report) => `${report.rootHost}-${report.finishedAt.slice(0, 10)}`;

export function exportPagesCsv(report) {
  const header = ["URL", "Status", "Indexability", "Title", "Title length", "Meta description", "Description length", "H1", "Canonical", "Depth", "Incoming links", "Outgoing internal links", "External links", "Word count", "Text ratio %", "Load time (ms)", "HTML size (bytes)", "Compressed", "Errors", "Warnings", "Notices", "Issues"];
  const rows = report.pages.map((p) => [
    p.url,
    p.fetched ? p.status || "Failed" : "Blocked",
    p.indexability,
    p.title || "",
    p.title ? p.title.length : "",
    p.metaDescription || "",
    p.metaDescription ? p.metaDescription.length : "",
    (p.h1 || []).join(" | "),
    p.canonical || "",
    p.depth ?? "",
    p.inlinks,
    (p.links || []).filter((l) => l.internal).length,
    (p.links || []).filter((l) => !l.internal).length,
    p.wordCount ?? "",
    p.textRatio ?? "",
    p.loadTime ?? "",
    p.size ?? "",
    p.encoding ? "Yes" : p.fetched ? "No" : "",
    p.counts.error,
    p.counts.warning,
    p.counts.notice,
    p.issues.map((i) => CHECK_BY_ID[i.id].name + (i.detail ? ` (${i.detail})` : "")).join(" | "),
  ]);
  download(`sire-crawler-pages-${stamp(report)}.csv`, toCsv([header, ...rows]), "text/csv;charset=utf-8");
}

export function exportIssuesCsv(report) {
  const header = ["Severity", "Category", "Issue", "URL", "Details", "Why it matters", "How to fix"];
  const rows = [];
  for (const issue of report.issues) {
    const check = CHECK_BY_ID[issue.id];
    for (const item of issue.items) {
      rows.push([
        check.severity,
        CATEGORIES[check.category].label,
        check.name,
        item.url,
        [item.detail, ...(item.list || [])].filter(Boolean).join(" | "),
        check.why,
        check.fix,
      ]);
    }
  }
  download(`sire-crawler-issues-${stamp(report)}.csv`, toCsv([header, ...rows]), "text/csv;charset=utf-8");
}

export function exportJson(report) {
  download(`sire-crawler-report-${stamp(report)}.json`, JSON.stringify(report, null, 2), "application/json");
}
