// @gemba/shared — the client-facing metadata contract (D-03), hoisted
// verbatim from apps/web/src/app/api/files/route.ts. Single-sourced so the
// web API routes and the future native uploader (Phase 6) validate against
// one predicate — a native client can never present values the server would
// not accept.
//
// StoredMeta/getStorageMode/StorageMode stay in apps/web/src/lib/storage.ts
// (server-only; StoredMeta's blobUrl field is not client-safe).

export const MAX_DOWNLOADS = 100;
export const MAX_EXPIRY_MS = 365 * 24 * 3600_000;
export const MAX_BLOB_BYTES = 15 * 1024 ** 3; // 15 GiB

export interface ClientMeta {
  name: string;
  type: string;
  size: number;
  downloadsRemaining: number;
  expiresAt: number;
}

export function validateClientMeta<T extends {
  name?: unknown;
  type?: unknown;
  size?: unknown;
  downloadsRemaining?: unknown;
  expiresAt?: unknown;
}>(obj: T): obj is T & ClientMeta {
  return (
    typeof obj.name === "string" &&
    typeof obj.type === "string" &&
    typeof obj.size === "number" &&
    obj.size > 0 &&
    obj.size <= MAX_BLOB_BYTES &&
    typeof obj.downloadsRemaining === "number" &&
    obj.downloadsRemaining >= 1 &&
    obj.downloadsRemaining <= MAX_DOWNLOADS &&
    typeof obj.expiresAt === "number" &&
    obj.expiresAt > Date.now() &&
    obj.expiresAt <= Date.now() + MAX_EXPIRY_MS
  );
}
