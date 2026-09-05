import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const artifactsDir = path.join(root, "artifacts");
const manifestPath = path.join(artifactsDir, "mirror-manifest.json");
const report = { checkedAt: new Date().toISOString(), ok: true, checks: [] };

function check(name, passed, details) {
  report.checks.push({ name, passed, details });
  if (!passed) report.ok = false;
}

try {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const records = manifest.records || [];
  check("manifest-present", records.length > 0, `records=${records.length}`);
  check("all-fetches-successful", records.every((record) => record.status >= 200 && record.status < 400), records.filter((record) => record.status < 200 || record.status >= 400).slice(0, 10));
} catch (error) {
  check("manifest-present", false, error.message);
}

const htmlFiles = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(html|css|js|json|txt|xml)$/i.test(entry.name)) htmlFiles.push(absolute);
  }
}
try {
  await walk(publicDir);
  const text = (await Promise.all(htmlFiles.map((file) => fs.readFile(file, "utf8")))).join("\n");
  check("no-yancc-domain", !/yancc\.cloud/i.test(text), "built source contains no yancc.cloud");
  check("assistant-removed", !/codex-advisor-widget/i.test(text), "advisor scripts removed");
  check("brand-present", text.includes("郁的 Codex 下载站"), "custom brand found");
  check("proxy-registration-cta", /class="proxy-promo-card[^"]*"[^>]*href="https:\/\/api\.yudidc\.cc\/register"/i.test(text), "proxy CTA points to the local registration page");
} catch (error) {
  check("public-readable", false, error.message);
}

await fs.mkdir(artifactsDir, { recursive: true });
await fs.writeFile(path.join(artifactsDir, "verify-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
