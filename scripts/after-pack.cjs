#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

/**
 * electron-builder skips nested directories named node_modules inside
 * extraResources unless that path is copied with an explicit from ending
 * in node_modules. Fail the build if next is still missing after pack.
 */
exports.default = async function afterPack(context) {
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");

  const nextEntry = path.join(resources, "standalone", "node_modules", "next");
  if (!fs.existsSync(nextEntry)) {
    throw new Error(
      `Packaging bug: missing ${nextEntry}. Standalone node_modules/next was not copied into Resources.`,
    );
  }
  console.log(`afterPack: verified ${nextEntry}`);
};
