#!/usr/bin/env node
/**
 * Builds static export into `out/`, then publishes its contents to the
 * `prod` branch for GitHub Pages.
 *
 * Uses a git worktree against the main repo so authentication
 * (credential helper, SSH, gh) is inherited automatically.
 *
 * Enable Pages: Repo → Settings → Pages → Branch: prod / (root)
 * Live URL: https://nishant5harma.github.io/3d-portfolio/
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = join(root, "out");
const worktreeDir = join(root, ".deploy-prod-worktree");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}
function out(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: "utf8", ...opts }).trim();
}

if (!existsSync(outDir)) {
  console.error("Missing `out/` folder. Run `npm run build:gh` first.");
  process.exit(1);
}

// ---- 1. Ensure a clean worktree on the `prod` branch ----------------
console.log("\n→ Preparing worktree on origin/prod …\n");

try {
  run(`git worktree remove --force "${worktreeDir}"`, { stdio: "ignore" });
} catch {
  /* nothing to remove */
}
rmSync(worktreeDir, { recursive: true, force: true });

// Fetch the latest prod branch so the worktree resets cleanly. If the
// branch doesn't exist yet, create an orphan.
let prodExists = true;
try {
  run("git fetch origin prod", { stdio: "ignore" });
} catch {
  prodExists = false;
}

if (prodExists) {
  run(`git worktree add --force -B prod "${worktreeDir}" origin/prod`);
} else {
  run(`git worktree add --force --orphan -b prod "${worktreeDir}"`);
}

// ---- 2. Wipe worktree contents (preserve .git) ----------------------
for (const entry of readdirSync(worktreeDir)) {
  if (entry === ".git") continue;
  rmSync(join(worktreeDir, entry), { recursive: true, force: true });
}

// ---- 3. Copy static build into the worktree -------------------------
cpSync(outDir, worktreeDir, { recursive: true });
writeFileSync(join(worktreeDir, ".nojekyll"), "");

try {
  rmSync(join(worktreeDir, ".DS_Store"), { force: true });
} catch {
  /* ignore */
}

// Drop unreferenced heavy assets to keep payload small (~7 MB savings).
const STRIP = ["old.png", "old-vintage.png", "newlook.png"];
for (const file of STRIP) {
  try {
    rmSync(join(worktreeDir, file), { force: true });
  } catch {
    /* ignore */
  }
}

// ---- 4. Bump Service Worker version so repeat visitors get fresh JS -
const swPath = join(worktreeDir, "sw.js");
if (existsSync(swPath)) {
  try {
    const sw = readFileSync(swPath, "utf8");
    const stamp = `v${Date.now()}`;
    writeFileSync(
      swPath,
      sw.replace(
        /const CACHE_VERSION = "[^"]*";/,
        `const CACHE_VERSION = "${stamp}";`,
      ),
    );
  } catch (err) {
    console.warn("Could not bump SW version:", err);
  }
}

// ---- 5. Commit + push from the worktree (auth inherited from origin)
console.log("\n→ Committing static build to origin/prod …\n");

run("git add -A", { cwd: worktreeDir });

const hasChanges = out("git status --porcelain", { cwd: worktreeDir });
if (!hasChanges) {
  console.log("\n✓ No changes to deploy — prod is already up to date.\n");
} else {
  run('git commit -m "Production build"', { cwd: worktreeDir });
  run("git push origin prod", { cwd: worktreeDir });
  console.log("\n✓ Deployed to branch `prod`");
}

// ---- 6. Cleanup -----------------------------------------------------
try {
  run(`git worktree remove --force "${worktreeDir}"`);
} catch {
  rmSync(worktreeDir, { recursive: true, force: true });
}

console.log(
  "  Enable GitHub Pages: Settings → Pages → prod / root",
);
console.log("  https://nishant5harma.github.io/3d-portfolio/\n");
