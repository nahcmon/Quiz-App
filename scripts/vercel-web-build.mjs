import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const repoRoot = execSync("git rev-parse --show-toplevel", {
  cwd: projectRoot,
  encoding: "utf8",
}).trim();

execSync("npx -y npm@10.9.2 run build", {
  cwd: repoRoot,
  stdio: "inherit",
});

const sourceDir = path.join(repoRoot, "apps", "web", "dist");
const outputDir = path.join(projectRoot, "dist-public");

if (!existsSync(sourceDir)) {
  throw new Error(`Web build output not found: ${sourceDir}`);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
cpSync(sourceDir, outputDir, { recursive: true });
