import type { NextRequest } from "next/server";

// Domains that are sharing widgets / social actions, not curated content
const SHARING_DOMAINS = new Set([
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "pocket.com",
  "getpocket.com",
  "instapaper.com",
  "pinterest.com",
  "reddit.com",
  "linkedin.com",
  "tumblr.com",
  "addthis.com",
  "sharethis.com",
  "feedburner.com",
  "feedly.com",
  "mailto:",
]);

function isEditorialLink(href: URL, pageUrl: URL): boolean {
  // Internal links (same hostname) are site chrome, not curated content
  if (href.hostname === pageUrl.hostname) return false;
  // Strip leading www. before checking sharing domains
  const host = href.hostname.replace(/^www\./, "");
  if (SHARING_DOMAINS.has(host)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(targetUrl.toString(), {
      headers: { "User-Agent": "Blink/1.0" },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch page: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  // Each curated link is the first <a> inside an <li>; the rest are share buttons.
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const firstHrefRe = /href\s*=\s*(?:"([^"]*?)"|'([^']*?)')/i;
  const seen = new Set<string>();
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRe.exec(html)) !== null) {
    const aMatch = firstHrefRe.exec(liMatch[1]);
    if (!aMatch) continue;
    const raw = (aMatch[1] ?? aMatch[2] ?? "").trim();
    if (!raw) continue;
    try {
      const resolved = new URL(raw, targetUrl.toString());
      if (
        (resolved.protocol === "http:" || resolved.protocol === "https:") &&
        isEditorialLink(resolved, targetUrl)
      ) {
        seen.add(resolved.toString());
      }
    } catch {
      // skip unparseable hrefs
    }
  }

  return Response.json({ urls: [...seen] });
}
