# Tauri iOS + macOS Release Standard

This repo uses a single release-credential intake. Do **not** ask for one missing Apple value at a time.

## Mental model

Every release has three separate gates:

1. **Build correctness** — TypeScript/Vite/Rust/Tauri build succeeds from a clean checkout.
2. **Apple trust** — the artifact is signed with the right team/certificate/profile.
3. **Release transport** — the artifact is uploaded to TestFlight/App Store Connect or distributed as a macOS artifact.

If a release is blocked, identify the gate first.

## Single release packet ask

When Apple auth/signing is missing or ambiguous, ask for one complete packet. A TestFlight release needs **both** upload auth and iOS distribution signing:

```text
Please provide/store ONE complete Apple release packet for <app>.
Do not paste private key, certificate, provisioning profile, or app-specific password contents in chat.

1) Upload auth — choose A or B:

A. Team App Store Connect API key, preferred for CI/TestFlight:
- APPLE_TEAM_ID
- APPLE_API_KEY_ID
- APPLE_API_ISSUER
- APPLE_API_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
  OR APPLE_API_KEY_P8 in 1Password/GitHub Secrets

B. Apple ID app-specific password + provider public ID, local fallback:
- APPLE_TEAM_ID
- APPLE_ID
- APPLE_APP_SPECIFIC_PASSWORD
- APPLE_PROVIDER_PUBLIC_ID

2) iOS distribution signing — choose A, B, or C:

A. Xcode automatic signing:
- Soul Protocol LLC Apple account added in Xcode on the build Mac

B. Manual signing assets:
- IOS_DISTRIBUTION_CERTIFICATE_P12
- IOS_DISTRIBUTION_CERTIFICATE_PASSWORD
- IOS_APP_STORE_PROVISIONING_PROFILE for the exact Bundle ID

C. Team App Store Connect API key that xcodebuild can use for provisioning
```

Why this matters: not every local `.p8` file has a usable App Store Connect team Issuer ID. Individual Apple keys can work for notarization or upload with `--api-key-subject user`, but still fail automatic App Store export/provisioning. For TestFlight, the archive must be signed with an Apple Distribution cert and App Store distribution provisioning profile for the exact Bundle ID.

## Local preflight

Run this before asking Val for anything:

```bash
pnpm run release:credentials:doctor
```

The doctor prints exactly one complete ask if upload auth or iOS distribution signing is not ready. It does not print secret values.

## Current app facts

- TestFlight pilot branch: `ios-testflight`
- Tauri iOS generated project: `src-tauri/gen/apple/`
- Expected IPA path after build: `src-tauri/gen/apple/build/arm64/open-files.ipa`
- Bundle ID must be resolved before upload:
  - handoff value: `dev.bunsdev.open-files`
  - current working-tree `src-tauri/tauri.conf.json` value: `io.bunsdev.open-files`
  - App Store Connect must have an app record for the exact final value

## Current real blocker

Cody's latest validation reached Apple but failed with `Invalid Provisioning Profile (90161)`: upload requires a distribution provisioning profile. That means upload auth is no longer the only gate; we need one signing unblock:

1. add the Soul Protocol LLC Apple account in Xcode and rerun automatic export, or
2. install/export an Apple Distribution cert + App Store provisioning profile for `io.bunsdev.open-files`, or
3. use a team App Store Connect API key that xcodebuild can use for provisioning. The current key appears to be individual-subject-only.

## Recommended upload strategy

Preferred CI path:

```bash
pnpm tauri ios build --export-method app-store-connect
xcrun altool --upload-app \
  --type ios \
  --file src-tauri/gen/apple/build/arm64/open-files.ipa \
  --api-key "$APPLE_API_KEY_ID" \
  --api-issuer "$APPLE_API_ISSUER"
```

Local fallback path:

```bash
xcrun altool --upload-package src-tauri/gen/apple/build/arm64/open-files.ipa \
  -u "$APPLE_ID" \
  -p "$APPLE_APP_SPECIFIC_PASSWORD" \
  --provider-public-id "$APPLE_PROVIDER_PUBLIC_ID"
```

Never commit `.p8`, `.mobileprovision`, `.p12`, exported `.ipa`, or real `.env` files.
