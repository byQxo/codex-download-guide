import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const preferredDir = path.join(projectRoot, "dist");
const fallbackDir = path.join(projectRoot, "public");
const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : fs.existsSync(preferredDir)
    ? preferredDir
    : fallbackDir;
const port = Number(process.env.PORT || 3000);

const app = express();
app.disable("x-powered-by");

app.get("/healthz", (_req, res) => {
  res.type("application/json").send(JSON.stringify({ status: "ok" }));
});

app.use(express.static(staticDir, { index: "index.html", redirect: false }));

app.use((req, res, next) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).send("Bad URL");
  }

  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  const candidate = path.resolve(staticDir, relativePath, "index.html");
  const root = path.resolve(staticDir);
  if (!candidate.startsWith(`${root}${path.sep}`) || !fs.existsSync(candidate)) {
    return next();
  }
  return res.sendFile(candidate);
});

app.use((_req, res) => {
  const indexPath = path.join(staticDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send("Mirror has not been generated. Run npm run mirror first.");
  }
  return res.sendFile(indexPath);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`yudidc mirror listening on http://0.0.0.0:${port}`);
  console.log(`serving ${staticDir}`);
});

