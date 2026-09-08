// Entry point (D-08). react-native-quick-crypto's install() polyfills
// global.crypto/Buffer/randomBytes BEFORE anything else in the app runs —
// crypto.native.ts (05-04) depends on these globals being installed first,
// so this call must stay the very first thing that executes.
import { install } from "react-native-quick-crypto";

install();

// Hands off to expo-router's file-based route tree (app/_layout.tsx).
import "expo-router/entry";
