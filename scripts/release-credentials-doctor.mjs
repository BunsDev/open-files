#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const REQUIRED_SHARED = ["APPLE_TEAM_ID"];
const API_KEY_FIELDS = ["APPLE_API_KEY_ID", "APPLE_API_ISSUER"];
const PASSWORD_FIELDS = ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_PROVIDER_PUBLIC_ID"];
const MANUAL_IOS_SIGNING_FIELDS = [
  "IOS_DISTRIBUTION_CERTIFICATE_P12",
  "IOS_DISTRIBUTION_CERTIFICATE_PASSWORD",
  "IOS_APP_STORE_PROVISIONING_PROFILE",
];

function has(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function missing(names) {
  return names.filter((name) => !has(name));
}

function readTauriMeta() {
  try {
    const raw = readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8");
    const config = JSON.parse(raw);
    return {
      productName: config.productName ?? "unknown",
      version: config.version ?? "unknown",
      identifier: config.identifier ?? "unknown",
    };
  } catch {
    return { productName: "unknown", version: "unknown", identifier: "unknown" };
  }
}

function apiKeyPath() {
  if (has("APPLE_API_KEY_PATH")) return process.env.APPLE_API_KEY_PATH;
  if (has("APPLE_API_KEY_ID")) {
    return join(homedir(), ".appstoreconnect", "private_keys", `AuthKey_${process.env.APPLE_API_KEY_ID}.p8`);
  }
  return null;
}

function printSingleAsk(meta, gaps) {
  console.log("\nSingle Apple release packet ask:\n");
  console.log(`App: ${meta.productName}`);
  console.log(`Bundle ID: ${meta.identifier}`);
  console.log(`Version: ${meta.version}`);
  console.log("\nPlease provide/store ONE complete Apple release packet. Do not send private key, certificate, provisioning profile, or app-specific password contents in chat.\n");
  console.log("The packet needs BOTH upload auth and iOS distribution signing.\n");

  console.log("1) Upload auth — choose A or B:");
  console.log("  A. Team App Store Connect API key, preferred for CI/TestFlight:");
  console.log("     APPLE_TEAM_ID=<Apple Developer Team ID, e.g. 9LR8Z8UQ9X>");
  console.log("     APPLE_API_KEY_ID=<App Store Connect API Key ID>");
  console.log("     APPLE_API_ISSUER=<App Store Connect API Issuer ID for that team key>");
  console.log("     APPLE_API_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8");
  console.log("     or store APPLE_API_KEY_P8 in CI/1Password and materialize it at runtime");
  console.log("  B. Apple ID app-specific password + provider public ID, local fallback:");
  console.log("     APPLE_TEAM_ID=<Apple Developer Team ID>");
  console.log("     APPLE_ID=<Apple ID email>");
  console.log("     APPLE_APP_SPECIFIC_PASSWORD=(secret app-specific password)");
  console.log("     APPLE_PROVIDER_PUBLIC_ID=<provider/team UUID from altool --list-providers>\n");

  console.log("2) iOS distribution signing — choose A, B, or C:");
  console.log("  A. Xcode automatic signing: Soul Protocol LLC Apple account added in Xcode on this Mac");
  console.log("  B. Manual signing assets:");
  console.log("     IOS_DISTRIBUTION_CERTIFICATE_P12=(base64 Apple Distribution .p12)");
  console.log("     IOS_DISTRIBUTION_CERTIFICATE_PASSWORD=(secret cert password)");
  console.log("     IOS_APP_STORE_PROVISIONING_PROFILE=(base64 App Store profile for this exact Bundle ID)");
  console.log("  C. Team App Store Connect API key that xcodebuild can use for provisioning");
  console.log("     Note: a key that only works with --api-key-subject user may upload but usually cannot create/download provisioning profiles for export.\n");

  console.log("Current gaps detected:");
  for (const gap of gaps) console.log(`  - ${gap}`);
}

const meta = readTauriMeta();
const sharedMissing = missing(REQUIRED_SHARED);
const apiMissing = missing(API_KEY_FIELDS);
const passwordMissing = missing(PASSWORD_FIELDS);
const manualSigningMissing = missing(MANUAL_IOS_SIGNING_FIELDS);
const keyPath = apiKeyPath();
const apiKeyFileReady = keyPath ? existsSync(keyPath) || has("APPLE_API_KEY_P8") : false;

const apiModeReady = sharedMissing.length === 0 && apiMissing.length === 0 && apiKeyFileReady;
const passwordModeReady = sharedMissing.length === 0 && passwordMissing.length === 0;
const uploadAuthReady = apiModeReady || passwordModeReady;

const manualSigningReady = sharedMissing.length === 0 && manualSigningMissing.length === 0;
const xcodeAccountSigningReady = has("APPLE_XCODE_ACCOUNT_READY") && process.env.APPLE_XCODE_ACCOUNT_READY !== "0";
const teamApiProvisioningReady = apiModeReady && !/user/i.test(process.env.APPLE_API_KEY_SUBJECT ?? "");
const signingReady = manualSigningReady || xcodeAccountSigningReady || teamApiProvisioningReady;

console.log("Tauri release credential doctor");
console.log(`- app: ${meta.productName}`);
console.log(`- bundle id: ${meta.identifier}`);
console.log(`- version: ${meta.version}`);
console.log(`- API key upload mode: ${apiModeReady ? "ready" : "not ready"}`);
console.log(`- password/provider upload mode: ${passwordModeReady ? "ready" : "not ready"}`);
console.log(`- manual iOS signing assets: ${manualSigningReady ? "ready" : "not ready"}`);
console.log(`- Xcode-account signing marker: ${xcodeAccountSigningReady ? "ready" : "not ready"}`);
console.log(`- team API provisioning mode: ${teamApiProvisioningReady ? "ready" : "not ready"}`);

if (uploadAuthReady && signingReady) {
  console.log("\nOK: upload auth and iOS distribution signing are both available.");
  if (apiModeReady) console.log("Upload auth: API key mode.");
  if (passwordModeReady) console.log("Upload auth: password/provider mode.");
  if (manualSigningReady) console.log("Signing: manual distribution certificate + App Store provisioning profile.");
  if (xcodeAccountSigningReady) console.log("Signing: Xcode account automatic signing marker present.");
  if (teamApiProvisioningReady) console.log("Signing: team API provisioning mode.");
  process.exit(0);
}

const gaps = [];
if (!uploadAuthReady) {
  if (sharedMissing.length) gaps.push(`missing shared field(s): ${sharedMissing.join(", ")}`);
  if (apiMissing.length || !apiKeyFileReady) {
    const apiGaps = [...apiMissing];
    if (!apiKeyFileReady) apiGaps.push("APPLE_API_KEY_PATH file or APPLE_API_KEY_P8");
    gaps.push(`upload auth API mode incomplete: ${apiGaps.join(", ")}`);
  }
  if (passwordMissing.length) gaps.push(`upload auth password/provider mode incomplete: ${passwordMissing.join(", ")}`);
}
if (!signingReady) {
  gaps.push(`iOS distribution signing incomplete: add Xcode account, or provide ${MANUAL_IOS_SIGNING_FIELDS.join(", ")}, or use a team API key that xcodebuild can provision with`);
}

printSingleAsk(meta, gaps);
process.exit(1);
