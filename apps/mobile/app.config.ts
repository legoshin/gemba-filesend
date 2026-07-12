import type { ConfigContext, ExpoConfig } from "expo/config";

// Dynamic config wrapper over app.json (D-08). Static fields (identifier,
// scheme, New Architecture, dev-client plugins) live in app.json; this file
// exists so future env-driven values (e.g. an API base URL per build
// profile) can be layered on without touching the static config. Nothing
// dynamic is needed yet — this plan only asserts the identifier/scheme are
// present, per app.json, unchanged.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
});
