"use client";

import { Card, CardHeader, BarList, ColumnChart, StackedBar, Legend, fmt, formatMs, formatBytes } from "./ui";

const BLUE = "#2a78d6";

function StatTile({ label, value, sub }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold text-mute">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-mute">{sub}</div>}
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="px-6 pb-6 pt-5">{children}</div>
    </Card>
  );
}

export default function StatsView({ report }) {
  const s = report.stats;
  const t = s.totals;
  const fetched = report.pages.filter((p) => p.fetched).length;
  const statusColors = { "2XX": "#0ca30c", "3XX": "#ec835a", "4XX": "#d03b3b", "5XX": "#8f1f1f", Failed: "#a3adc2" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Average load time" value={formatMs(t.avgLoad)} sub="HTML pages, full download" />
        <StatTile label="Average HTML size" value={formatBytes(t.avgSize)} sub={`${fmt(t.compressed)} of ${fmt(t.htmlPages)} compressed`} />
        <StatTile label="Average word count" value={fmt(t.avgWords)} sub="Visible text per page" />
        <StatTile label="HTTPS coverage" value={`${fetched ? Math.round((t.https / fetched) * 100) : 0}%`} sub={`${fmt(t.https)} of ${fmt(fetched)} URLs`} />
        <StatTile label="Internal links" value={fmt(t.internalLinks)} sub="Unique per page, summed" />
        <StatTile label="External links" value={fmt(t.externalLinks)} sub={`${fmt(report.resources.externalChecked)} checked for errors`} />
        <StatTile label="Images" value={fmt(t.images)} sub={`${fmt(report.resources.imageChecked)} internal images checked`} />
        <StatTile label="Sitemap URLs" value={fmt(report.sitemapUrlCount)} sub={report.site?.sitemap?.found ? "Found in sitemap.xml" : "No sitemap found"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="HTTP status codes" subtitle="Every crawled URL by response class">
          <StackedBar segments={s.status.map((d) => ({ ...d, color: statusColors[d.label] }))} height={14} />
          <div className="mt-4">
            <Legend items={s.status.map((d) => ({ label: d.label, value: d.value, color: statusColors[d.label] }))} />
          </div>
        </ChartCard>

        <ChartCard title="Indexability" subtitle="Whether search engines can index each URL">
          <BarList data={s.indexability} color={BLUE} />
        </ChartCard>

        <ChartCard title="Crawl depth" subtitle="Clicks needed to reach a page from the start URL">
          <ColumnChart data={s.depth} color={BLUE} />
        </ChartCard>

        <ChartCard title="Load time" subtitle="Full HTML download time per URL">
          <ColumnChart data={s.load} color={BLUE} />
        </ChartCard>

        <ChartCard title="Incoming internal links" subtitle="How many crawled pages link to each HTML page">
          <ColumnChart data={s.inlinks} color={BLUE} />
        </ChartCard>

        <ChartCard title="Word count" subtitle="Visible words on each HTML page">
          <ColumnChart data={s.words} color={BLUE} />
        </ChartCard>

        <ChartCard title="HTML size" subtitle="Uncompressed document size">
          <ColumnChart data={s.sizes} color={BLUE} />
        </ChartCard>

        <ChartCard title="Markup coverage" subtitle={`Share of ${fmt(t.htmlPages)} HTML pages using each markup type`}>
          <BarList data={s.markup} total={t.htmlPages} color={BLUE} />
          {s.schemaTypes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Top schema.org types</div>
              <div className="flex flex-wrap gap-1.5">
                {s.schemaTypes.map((x) => (
                  <span key={x.label} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand">
                    {x.label} <span className="font-normal text-ink-2">· {fmt(x.value)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
