import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

const root = process.cwd();

test("health and core routes respond", async ({ request }) => {
  await expect((await request.get("/healthz")).status()).toBe(200);
  for (const route of ["/", "/docs/", "/articles/", "/updates/", "/pets/"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    expect(await response.text(), route).toContain("<html");
  }
});

test("article content has rewritten domains", async ({ request }) => {
  const response = await request.get("/articles/codex-cc-switch-gpt-55-third-party-api-guide/");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).not.toMatch(/(?:download|us)\.yancc\.cloud/i);
  expect(body).toContain("api.yudidc.cc");
});

test("mirrored page records are locally reachable", async ({ request }) => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "artifacts/mirror-manifest.json"), "utf8"));
  const pages = manifest.records.filter((record) => record.localPath?.endsWith("index.html"));
  expect(pages.length).toBeGreaterThan(20);
  for (const page of pages) {
    const route = `/${page.localPath.replace(/^public[\\/]/, "").replaceAll("\\", "/").replace(/index\.html$/, "")}`;
    expect((await request.get(route)).status(), route).toBe(200);
  }
});

test("homepage keeps navigation and faq interaction", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Codex/i);
  await expect(page.locator('a[href="/docs/"]').first()).toBeVisible();
  const details = page.locator("details").first();
  if (await details.count()) {
    const wasOpen = await details.evaluate((element) => element.open);
    await details.locator("summary").click();
    await expect.poll(() => details.evaluate((element) => element.open)).toBe(!wasOpen);
  }
  await expect(page).toHaveTitle(/郁的 Codex 下载站/);
});
