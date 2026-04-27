import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const assets = [
  "auth-client.js",
  "events-data.js",
  "users-data.js",
  "purchases-data.js",
  "profissionais-data.js",
];

if (!fs.existsSync(distDir)) {
  console.log("[copy-static-assets] dist directory not found, skipping.");
  process.exit(0);
}

for (const asset of assets) {
  const source = path.join(rootDir, asset);
  const target = path.join(distDir, asset);
  if (!fs.existsSync(source)) {
    console.warn(`[copy-static-assets] missing source: ${asset}`);
    continue;
  }
  fs.copyFileSync(source, target);
  console.log(`[copy-static-assets] copied ${asset}`);
}
