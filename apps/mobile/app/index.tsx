import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

// Minimal landing screen — this phase scaffolds the app shell only; no
// production uploader/downloader UI lands here (Phase 6/7). Links to the
// throwaway interop harness route that 05-04 wires to the golden vectors.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gemba Filesend</Text>
      <Text style={styles.subtitle}>Mobile scaffold (Phase 5)</Text>
      <Link href="/harness" style={styles.link}>
        Open interop harness
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  link: {
    marginTop: 16,
    fontSize: 16,
    color: "#2563eb",
  },
});
