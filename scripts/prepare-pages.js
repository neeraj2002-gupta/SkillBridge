import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const clientDir = path.join(distDir, "client");

if (fs.existsSync(clientDir)) {
  // Copy all files and directories from dist/client into dist/
  const entries = fs.readdirSync(clientDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(clientDir, entry.name);
    const destPath = path.join(distDir, entry.name);
    fs.cpSync(srcPath, destPath, { recursive: true, force: true });
  }

  // Create .nojekyll in both dist and dist/client to bypass Jekyll processing on GitHub Pages
  fs.writeFileSync(path.join(distDir, ".nojekyll"), "");
  fs.writeFileSync(path.join(clientDir, ".nojekyll"), "");

  // Create 404.html from index.html for SPA client-side routing fallback
  const distIndex = path.join(distDir, "index.html");
  if (fs.existsSync(distIndex)) {
    fs.copyFileSync(distIndex, path.join(distDir, "404.html"));
    fs.copyFileSync(distIndex, path.join(clientDir, "404.html"));
  }

  console.log("[gh-pages] Successfully prepared dist folder for GitHub Pages deployment.");
} else {
  console.warn("[gh-pages] dist/client directory not found, skipping preparation.");
}
