// Storage-mode dispatcher: Vercel Blob in production (when token is set),
// local filesystem for development.

export type StorageMode = "blob" | "fs";

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs";
}

export interface StoredMeta {
  id: string;
  name: string;
  type: string;
  /** Plaintext size — used for display. */
  size: number;
  passwordHash?: string;
  salt?: string;
  downloadsRemaining: number;
  expiresAt: number;
  createdAt: number;
  /** Only set in blob mode — public URL of the encrypted ciphertext. */
  blobUrl?: string;
  /** Lowercased, trimmed recipient emails. Presence + non-empty length IS the
   *  "verification required" flag — do not add a separate boolean (Pitfall 5,
   *  mirrors passwordProtected: Boolean(meta.passwordHash)). */
  recipientEmails?: string[];
  /** Defaults to true — absent on legacy records that predate this field, so
   *  reads must treat `undefined` as encrypted. Only an explicit `false`
   *  marks a user-chosen "upload without encryption" fallback (no key was
   *  ever generated for these). */
  encrypted?: boolean;
}
