import { Stack } from "expo-router";

// Root layout for the expo-router route tree (D-09). Deep-link scheme
// ("gemba-filesend://") is configured in app.json; expo-router derives
// every route's deep link from this file tree automatically.
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Gemba Filesend" }} />
      <Stack.Screen name="harness" options={{ title: "Interop Harness" }} />
    </Stack>
  );
}
