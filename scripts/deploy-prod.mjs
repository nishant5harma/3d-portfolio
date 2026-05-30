#!/usr/bin/env node
/**
 * Builds static export into `out/`, then force-pushes its contents to the
 * `prod` branch for GitHub Pages.
 *
 * Enable Pages: Repo → Settings → Pages → Branch: prod / (root)
 * Live URL: https://nishant5harma.github.io/3d-portfolio/
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "out");
const deployDir = join(root, ".deploy-prod-tmp");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

if (!existsSync(outDir)) {
  console.error("Missing `out/` folder. Run `npm run build:gh` first.");
  process.exit(1);
}

const remote = execSync("git remote get-url origin", {
  cwd: root,
  encoding: "utf8",
}).trim();

rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });
cpSync(outDir, deployDir, { recursive: true });
// GitHub Pages: allow _next/ and skip Jekyll processing
writeFileSync(join(deployDir, ".nojekyll"), "");
// Keep deploy branch clean
try {
  rmSync(join(deployDir, ".DS_Store"), { force: true });
} catch {
  /* ignore */
}

console.log("\n→ Publishing static build to origin/prod …\n");

run("git init", { cwd: deployDir });
run("git checkout -b prod", { cwd: deployDir });
run("git add -A", { cwd: deployDir });
run('git commit -m "Production build"', { cwd: deployDir });
run(`git remote add origin "${remote}"`, { cwd: deployDir });
run("git push -f origin prod", { cwd: deployDir });

rmSync(deployDir, { recursive: true, force: true });

console.log("\n✓ Deployed to branch `prod`");
console.log("  Enable GitHub Pages: Settings → Pages → prod / root");
console.log("  https://nishant5harma.github.io/3d-portfolio/\n");
