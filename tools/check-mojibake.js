#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOTS = [
  path.join(process.cwd(), "public"),
  path.join(process.cwd(), "src"),
];
const ALLOWED_EXTENSIONS = new Set([".js", ".html", ".css", ".json", ".md", ".txt"]);

// Typical mojibake code points seen when UTF-8 text is decoded with legacy code pages.
// These should not appear in source UI text.
const SUSPICIOUS_CODEPOINTS = new Set([
  0x00c3, // Ã
  0x00c2, // Â
  0x00e2, // â
  0xfffd, // replacement char
  0x0102, // Ă
  0x0139, // Ĺ
  0x013d, // Ľ
  0x0141, // Ł
  0x0142, // ł
  0x0164, // Ť
  0x0165, // ť
  0x0111, // đ
  0x017a, // ź
  0x010f, // ď
  0x0179, // Ź
  0x00ad, // soft hyphen
]);

const IGNORED_DIR_PARTS = new Set(["node_modules", "public/js/libs"]);

function shouldIgnorePath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const part of IGNORED_DIR_PARTS) {
    if (normalized.includes(part)) {
      return true;
    }
  }
  return false;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldIgnorePath(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function lineAndColumn(text, index) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

function findIssuesInFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const issues = [];

  for (let index = 0; index < text.length; index += 1) {
    const code = text.codePointAt(index);
    if (!SUSPICIOUS_CODEPOINTS.has(code)) {
      continue;
    }

    const { line, col } = lineAndColumn(text, index);
    const contextStart = Math.max(0, index - 25);
    const contextEnd = Math.min(text.length, index + 25);
    const context = text.slice(contextStart, contextEnd).replace(/\n/g, "\\n");

    issues.push({
      filePath,
      line,
      col,
      code,
      context,
    });
  }

  return issues;
}

function isAsciiLetter(char) {
  if (!char) return false;
  const code = char.codePointAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isExtendedLatinLetter(char) {
  if (!char) return false;
  const code = char.codePointAt(0);
  return code >= 0x00c0 && code <= 0x017f;
}

function isLetter(char) {
  return isAsciiLetter(char) || isExtendedLatinLetter(char);
}

function looksLikeQueryParameter(text, questionMarkIndex) {
  const tail = text.slice(questionMarkIndex + 1, questionMarkIndex + 32);
  return /^[A-Za-z0-9_]+=/.test(tail);
}

function findQuestionMarkPlaceholderIssues(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const issues = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "?") {
      continue;
    }

    const next = text[index + 1] || "";
    const nextIsLetter = isLetter(next);

    if (!nextIsLetter) {
      continue;
    }

    // Skip URL query patterns like "?v=".
    if (looksLikeQueryParameter(text, index)) {
      continue;
    }

    const { line, col } = lineAndColumn(text, index);
    const contextStart = Math.max(0, index - 25);
    const contextEnd = Math.min(text.length, index + 25);
    const context = text.slice(contextStart, contextEnd).replace(/\n/g, "\\n");

    issues.push({
      filePath,
      line,
      col,
      code: 0x003f,
      context,
    });
  }

  return issues;
}

function main() {
  const files = ROOTS.flatMap((root) => walk(root));
  const allIssues = [];

  for (const filePath of files) {
    const fileIssues = findIssuesInFile(filePath);
    const placeholderIssues = findQuestionMarkPlaceholderIssues(filePath);
    if (fileIssues.length) {
      allIssues.push(...fileIssues);
    }
    if (placeholderIssues.length) {
      allIssues.push(...placeholderIssues);
    }
  }

  if (!allIssues.length) {
    console.log("Encoding check passed: no mojibake markers found.");
    return;
  }

  console.error("Encoding check failed. Suspicious mojibake markers found:");
  for (const issue of allIssues.slice(0, 100)) {
    console.error(
      `- ${path.relative(process.cwd(), issue.filePath)}:${issue.line}:${issue.col} `
      + `(U+${issue.code.toString(16).toUpperCase()}) ${issue.context}`,
    );
  }

  if (allIssues.length > 100) {
    console.error(`... and ${allIssues.length - 100} more.`);
  }

  process.exitCode = 1;
}

main();
