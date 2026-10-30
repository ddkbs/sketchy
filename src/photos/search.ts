import { createHash } from "node:crypto";
import type { Attribution } from "../scene/types.js";

export const USER_AGENT = "Sketchy/0.1 (https://github.com/ddkbs/sketchy)";

export type ImageCandidate = {
  id: string;
  provider: "Wikimedia Commons" | "Openverse";
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
  /** Downscaled rendition (≤ 1280 px wide) used for display and grounding. */
  fileUrl: string;
  /** Small rendition shown to Claude when choosing a photo. */
  thumbUrl: string;
  width: number;
  height: number;
  description?: string;
};

export type SearchOptions = { minWidth?: number; limit?: number };

/**
 * Only licenses that allow reuse with attribution qualify. Non-commercial
 * and no-derivatives licenses are excluded because labeling is a derivative.
 */
export function normalizeLicense(raw: string): string | undefined {
  const s = raw.trim().replace(/\s+/g, " ");
  if (/^(cc0|cc-zero)/i.test(s)) return "CC0";
  if (/^(public domain|pd\b|pd-|pdm)/i.test(s)) return "Public domain";
  const cc = /^cc[ -]?(by(?:[ -]sa)?)(?:[ -]?(\d\.\d))?/i.exec(s);
  if (cc && !/nc|nd/i.test(s)) {
    const kind = cc[1]!.toUpperCase().replace(/[ -]/g, "-");
    return `CC ${kind}${cc[2] ? ` ${cc[2]}` : ""}`;
  }
  return undefined;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateId(provider: string, key: string): string {
  return `img-${createHash("sha1").update(`${provider}:${key}`).digest("hex").slice(0, 10)}`;
}

type WikimediaPage = {
  title: string;
  index?: number;
  imageinfo?: {
    url: string;
    thumburl?: string;
    thumbwidth?: number;
    thumbheight?: number;
    width: number;
    height: number;
    descriptionurl: string;
    mime: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }[];
};

export async function searchWikimedia(
  query: string,
  options: SearchOptions = {},
): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(30, (options.limit ?? 8) * 3)),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    // Wikimedia only serves a fixed set of thumbnail widths.
    iiurlwidth: "1280",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ObjectName|ImageDescription",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Wikimedia Commons answered ${response.status}.`);
  const data = (await response.json()) as { query?: { pages?: WikimediaPage[] } };
  const pages = [...(data.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const results: ImageCandidate[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
    const meta = info.extmetadata ?? {};
    const license = normalizeLicense(meta.LicenseShortName?.value ?? "");
    if (!license) continue;
    if (info.width < (options.minWidth ?? 800)) continue;
    const scaled = info.thumburl && info.width > 1280;
    const fileUrl = scaled ? info.thumburl! : info.url;
    results.push({
      id: candidateId("wikimedia", page.title),
      provider: "Wikimedia Commons",
      title: stripHtml(
        meta.ObjectName?.value ?? page.title.replace(/^File:/, "").replace(/\.\w+$/, ""),
      ),
      author: stripHtml(meta.Artist?.value ?? "") || "unknown",
      license,
      licenseUrl: meta.LicenseUrl?.value,
      sourceUrl: info.descriptionurl,
      fileUrl,
      thumbUrl: info.thumburl?.replace(/\/1280px-/, "/330px-") ?? fileUrl,
      width: scaled ? info.thumbwidth! : info.width,
      height: scaled ? info.thumbheight! : info.height,
      description: stripHtml(meta.ImageDescription?.value ?? "").slice(0, 200) || undefined,
    });
    if (results.length >= (options.limit ?? 8)) break;
  }
  return results;
}

type OpenverseResult = {
  id: string;
  title?: string;
  creator?: string;
  license: string;
  license_version?: string;
  license_url?: string;
  foreign_landing_url: string;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  source?: string;
};

export async function searchOpenverse(
  query: string,
  options: SearchOptions = {},
): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    license: "cc0,pdm,by,by-sa",
    page_size: String(Math.min(20, (options.limit ?? 8) * 2)),
  });
  const response = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Openverse answered ${response.status}.`);
  const data = (await response.json()) as { results?: OpenverseResult[] };
  const results: ImageCandidate[] = [];
  for (const r of data.results ?? []) {
    const raw =
      r.license === "pdm" ? "Public domain" : `CC ${r.license} ${r.license_version ?? ""}`;
    const license = normalizeLicense(raw);
    if (!license || !r.width || !r.height || r.width < (options.minWidth ?? 800)) continue;
    // Openverse links the original file; size is reduced after download.
    results.push({
      id: candidateId("openverse", r.id),
      provider: "Openverse",
      title: r.title ?? "Untitled",
      author: r.creator ?? "unknown",
      license,
      licenseUrl: r.license_url,
      sourceUrl: r.foreign_landing_url,
      fileUrl: r.url,
      thumbUrl: r.thumbnail ?? r.url,
      width: r.width,
      height: r.height,
    });
    if (results.length >= (options.limit ?? 8)) break;
  }
  return results;
}

/** Wikimedia first (rich metadata), Openverse to fill up. */
export async function searchImages(
  query: string,
  options: SearchOptions = {},
): Promise<ImageCandidate[]> {
  const limit = options.limit ?? 6;
  const errors: string[] = [];
  const found: ImageCandidate[] = [];
  for (const search of [searchWikimedia, searchOpenverse]) {
    if (found.length >= limit) break;
    try {
      found.push(...(await search(query, { ...options, limit: limit - found.length })));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (found.length === 0 && errors.length) throw new Error(errors.join(" "));
  return found;
}

export function attributionOf(c: ImageCandidate): Attribution {
  return {
    title: c.title,
    author: c.author,
    license: c.license,
    licenseUrl: c.licenseUrl,
    sourceUrl: c.sourceUrl,
    provider: c.provider,
  };
}
