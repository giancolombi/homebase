#!/usr/bin/env node
// Copy capacitor/EventKitPlugin/* into ios/App/App/Plugins/ after `cap add ios`.
// `cap add ios` regenerates the iOS project, so we keep our custom Swift
// plugin source in capacitor/ (under git) and copy it on each install.
//
// Idempotent — overwrites existing files.

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const SRC = join(root, "capacitor", "EventKitPlugin");
const DEST = join(root, "ios", "App", "App", "Plugins");

if (!existsSync(SRC)) {
  console.error(`EventKit plugin source missing: ${SRC}`);
  process.exit(1);
}
if (!existsSync(join(root, "ios"))) {
  console.error(
    "ios/ folder not found. Run `pnpm cap:add:ios` first (requires Xcode).",
  );
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

for (const file of readdirSync(SRC)) {
  copyFileSync(join(SRC, file), join(DEST, file));
  console.log(`Copied ${file} → ios/App/App/Plugins/`);
}

console.log(
  "EventKit plugin staged. Open ios/App/App.xcworkspace in Xcode and add",
  "the Plugins folder to the App target if Xcode does not pick them up",
  "automatically.",
);
