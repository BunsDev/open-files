#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const binaryExtensions = new Set([
  ".avif",
  ".bmp",
  ".dmg",
  ".gif",
  ".gz",
  ".icns",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".pdf",
  ".png",
  ".tar",
  ".tgz",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const ignoredPathParts = new Set([
  ".git",
  "dist",
  "node_modules",
  "src-tauri/target",
]);

const patterns = [
  {
    name: "private key block",
    regex: /-----BEGIN (?:(?:RSA|DSA|EC|OPENSSH|PGP) )?PRIVATE KEY-----/g,
  },
  {
    name: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/g,
  },
  {
    name: "OpenAI API key",
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
  },
  {
    name: "Anthropic API key",
    regex: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/g,
  },
  {
    name: "AWS access key id",
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "Google API key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: "Slack token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  },
  {
    name: "Stripe live secret key",
    regex: /\b[rs]k_live_[0-9A-Za-z]{24,}\b/g,
  },
  {
    name: "suspicious credential assignment",
    regex:
      /\b(?:api[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret|password|private[_-]?key|secret)\b\s*[:=]\s*["']?([A-Za-z0-9_./+=:-]{24,})["']?/gi,
  },
];

function trackedAndUntrackedFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean);
}

function extensionFor(path) {
  const last = path.split("/").pop() ?? path;
  const index = last.lastIndexOf(".");
  return index === -1 ? "" : last.slice(index).toLowerCase();
}

function shouldSkip(path) {
  if ([...ignoredPathParts].some((part) => path === part || path.startsWith(`${part}/`))) {
    return true;
  }
  return binaryExtensions.has(extensionFor(path));
}

function isBinary(buffer) {
  return buffer.subarray(0, 8192).includes(0);
}

function lineNumberFor(text, index) {
  return text.slice(0, index).split("\n").length;
}

function redact(match) {
  if (match.length <= 12) return "[redacted]";
  return `${match.slice(0, 6)}…${match.slice(-4)}`;
}

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : trackedAndUntrackedFiles();
const findings = [];

for (const file of files) {
  if (shouldSkip(file)) continue;

  let buffer;
  try {
    buffer = readFileSync(file);
  } catch (error) {
    findings.push({ file, line: 0, name: "unreadable file", match: error.message });
    continue;
  }

  if (isBinary(buffer)) continue;

  const text = buffer.toString("utf8");
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      findings.push({
        file,
        line: lineNumberFor(text, match.index),
        name: pattern.name,
        match: redact(match[0]),
      });
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets detected:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.name}] ${finding.match}`);
  }
  console.error("\nIf this is a false positive, narrow the pattern or scan a smaller explicit file set.");
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} candidate files checked).`);
