import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const artifactsDir = path.join(root, "artifacts");
const sourceOrigin = "https://download.yancc.cloud";
const publicSiteUrl = process.env.PUBLIC_SITE_URL || "https://download.yudidc.cc";
const apiBaseUrl = process.env.API_BASE_URL || "https://api.yudidc.cc";
const queue = [new URL(`${sourceOrigin}/`)];
const queued = new Set(queue.map((url) => url.href));
const seen = new Set();
const records = [];
const allowedExternalHosts = new Set([
  "openai.com",
  "www.openai.com",
  "developers.openai.com",
  "help.openai.com",
  "pan.quark.cn",
  "api.yudidc.cc",
]);

await fs.rm(publicDir, { recursive: true, force: true });
await fs.mkdir(publicDir, { recursive: true });
await fs.mkdir(artifactsDir, { recursive: true });

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function localPathFor(url) {
  const pathname = decodeURIComponent(url.pathname || "/");
  if (pathname === "/") return path.join(publicDir, "index.html");
  if (pathname.endsWith("/")) return path.join(publicDir, pathname, "index.html");
  return path.join(publicDir, pathname);
}

function isHtml(response, url) {
  const type = response.headers.get("content-type") || "";
  return type.includes("text/html") || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
}

function normalizeUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    url.hash = "";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    return url;
  } catch {
    return null;
  }
}

function mapUrl(raw, base) {
  const url = normalizeUrl(raw, base);
  if (!url) return raw;
  if (url.origin === sourceOrigin) {
    return `${url.pathname || "/"}${url.search}`;
  }
  if (url.hostname === "us.yancc.cloud") {
    return `${apiBaseUrl}${url.pathname}${url.search}`;
  }
  return raw;
}

function enqueueFrom(raw, base) {
  const url = normalizeUrl(raw, base);
  if (!url || url.origin !== sourceOrigin || queued.has(url.href)) return;
  if (["mailto:", "javascript:", "data:"].includes(url.protocol)) return;
  if (url.pathname === "/llms.txt" || url.pathname === "/docs/sitemap.xml" || url.pathname.startsWith("/articles/articles/") || /^\/articles\/(cli|windows|mac)\/$/.test(url.pathname)) return;
  queued.add(url.href);
  queue.push(url);
}

function rewriteBrand(text) {
  return text
    .replace(/(?:郁的\s+)+Codex\s+下载站/g, "郁的 Codex 下载站")
    .replace(/(?:郁的\s+)+Codex\s+下载指南/g, "郁的 Codex 下载指南")
    .replaceAll("Codex下载站", "郁的 Codex 下载站")
    .replaceAll("Codex 下载站", "郁的 Codex 下载站")
    .replaceAll("Codex下载指南", "郁的 Codex 下载指南")
    .replaceAll("Codex 下载指南", "郁的 Codex 下载指南")
    .replaceAll("Codex下载官网", "郁的 Codex 下载站")
    .replaceAll(">Codex 下载</span>", ">郁的 Codex 下载站</span>")
    .replaceAll('aria-label="Codex 首页"', 'aria-label="郁的 Codex 下载站首页"')
    .replaceAll("codexdown.cn", "download.yudidc.cc")
    .replaceAll("us.yancc.cloud", "api.yudidc.cc")
    .replaceAll("Yancc", "Yudidc")
    .replaceAll("yancc", "yudidc")
    .replace(/(?:郁的\s+)+Codex\s+下载站/g, "郁的 Codex 下载站")
    .replace(/(?:郁的\s+)+Codex\s+下载指南/g, "郁的 Codex 下载指南");
}

function rewriteHtml(html, pageUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });
  $("script[src]").each((_index, element) => {
    const src = $(element).attr("src") || "";
    if (src.includes("codex-advisor-widget")) $(element).remove();
  });
  $("[href], [src], [poster], [action]").each((_index, element) => {
    for (const attribute of ["href", "src", "poster", "action"]) {
      const value = $(element).attr(attribute);
      if (value) $(element).attr(attribute, mapUrl(value, pageUrl));
    }
  });
  $("meta[content], title, body").each((_index, element) => {
    if (element.tagName === "meta") {
      const content = $(element).attr("content");
      if (content) $(element).attr("content", rewriteBrand(content.replaceAll(sourceOrigin, publicSiteUrl)));
    } else {
      $(element).html(rewriteBrand($(element).html() || ""));
    }
  });
  return rewriteBrand($.html()
    .replaceAll(sourceOrigin, publicSiteUrl)
    .replaceAll("https://us.yancc.cloud", apiBaseUrl)
    .replaceAll('"/llms.txt"', '"/mirror/assets/llms-02f8e6a6f9c3.txt"')
    .replaceAll('"/docs/sitemap.xml"', '"/mirror/assets/sitemap-0486dc4a6455.xml"')
    .replaceAll('"/docs/getting-started/use-cases/"', '"/docs/"')
    .replaceAll('"/docs/getting-started/community/"', '"/docs/"')
    .replaceAll('"/docs/getting-started/pricing/"', '"/docs/"')
    .replaceAll('"/articles/cli/"', '"/articles/"')
    .replaceAll('"/articles/windows/"', '"/articles/"')
    .replaceAll('"/articles/mac/"', '"/articles/"')
    .replaceAll('"/dy2yt/"', '"/"')
    .replaceAll('"/cdn-cgi/l/email-protection"', '"/"')
    .replaceAll("/articles//articles/", "/articles/")
    .replaceAll("/articles/articles/", "/articles/"));
}

function rewriteText(text) {
  return rewriteBrand(text)
    .replaceAll(sourceOrigin, publicSiteUrl)
    .replaceAll("https://us.yancc.cloud", apiBaseUrl)
    .replaceAll("http://us.yancc.cloud", apiBaseUrl);
}

async function saveResponse(url, response, body) {
  const destination = localPathFor(url);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, body);
  const relative = path.relative(root, destination).replaceAll(path.sep, "/");
  records.push({ url: url.href, localPath: relative, status: response.status, sha256: hash(body) });
  return destination;
}

while (queue.length) {
  const url = queue.shift();
  if (seen.has(url.href)) continue;
  seen.add(url.href);
  let response;
  try {
    response = await fetch(url, { redirect: "follow", headers: { "User-Agent": "yudidc-mirror/1.0" } });
  } catch (error) {
    records.push({ url: url.href, status: 0, error: error.message });
    continue;
  }
  const raw = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    records.push({ url: url.href, status: response.status, sha256: hash(raw) });
    continue;
  }
  if (isHtml(response, url)) {
    const html = rewriteHtml(raw.toString("utf8"), url);
    const destination = await saveResponse(url, response, Buffer.from(html));
    if (url.pathname === "/") await fs.copyFile(destination, path.join(root, "index.html"));
    const $ = cheerio.load(html, { decodeEntities: false });
    $("a[href], link[href], script[src], img[src], video[src], source[src], video[poster]").each((_index, element) => {
      for (const attribute of ["href", "src", "poster"]) {
        const value = $(element).attr(attribute);
        if (value) enqueueFrom(value, url);
      }
    });
  } else {
    const type = response.headers.get("content-type") || "";
    const body = /(?:text\/|application\/(?:json|javascript|xml))/i.test(type)
      ? Buffer.from(rewriteText(raw.toString("utf8")))
      : raw;
    await saveResponse(url, response, body);
  }
  if (seen.size % 25 === 0) console.log(`mirrored ${seen.size} resources; queue=${queue.length}`);
}

await fs.writeFile(
  path.join(artifactsDir, "mirror-manifest.json"),
  `${JSON.stringify({ sourceOrigin, publicSiteUrl, apiBaseUrl, generatedAt: new Date().toISOString(), records }, null, 2)}\n`,
);
const checksums = records.filter((record) => record.sha256).map((record) => `${record.sha256}  ${record.localPath}`).join("\n");
await fs.writeFile(path.join(artifactsDir, "sha256sums.txt"), `${checksums}\n`);
console.log(`mirror complete: ${records.length} records`);
console.log(`allowed external hosts: ${[...allowedExternalHosts].join(", ")}`);
