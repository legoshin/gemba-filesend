import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  decryptPacked,
  encryptPackedWithIv,
  fromBase64Url,
  importKeyBase64,
  sha256Hex,
  toBase64Url,
} from "@gemba/crypto";
import {
  expectedBase64Url,
  expectedPackedBase64,
  expectedSha256Hex,
  fixedBase64UrlBytes,
  fixedIvBase64Url,
  fixedKeyBase64Url,
  fixedPassword,
  fixedPlaintextBytes,
  fixedSalt,
} from "@gemba/crypto/vectors";

// Real interop gate (CRYPTO-03, D-05 correction): this screen runs the
// SAME frozen golden vectors (packages/crypto/src/vectors.ts) that
// apps/web/src/golden-vectors.test.ts asserts against, but here against
// the REAL crypto.native.ts (react-native-quick-crypto) on-device — Metro
// resolves @gemba/crypto's internal "./crypto" import to crypto.native.ts
// in this bundle, never the mock jest-expo would use. A Maestro flow
// (apps/mobile/.maestro/interop.yaml) asserts the rendered "VECTORS PASS"
// text against this screen running inside an EAS dev-client build.

interface VectorResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function bytesEqual(a: readonly number[], b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

async function runVectors(): Promise<VectorResult[]> {
  const results: VectorResult[] = [];

  // 1. encrypt(fixedPlaintext, fixedKey, fixedIv) === expectedPackedBase64
  //    (byte-exact, not just round-trip — catches an off-by-16 auth-tag bug).
  try {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const iv = fromBase64Url(fixedIvBase64Url);
    const plaintext = new Uint8Array(fixedPlaintextBytes).buffer;
    const packed = await encryptPackedWithIv(plaintext, key, iv);
    const packedBase64 = toBase64Url(packed);
    const pass = packedBase64 === expectedPackedBase64;
    results.push({
      name: "encrypt matches frozen packed bytes",
      pass,
      detail: pass ? undefined : `got: ${packedBase64}`,
    });
  } catch (error) {
    results.push({
      name: "encrypt matches frozen packed bytes",
      pass: false,
      detail: String(error),
    });
  }

  // 2. sha256Hex(fixedPassword + fixedSalt) === expectedSha256Hex
  try {
    const hex = await sha256Hex(fixedPassword + fixedSalt);
    const pass = hex === expectedSha256Hex;
    results.push({
      name: "sha256Hex matches frozen hex",
      pass,
      detail: pass ? undefined : `got: ${hex}`,
    });
  } catch (error) {
    results.push({
      name: "sha256Hex matches frozen hex",
      pass: false,
      detail: String(error),
    });
  }

  // 3. toBase64Url(fixedBase64UrlBytes) === expectedBase64Url
  try {
    const encoded = toBase64Url(new Uint8Array(fixedBase64UrlBytes));
    const pass = encoded === expectedBase64Url;
    results.push({
      name: "toBase64Url matches frozen value",
      pass,
      detail: pass ? undefined : `got: ${encoded}`,
    });
  } catch (error) {
    results.push({
      name: "toBase64Url matches frozen value",
      pass: false,
      detail: String(error),
    });
  }

  // 4. Cross-decrypt (mandatory, D-04): native decrypts the WEB-produced
  //    expectedPackedBase64 bytes back to fixedPlaintext. This is what
  //    catches a packing bug that would still round-trip native-to-native.
  try {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const packed = fromBase64Url(expectedPackedBase64);
    const decrypted = await decryptPacked(packed.buffer, key);
    const decryptedBytes = new Uint8Array(decrypted);
    const pass = bytesEqual(fixedPlaintextBytes, decryptedBytes);
    results.push({
      name: "cross-decrypt: native decrypts web-produced bytes",
      pass,
      detail: pass ? undefined : `got: [${Array.from(decryptedBytes).join(",")}]`,
    });
  } catch (error) {
    results.push({
      name: "cross-decrypt: native decrypts web-produced bytes",
      pass: false,
      detail: String(error),
    });
  }

  return results;
}

export default function Harness() {
  const [results, setResults] = useState<VectorResult[] | null>(null);

  useEffect(() => {
    runVectors().then(setResults);
  }, []);

  if (results === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Running golden vectors…</Text>
      </View>
    );
  }

  const allPass = results.every((r) => r.pass);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.overall, allPass ? styles.pass : styles.fail]}>
        {allPass ? "VECTORS PASS" : "VECTORS FAIL"}
      </Text>
      {results.map((r) => (
        <View key={r.name} style={styles.row}>
          <Text style={r.pass ? styles.pass : styles.fail}>
            {r.pass ? "PASS" : "FAIL"} — {r.name}
          </Text>
          {r.detail ? <Text style={styles.detail}>{r.detail}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  status: {
    fontSize: 20,
    fontWeight: "600",
  },
  overall: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    alignItems: "center",
    marginBottom: 6,
  },
  detail: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: "center",
  },
  pass: {
    color: "#0a7a24",
  },
  fail: {
    color: "#b3261e",
  },
});
