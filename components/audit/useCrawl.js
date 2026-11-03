"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildReport } from "@/lib/audit/analyze";

const INITIAL_PROGRESS = { phase: "idle", message: "", crawled: 0, queued: 0, discovered: 0, recent: [], startedAt: 0, site: null, maxPages: 0 };

/**
 * Drives a crawl: streams NDJSON events from /api/crawl, keeps live progress,
 * and builds the report in the browser when the stream ends or is stopped.
 */
export function useCrawl() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const stateRef = useRef(null);
  const flushRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const finish = useCallback((reason) => {
    const s = stateRef.current;
    if (!s || s.finished) return;
    s.finished = true;
    if (!s.site || !s.pages.length) {
      setStatus("error");
      setError(reason === "stopped" ? "The audit was stopped before any pages were crawled." : s.error || "No pages could be crawled. Please check the address and try again.");
      return;
    }
    const finishedAt = new Date();
    try {
      const built = buildReport({
        site: s.site,
        pages: s.pages,
        resources: s.resources,
        meta: {
          startUrl: s.startUrl,
          startedAt: s.startedAt,
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - new Date(s.startedAt).getTime(),
          reason: s.reason || reason,
          options: s.options,
          discovered: s.discovered || 0,
        },
      });
      setReport(built);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Something went wrong while building the report. Please run the audit again.");
    }
  }, []);

  const start = useCallback(async (url, options) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    stateRef.current = { pages: [], resources: {}, site: null, startUrl: "", startedAt: new Date().toISOString(), options, reason: "", finished: false, error: "" };
    setReport(null);
    setError("");
    setStatus("running");
    setProgress({ ...INITIAL_PROGRESS, phase: "connecting", message: "Connecting", startedAt: Date.now(), maxPages: options.maxPages });

    const flush = (patch = {}) => {
      const s = stateRef.current;
      setProgress((prev) => ({
        ...prev,
        ...patch,
        crawled: s.pages.filter((p) => p.fetched).length,
        recent: s.pages.slice(-8).reverse(),
        site: s.site,
      }));
    };

    let res;
    try {
      res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, options }),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) return finish("stopped");
      setStatus("error");
      setError("Unable to reach the audit server. Please check your connection and try again.");
      return;
    }

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      setStatus("error");
      setError(data?.error || "The audit could not be started. Please try again.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const handle = (event) => {
      const s = stateRef.current;
      switch (event.t) {
        case "start":
          s.startUrl = event.startUrl;
          s.startedAt = event.startedAt;
          s.options = event.options;
          break;
        case "phase":
          flush({ phase: event.phase, message: event.message });
          break;
        case "site":
          s.site = event.site;
          flush();
          break;
        case "page":
          s.pages.push(event.page);
          if (Date.now() - flushRef.current > 200) {
            flushRef.current = Date.now();
            flush();
          }
          break;
        case "progress":
          s.discovered = event.discovered;
          flush({ queued: event.queued, discovered: event.discovered });
          break;
        case "resources":
          s.resources[event.kind === "external" ? "external" : "image"] = event.results;
          s.resources[event.kind === "external" ? "externalTotal" : "imageTotal"] = event.total;
          break;
        case "done":
          s.reason = event.reason;
          if (event.discovered) s.discovered = event.discovered;
          flush({ phase: "report", message: "Building your report" });
          break;
        case "error":
          s.error = event.message;
          break;
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            handle(JSON.parse(line));
          } catch {}
        }
      }
    } catch {
      // Aborted by the user, or the connection dropped: build what we have
    }
    const s = stateRef.current;
    if (!s.reason) s.reason = controller.signal.aborted ? "stopped" : "interrupted";
    flush();
    // Let the final progress paint before the (synchronous) report build
    setTimeout(() => finish(s.reason), 30);
  }, [finish]);

  const stop = useCallback(() => {
    if (stateRef.current) stateRef.current.reason = "stopped";
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stateRef.current = null;
    setStatus("idle");
    setReport(null);
    setError("");
    setProgress(INITIAL_PROGRESS);
  }, []);

  return { status, progress, report, error, start, stop, reset, setError };
}
