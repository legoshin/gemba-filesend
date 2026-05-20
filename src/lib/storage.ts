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
}
