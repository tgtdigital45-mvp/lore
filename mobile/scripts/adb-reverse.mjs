/**
 * Runs `adb reverse tcp:8081 tcp:8081` so the Android emulator can reach Metro on the host.
 * Requires ANDROID_HOME / ANDROID_SDK_ROOT, or default Windows SDK path under LocalAppData.
 *
 * Usage: node adb-reverse.mjs [--soft]
 *   --soft  If reverse fails or device is authorizing, print help and exit 0 (does not block npm scripts).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const soft = process.argv.includes("--soft");

function findAdb() {
  const home = os.homedir();
  const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const winDefault = path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");
  const macDefault = path.join(home, "Library", "Android", "sdk");
  const linuxDefault = path.join(home, "Android", "Sdk");
  const base = envSdk || (process.platform === "win32" ? winDefault : process.platform === "darwin" ? macDefault : linuxDefault);
  const name = process.platform === "win32" ? "adb.exe" : "adb";
  return path.join(base, "platform-tools", name);
}

function analyzeDevices(adbPath) {
  let out = "";
  try {
    out = execFileSync(adbPath, ["devices"], { encoding: "utf8" });
  } catch {
    return { ok: false, reason: "adb devices failed" };
  }
  const lines = out.split(/\r?\n/).filter(Boolean).slice(1);
  let hasDevice = false;
  let hasAuthorizing = false;
  let hasUnauthorized = false;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const state = parts[parts.length - 1];
    if (state === "device") hasDevice = true;
    if (state === "authorizing") hasAuthorizing = true;
    if (state === "unauthorized") hasUnauthorized = true;
  }
  return { ok: true, hasDevice, hasAuthorizing, hasUnauthorized, raw: out };
}

function printAuthHelp() {
  console.warn(
    "[adb-reverse] ADB reports authorizing/unauthorized or no authorized device.\n" +
      "  • Unlock the phone/emulator and accept the USB debugging (RSA) prompt.\n" +
      "  • Or: Android Studio Device Manager → Cold Boot the emulator.\n" +
      "  • Or: run: adb kill-server && adb start-server\n" +
      "  • Workaround: use the exp:// LAN URL Metro prints (same Wi‑Fi) or: npm run start:tunnel"
  );
}

const adb = findAdb();
if (!existsSync(adb)) {
  console.error(`adb not found at ${adb}. Set ANDROID_HOME or install Android SDK platform-tools.`);
  process.exit(soft ? 0 : 1);
}

const dev = analyzeDevices(adb);
if (!dev.ok) {
  console.warn("[adb-reverse]", dev.reason);
  if (soft) {
    printAuthHelp();
    process.exit(0);
  }
  process.exit(1);
}

if (dev.hasAuthorizing || dev.hasUnauthorized) {
  printAuthHelp();
  if (soft) process.exit(0);
  process.exit(1);
}

if (!dev.hasDevice) {
  console.warn("[adb-reverse] No device in 'device' state. Start an emulator or connect a device.");
  if (soft) process.exit(0);
  process.exit(1);
}

try {
  execFileSync(adb, ["reverse", "tcp:8081", "tcp:8081"], { stdio: "inherit" });
  console.log("[adb-reverse] tcp:8081 → tcp:8081 ok");
} catch {
  printAuthHelp();
  if (soft) process.exit(0);
  process.exit(1);
}
