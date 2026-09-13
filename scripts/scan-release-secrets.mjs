import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  basename,
  extname,
  resolve,
} from "node:path";
import { projectRoot } from "./lib/release-process.mjs";

const repositoryRoot = projectRoot;
const candidates = [
  projectRoot,
  ...[
    "00-项目总纲.md",
    "01-开发者文档.md",
    "02-项目规划.md",
    "03-开发历史.md",
    "04-智能体设计架构.md",
  ].map((name) => resolve(repositoryRoot, "doc", name)),
];
const allowedExtensions = new Set([
  ".json",
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".ini",
  ".js",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".properties",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const allowedNames = new Set([
  ".env.example",
  ".gitignore",
  ".node-version",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
]);
const excludedNames = new Set([
  ".data",
  ".git",
  ".local-secrets",
  ".pnpm-store",
  ".release-audit",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  ".hyperframes",
  "playwright-report",
  "test-results",
]);
const findings = [];

async function scan(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOTDIR") {
      if (error.code === "ENOENT") return;
      throw error;
    }
    const name = path.replaceAll("\\", "/");
    if (
      !allowedExtensions.has(extname(path))
      && !allowedNames.has(basename(path))
    ) {
      return;
    }
    const text = await readFile(path, "utf8");
    if (
      /sk-[0-9a-fA-F]{32,}/u.test(text)
      || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(text)
      || /(?:DEEPSEEK|IFLYTEK)_[A-Z_]*(?:KEY|SECRET|TOKEN)[ \t]*=[ \t]*[^\s#=]{8,}/u
        .test(text)
    ) {
      findings.push(name);
    }
    return;
  }
  for (const entry of entries) {
    if (
      excludedNames.has(entry.name)
      || entry.name.startsWith(".data-")
      || entry.name === ".env"
      || (entry.name.startsWith(".env.") && entry.name !== ".env.example")
    ) {
      continue;
    }
    await scan(resolve(path, entry.name));
  }
}

for (const candidate of candidates) await scan(candidate);
if (findings.length > 0) {
  throw new Error(`发布源发现疑似真实密钥：${findings.join(", ")}`);
}
process.stdout.write(
  "release secret scan ok: no credential-shaped values in active release source\n",
);
