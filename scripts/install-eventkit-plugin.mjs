#!/usr/bin/env node
// Copy every plugin under capacitor/ into ios/App/App/Plugins/ and register
// them in the App Xcode target. `cap add ios` regenerates the iOS project,
// so we keep the plugin source in capacitor/ under git and re-install it on
// every iOS scaffold.
//
// Two steps:
//   1. Copy the .swift / .m files into ios/App/App/Plugins/.
//   2. Run scripts/add-eventkit-to-xcode.rb (uses CocoaPods' bundled
//      xcodeproj gem) to add the files to the App target's Sources build
//      phase. Idempotent — re-running is a no-op once they're members.
//
// Both steps are idempotent.

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const PLUGINS_ROOT = join(root, "capacitor");
const DEST = join(root, "ios", "App", "App", "Plugins");

if (!existsSync(PLUGINS_ROOT)) {
  console.error(`Plugin source root missing: ${PLUGINS_ROOT}`);
  process.exit(1);
}
if (!existsSync(join(root, "ios"))) {
  console.error(
    "ios/ folder not found. Run `pnpm cap:add:ios` first (requires Xcode).",
  );
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

// Each subdirectory under capacitor/ is one plugin (EventKitPlugin/,
// SecureStoragePlugin/, etc.). Flatten all .swift/.m files into
// ios/App/App/Plugins/ — Xcode's source build phase doesn't care about
// subfolders, and the simple flat layout makes the project.pbxproj edits
// trivially idempotent.
for (const pluginDir of readdirSync(PLUGINS_ROOT)) {
  const dirPath = join(PLUGINS_ROOT, pluginDir);
  const stats = readdirSync(dirPath);
  for (const file of stats) {
    copyFileSync(join(dirPath, file), join(DEST, file));
    console.log(`Copied ${pluginDir}/${file} → ios/App/App/Plugins/`);
  }
}

// Add to the App Xcode target. CocoaPods bundles a Ruby + xcodeproj gem at
// /opt/homebrew/Cellar/cocoapods/<v>/libexec; we don't want to require a
// separate gem install on each developer's machine, so we shell out via the
// pod-bundled ruby.
const podBin = "/opt/homebrew/bin/pod";
const podRuby = "/opt/homebrew/opt/ruby/bin/ruby";
if (!existsSync(podBin) || !existsSync(podRuby)) {
  console.warn(
    "CocoaPods (and its bundled xcodeproj gem) not found. Install with",
    "`brew install cocoapods` and re-run, or open the workspace in Xcode",
    "and drag ios/App/App/Plugins into the App target manually.",
  );
  process.exit(0);
}

const podPrefix = "/opt/homebrew/Cellar/cocoapods";
let gemHome;
try {
  const versions = readdirSync(podPrefix);
  gemHome = join(podPrefix, versions[0], "libexec");
} catch {
  console.warn(
    "Could not locate CocoaPods gem home — skipping Xcode target wiring.",
    "Open the workspace and drag ios/App/App/Plugins into the App target.",
  );
  process.exit(0);
}

const result = spawnSync(podRuby, [join(here, "add-eventkit-to-xcode.rb")], {
  stdio: "inherit",
  env: { ...process.env, GEM_HOME: gemHome },
});
process.exit(result.status ?? 0);
