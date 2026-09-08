// Metro config for the apps/mobile workspace member (RESEARCH Pattern 3).
// expo/metro-config auto-detects npm workspaces since SDK 52+, but this repo
// has apps/web sitting alongside apps/mobile in the same monorepo — being
// explicit about watchFolders/nodeModulesPaths avoids Metro accidentally
// missing (or over-watching) the workspace root, and makes the resolution
// of @gemba/crypto / @gemba/shared from packages/* deterministic.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Honor package.json "exports" maps (WR-01/WR-02 hardening). The interop gate
// (apps/mobile/app/harness.tsx) and the shared-core jest suite import the
// subpath `@gemba/crypto/vectors`, which resolves to ./src/vectors.ts ONLY via
// @gemba/crypto's "exports" map — its "main" points at ./src/index.ts. If
// Metro's package-exports resolution is off, `@gemba/crypto/vectors` would
// resolve to the nonexistent packages/crypto/vectors and fail on-device.
// Setting this explicitly makes the subpath robust regardless of whether the
// running Expo SDK / Metro version enables package exports by default.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
