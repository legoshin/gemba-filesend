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

module.exports = config;
