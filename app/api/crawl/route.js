import { NextResponse } from "next/server";
import { runCrawl, sanitizeOptions } from "@/lib/crawler/crawl";
import { assertResolvablePublicHost } from "@/lib/crawler/net";
import { coerceStartUrl } from "@/lib/audit/url";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { planFor } from "@/lib/plans";

// Long crawls stream progress; the crawl itself stops ~20s before this limit
// so the report always arrives before the platform cuts the request off.
export const maxDuration = 300;

const TIME_BUDGET_MS = Math.max(30, Number(process.env.CRAWL_TIME_BUDGET_SECONDS) || maxDuration - 20) * 1000;
const MAX_CONCURRENT_PER_CLIENT = 2;
const activeByClient = new Map();

function clientKey(req) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || req.headers.get("x-real-ip") || "local";
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const startUrl = coerceStartUrl(body?.url);
  if (!startUrl) {
    return NextResponse.json({ error: "Please enter a valid website address, for example https://example.com" }, { status: 400 });
  }

  try {
    await assertResolvablePublicHost(startUrl);
  } catch (err) {
    const message = err?.code === "EBLOCKED"
      ? "This address points to a private or internal network and cannot be audited."
      : `We couldn't find ${new URL(startUrl).hostname}. Please check the domain name and try again.`;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const key = clientKey(req);
  if ((activeByClient.get(key) || 0) >= MAX_CONCURRENT_PER_CLIENT) {
    return NextResponse.json({ error: "You already have audits running. Please wait for them to finish." }, { status: 429 });
  }
  activeByClient.set(key, (activeByClient.get(key) || 0) + 1);
  const release = () => {
    const n = (activeByClient.get(key) || 1) - 1;
    if (n <= 0) activeByClient.delete(key);
    else activeByClient.set(key, n);
  };

  // Plan limits are enforced here, not just in the UI
  const plan = planFor(await getCurrentUserRecord());
  const options = sanitizeOptions(body?.options);
  if (options.maxPages > plan.maxPages) {
    release();
    return NextResponse.json({ error: `Your ${plan.name} plan audits up to ${plan.maxPages} pages. Upgrade to Pro to crawl up to 1,000 pages.`, upgrade: true }, { status: 403 });
  }
  if (!plan.speeds.includes(options.speed)) options.speed = "normal";
  const abort = new AbortController();
  req.signal?.addEventListener("abort", () => abort.abort());
  const encoder = new TextEncoder();
  const deadline = Date.now() + TIME_BUDGET_MS;

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const emit = (event) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false;
          abort.abort();
        }
      };
      emit({ t: "start", startUrl, options, startedAt: new Date().toISOString(), timeBudgetMs: TIME_BUDGET_MS });
      try {
        await runCrawl({ startUrl, options, signal: abort.signal, emit, deadline });
      } catch (err) {
        emit({ t: "error", message: err?.message || "The crawl failed unexpectedly." });
      } finally {
        release();
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {}
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
