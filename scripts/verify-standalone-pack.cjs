#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const roots = [
  path.join(__dirname, "..", "release", "linux-unpacked", "resources", "standalone"),
  path.join(__dirname, "..", "release", "mac", "The Flame Tool.app", "Contents", "Resources", "standalone"),
  path.join(__dirname, "..", "release", "mac-arm64", "The Flame Tool.app", "Contents", "Resources", "standalone"),
  path.join(__dirname, "..", "release", "mac-universal", "The Flame Tool.app", "Contents", "Resources", "standalone"),
];

const found = roots.filter((root) => fs.existsSync(path.join(root, "server.js")));
if (!found.length) {
  console.error("No packaged standalone directory found under release/. Run linux:dir or mac:build first.");
  process.exit(1);
}

let ok = true;
for (const root of found) {
  const nextPath = path.join(root, "node_modules", "next");
  const exists = fs.existsSync(nextPath);
  console.log(`${exists ? "OK" : "MISSING"} ${nextPath}`);
  if (!exists) ok = false;
}

process.exit(ok ? 0 : 1);
