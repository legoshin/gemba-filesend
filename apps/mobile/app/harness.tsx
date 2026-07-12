import { StyleSheet, Text, View } from "react-native";

// Throwaway interop-test harness route (D-09, D-05 correction). This plan
// only scaffolds the placeholder screen; 05-04 wires it up to run the
// golden vectors (packages/crypto/src/vectors.ts) against the real
// crypto.native.ts on-device and render a PASS/FAIL result that a Maestro
// flow asserts against. No crypto runs here yet.
export default function Harness() {
  return (
    <View style={styles.container}>
      <Text style={styles.status}>Interop harness ready</Text>
      <Text style={styles.hint}>
        Golden-vector assertions land in 05-04.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  status: {
    fontSize: 20,
    fontWeight: "600",
  },
  hint: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
