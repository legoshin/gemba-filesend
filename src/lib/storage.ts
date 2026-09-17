// Storage-mode dispatcher: Vercel Blob in production (when token is set),
// local filesystem for development.

export type StorageMode = "blob" | "fs";

export function getStorageMode(): StorageMode {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs";
}

/**
 * One file inside a multi-file share (Phase 7, MFL-03). Every entry is
 * decryptable by the SAME single share key (each with its own per-file IV via
 * the unchanged encryptPacked wire format). `blobUrl` is only set in blob mode
 * — the public URL of that file's encrypted ciphertext.
 */
export interface StoredFileEntry {
  name: string;
  type: string;
  /** Plaintext size — used for display. */
  size: number;
  /** Only set in blob mode — public URL of the encrypted ciphertext. */
  blobUrl?: string;
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
  /** Multi-file share (MFL-03): ordered list of every file under this one id
   *  and one key. OPTIONAL and additive — absent on legacy single-file records,
   *  which resolveFiles() reads from the top-level name/type/size/blobUrl. The
   *  top-level fields are kept in sync with files[0] for legacy-reader
   *  compatibility. */
  files?: StoredFileEntry[];
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

/**
 * The single read path for both legacy single-file and new multi-file shares
 * (MFL-05). Returns `meta.files` when it is a non-empty array; otherwise
 * returns a one-element array built from the legacy top-level
 * name/type/size/blobUrl. Pure and node-free so both browser and server import
 * it.
 */
export function resolveFiles(meta: StoredMeta): StoredFileEntry[] {
  if (Array.isArray(meta.files) && meta.files.length > 0) {
    return meta.files;
  }
  return [
    {
      name: meta.name,
      type: meta.type,
      size: meta.size,
      ...(meta.blobUrl !== undefined ? { blobUrl: meta.blobUrl } : {}),
    },
  ];
}
