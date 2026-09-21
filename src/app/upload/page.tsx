"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Chip } from "@/components/chip";
import { Icon } from "@/components/icon";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/file-dropzone";
import { toast } from "sonner";
import { useEmbed } from "@/components/embed-provider";
import {
  EncryptionError,
  encryptPacked,
  exportKeyBase64,
  generateKey,
  readFileWithProgress,
} from "@/lib/crypto";
import { RecipientChipInput } from "@/components/upload/recipient-chip-input";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import { PageEntrance, PageEntranceItem } from "@/components/page-entrance";
import { ScrollProgress } from "@/components/scroll-progress";

type UploadState = "idle" | "preparing" | "uploading" | "done";
type ExpiryUnit = "hours" | "days" | "months";
type StorageMode = "blob" | "fs";

const EXPIRY_UNIT_MS: Record<ExpiryUnit, number> = {
  hours: 3600_000,
  days: 24 * 3600_000,
  months: 30 * 24 * 3600_000,
};

/** Resolution of the "encryption failed" prompt shown to the user. */
type EncryptionFallbackChoice = "retry" | "unencrypted" | "cancel";

/** One selected file's display metadata in the finished share. */
interface ShareFile {
  name: string;
  size: number;
}

// Extracted so `useMotionPreset` is called once per row instance rather than
// inside `result.files.map(...)` — calling a hook inside a loop with a
// variable iteration count violates the Rules of Hooks (RESEARCH Pitfall 4).
function ShareResultRow({ file }: { file: ShareFile }) {
  const rowMotion = useMotionPreset(variants.stagger, transitions.snappy);
  return (
    <motion.div layout {...rowMotion} className="flex items-center gap-2">
      <Icon name="File01" size={16} className="shrink-0 text-[var(--icon-subdued)]" />
      <span className="gemba-body-strong truncate">{file.name}</span>
      <span className="gemba-body-sm ml-auto shrink-0 text-[var(--text-subdued)]">
        {formatSize(file.size)}
      </span>
    </motion.div>
  );
}

/**
 * The single result of an upload: N files collapse to ONE share link (MFL-01).
 * The AES key lives only in `shareLink`'s `#` fragment — never in this object's
 * transport to the server.
 */
interface ShareResult {
  shareLink: string;
  encrypted: boolean;
  files: ShareFile[];
}

/**
 * Uploads one already-prepared (encrypted-or-raw) part of a multi-file share in
 * fs mode (MFL-03). Streams the bytes to `POST /api/files` with x-file-id +
 * x-file-index headers so the route lands it at `{id}/{index}.bin` WITHOUT
 * writing meta or seeding a counter — `/api/files/finalize` owns the single
 * meta write + seed for the whole share.
 */
function uploadPart(
  id: string,
  index: number,
  total: number,
  body: Blob,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");
    xhr.setRequestHeader("x-file-id", id);
    xhr.setRequestHeader("x-file-index", String(index));
    xhr.setRequestHeader("x-file-total", String(total));
    xhr.setRequestHeader("content-type", "application/octet-stream");

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(`HTTP ${xhr.status} ${xhr.responseText || ""}`.trim()),
        );
      }
    };
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.onabort = () => reject(new Error("upload aborted"));

    xhr.send(body);
  });
}

function generateClientId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Reads one file off disk and, unless `encrypt` is false, encrypts it under the
 * SHARED share key with its own random per-file IV via `encryptPacked` (wire
 * format unchanged). Returns the part Blob ready to upload.
 *
 * Each file is processed end-to-end before the next starts, so peak memory
 * stays at roughly 3× the single largest file (raw bytes + ciphertext +
 * packed output) rather than 3× the combined total of all selected files.
 * That's what keeps multi-file uploads from blowing past the browser's
 * TypedArray limit ("array allocation failed").
 *
 * Progress is real, not synthetic: it reports actual bytes read off disk (the
 * dominant, measurable cost for large files — the subsequent
 * `crypto.subtle.encrypt` call has no progress API of its own).
 *
 * If the read+encrypt step fails, throws `EncryptionError` so the caller can
 * offer an explicit, user-chosen unencrypted-upload fallback (never a silent
 * downgrade).
 */
async function prepareFilePart(opts: {
  file: File;
  encrypt: boolean;
  key: CryptoKey;
  onProgress: (percent: number) => void;
}): Promise<Blob> {
  const { file, encrypt, key, onProgress } = opts;

  if (!encrypt) {
    onProgress(100);
    return file;
  }

  try {
    const data = await readFileWithProgress(file, (loaded, total) => {
      onProgress(total > 0 ? (loaded / total) * 100 : 100);
    });
    // Reuse the ONE share key; encryptPacked draws a fresh 12-byte IV per call
    // so every file gets a unique IV under the same key (GCM-safe).
    const encrypted = await encryptPacked(data, key);
    return new Blob([encrypted], { type: "application/octet-stream" });
  } catch (err) {
    throw new EncryptionError(
      err instanceof Error ? err.message : "Encryption failed",
    );
  }
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [useVerify, setUseVerify] = useState(false);
  const [useNotify, setUseNotify] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [downloadLimit, setDownloadLimit] = useState("1");
  const [expiryValue, setExpiryValue] = useState("1");
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>("days");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<ShareResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const [encryptionFailure, setEncryptionFailure] = useState<{
    fileName: string;
    message: string;
  } | null>(null);
  const encryptionFallbackResolver = useRef<
    ((choice: EncryptionFallbackChoice) => void) | null
  >(null);
  const { isEmbed } = useEmbed();

  /**
   * Pauses the upload loop and shows the "encryption failed" dialog. Resolves
   * once the user makes an explicit choice — retry, upload unencrypted, or
   * cancel. Never resolves on its own (no silent downgrade).
   */
  const promptEncryptionFallback = (
    fileName: string,
    message: string,
  ): Promise<EncryptionFallbackChoice> => {
    return new Promise((resolve) => {
      encryptionFallbackResolver.current = resolve;
      setEncryptionFailure({ fileName, message });
    });
  };

  const resolveEncryptionFallback = (choice: EncryptionFallbackChoice) => {
    setEncryptionFailure(null);
    encryptionFallbackResolver.current?.(choice);
    encryptionFallbackResolver.current = null;
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/storage-mode");
        if (!res.ok) return;
        const data = (await res.json()) as { mode: StorageMode };
        setStorageMode(data.mode);
      } catch {
        setStorageMode("fs");
      }
    })();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (usePassword && password.length === 0) {
      toast.error("Enter a password or disable password protection");
      return;
    }
    if ((useVerify || useNotify) && recipientEmails.length === 0) {
      toast.error(
        "Add at least one recipient email or turn off recipient verification and notification",
      );
      return;
    }
    if (!storageMode) {
      toast.error("Still initialising — please try again in a moment");
      return;
    }

    const downloadsRemaining = Math.max(
      1,
      Math.min(100, Number(downloadLimit) || 1),
    );
    const expiresAt =
      Date.now() +
      Math.max(1, Number(expiryValue) || 1) * EXPIRY_UNIT_MS[expiryUnit];

    setUploadState("preparing");
    setResult(null);
    setCurrentFileIndex(0);
    setUploadProgress(0);

    try {
      // ONE share id + ONE key for the whole selection (MFL-01/MFL-02). The
      // key is exported once and only ever appears in the link fragment — it is
      // never placed in a part-upload, finalize, or notify body.
      const id = generateClientId();
      const key = await generateKey();
      const keyB64 = await exportKeyBase64(key);

      // Whole-share encryption flag. An encryption-failure fallback of
      // "unencrypted" downgrades the ENTIRE share (single key/single flag), so
      // we restart the part loop with encryption off rather than mixing
      // encrypted and plaintext files under one share.
      let encryptShare = true;
      const blobUrls: string[] = [];
      let uploaded = false;

      while (!uploaded) {
        blobUrls.length = 0;
        let restartUnencrypted = false;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setCurrentFileIndex(i);
          setCurrentFileName(file.name);

          let part: Blob | null = null;
          while (part === null) {
            setUploadState("preparing");
            setProgressLabel(`Encrypting "${file.name}"…`);
            setUploadProgress(0);

            try {
              part = await prepareFilePart({
                file,
                encrypt: encryptShare,
                key,
                onProgress: (pct) => {
                  setUploadState("preparing");
                  setProgressLabel(`Encrypting "${file.name}"…`);
                  setUploadProgress(pct);
                },
              });
            } catch (err) {
              if (!(err instanceof EncryptionError)) throw err;

              const choice = await promptEncryptionFallback(
                file.name,
                err.message,
              );
              if (choice === "retry") continue;
              if (choice === "unencrypted") {
                // Downgrade the whole share and restart the part loop.
                encryptShare = false;
                restartUnencrypted = true;
                break;
              }
              throw err; // cancel — bubble to the outer catch below
            }
          }
          if (restartUnencrypted) break;

          const partBlob = part as Blob;
          setUploadState("uploading");
          setProgressLabel(`Uploading "${file.name}"…`);
          setUploadProgress(0);

          if (storageMode === "blob") {
            // Finalize-owned part: token carries only id/index/total/size; the
            // shared meta (password/expiry/recipients) goes to finalize. No key.
            const clientPayload = JSON.stringify({
              finalize: true,
              id,
              index: i,
              total: files.length,
              size: partBlob.size,
            });
            const res = await upload(`gemba/blob/${id}/${i}`, partBlob, {
              access: "private",
              handleUploadUrl: "/api/files",
              clientPayload,
              contentType: "application/octet-stream",
              multipart: true,
              onUploadProgress: (e) => {
                setUploadProgress(e.percentage);
              },
            });
            blobUrls[i] = res.url;
          } else {
            await uploadPart(id, i, files.length, partBlob, (loaded, total) => {
              if (total > 0) setUploadProgress((loaded / total) * 100);
            });
          }
        }

        if (restartUnencrypted) continue;
        uploaded = true;
      }

      // Finalize the share exactly once — one meta, one counter (MFL-03).
      // The key is deliberately absent from this body (T-07-06).
      setUploadState("preparing");
      setProgressLabel("Finalizing…");
      setUploadProgress(100);

      const finalizeFiles = files.map((f, i) => ({
        name: f.name,
        type: f.type || "application/octet-stream",
        size: f.size,
        ...(storageMode === "blob" ? { blobUrl: blobUrls[i] } : {}),
      }));
      const finalizeRes = await fetch("/api/files/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          files: finalizeFiles,
          password: usePassword ? password : undefined,
          downloadsRemaining,
          expiresAt,
          recipientEmails:
            useVerify && recipientEmails.length > 0
              ? recipientEmails
              : undefined,
          encrypted: encryptShare ? undefined : false,
        }),
      });
      if (!finalizeRes.ok) {
        throw new Error(
          `finalize failed: HTTP ${finalizeRes.status} ${
            (await finalizeRes.text()) || ""
          }`.trim(),
        );
      }

      // ONE link for the whole share. Key only ever after `#`.
      const params = new URLSearchParams({ id });
      if (usePassword) params.set("pw", "1");
      let shareLink = `${window.location.origin}/download?${params}`;
      if (encryptShare) shareLink += `#${keyB64}`;

      const shareResult: ShareResult = {
        shareLink,
        encrypted: encryptShare,
        files: files.map((f) => ({ name: f.name, size: f.size })),
      };
      setResult(shareResult);
      setUploadState("done");
      setUploadProgress(100);
      toast.success(
        files.length > 1 ? `${files.length} files uploaded` : "File uploaded",
      );

      // Isolated try/catch: a notify failure must NEVER roll back the upload
      // result (D-06-04). ONE link for the whole share (T-07-07) — never a key.
      if (useNotify && recipientEmails.length > 0) {
        try {
          const shareLabel =
            shareResult.files.length === 1
              ? shareResult.files[0].name
              : `${shareResult.files.length} files`;
          const links = [{ fileName: shareLabel, url: shareResult.shareLink }];
          const res = await fetch("/api/notify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ recipients: recipientEmails, links }),
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
        } catch (err) {
          toast.error(
            "Couldn't email recipients: " +
              (err instanceof Error ? err.message : "Unknown error"),
          );
        }
      }
    } catch (err) {
      setUploadState("idle");
      setUploadProgress(0);
      setProgressLabel("");
      toast.error(
        "Upload failed: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  /**
   * Writes `text` to the clipboard. Uses the async Clipboard API when
   * available (HTTPS / localhost), falls back to a hidden <textarea> +
   * document.execCommand("copy") for older browsers and insecure contexts.
   * Returns true on success.
   */
  const writeClipboard = async (text: string): Promise<boolean> => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to legacy path
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopy = async (link: string) => {
    const ok = await writeClipboard(link);
    if (!ok) {
      toast.error("Couldn't access the clipboard — copy the link manually");
      return;
    }
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setUploadState("idle");
    setCurrentFileIndex(0);
    setCurrentFileName("");
    setUploadProgress(0);
    setProgressLabel("");
    setResult(null);
    setPassword("");
    setUsePassword(false);
    setUseVerify(false);
    setUseNotify(false);
    setRecipientEmails([]);
    setDownloadLimit("1");
    setExpiryValue("1");
    setExpiryUnit("days");
  };

  const isBusy = uploadState === "preparing" || uploadState === "uploading";

  return (
    <PageEntrance className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <ScrollProgress />
      {!isEmbed && (
        <div className="mb-8 text-center">
          <h1 className="gemba-h2">Upload Files</h1>
          <p className="mt-2 text-muted-foreground">
            Select files to encrypt and share securely.
          </p>
        </div>
      )}

      {uploadState === "done" && result ? (
        <PageEntranceItem>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)]">
              <Icon name="Check" size={20} className="text-[var(--gemba-success)]" />
            </div>
            <CardTitle>Upload Complete</CardTitle>
            <CardDescription>
              {result.encrypted
                ? result.files.length === 1
                  ? "Your file is encrypted and ready to share."
                  : "Your files are encrypted and ready to share on one link."
                : result.files.length === 1
                  ? "Your file is ready to share."
                  : "Your files are ready to share on one link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {result.files.map((f) => (
                  <ShareResultRow key={f.name} file={f} />
                ))}
              </AnimatePresence>
            </div>

            {!result.encrypted && (
              <Chip variant="warning" icon={<Icon name="AlertCircle" size={16} />}>
                NOT ENCRYPTED
              </Chip>
            )}

            <div className="flex gap-2">
              <Input
                value={result.shareLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label="Copy link"
                onClick={() => handleCopy(result.shareLink)}
                className="shrink-0"
              >
                {copied ? (
                  <Icon name="Check" size={16} />
                ) : (
                  <Icon name="Copy01" size={16} />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {usePassword && (
                <Chip variant="neutral" icon={<Icon name="Lock01" size={16} />}>
                  PASSWORD PROTECTED
                </Chip>
              )}
              <Chip variant="neutral" icon={<Icon name="Download01" size={16} />}>
                {downloadLimit} DOWNLOAD{Number(downloadLimit) !== 1 ? "S" : ""}
              </Chip>
              <Chip variant="neutral" icon={<Icon name="Clock" size={16} />}>
                EXPIRES IN {expiryValue}{" "}
                {(Number(expiryValue) === 1
                  ? expiryUnit.slice(0, -1)
                  : expiryUnit
                ).toUpperCase()}
              </Chip>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleReset}>
                Upload More
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => handleCopy(result.shareLink)}
              >
                <Icon name="Link02" size={20} />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
        </PageEntranceItem>
      ) : (
        <div className="space-y-6">
          <PageEntranceItem>
          <Card>
            <CardHeader>
              <CardTitle className="gemba-h4">Select Files</CardTitle>
              <CardDescription>
                Files are encrypted in your browser before uploading.
                When you select multiple files, they share one download link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone files={files} onFilesChange={setFiles} />
            </CardContent>
          </Card>
          </PageEntranceItem>

          <PageEntranceItem>
          <Card>
            <CardHeader>
              <CardTitle className="gemba-h4">Options</CardTitle>
              <CardDescription>
                Configure security and sharing settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password-toggle" className="flex items-center gap-2">
                    <Icon name="Lock01" size={16} className="text-[var(--text-subdued)]" />
                    Password Protection
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Require a password to download
                  </p>
                </div>
                <Switch
                  id="password-toggle"
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>

              {usePassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notify-toggle" className="flex items-center gap-2">
                    <Icon name="Send01" size={16} className="text-[var(--text-subdued)]" />
                    Notify Recipient
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email recipients the download link when the upload finishes
                  </p>
                </div>
                <Switch
                  id="notify-toggle"
                  checked={useNotify}
                  onCheckedChange={(checked) => {
                    setUseNotify(checked);
                    // Turning Notify ON auto-enables Verify (D-06-05); Verify
                    // stays independently switchable and turning Notify OFF
                    // leaves Verify at its last value.
                    if (checked) setUseVerify(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="verify-toggle" className="flex items-center gap-2">
                    <Icon name="Mail01" size={16} className="text-[var(--text-subdued)]" />
                    Verify Recipient
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email a one-time code recipients must enter before download
                  </p>
                </div>
                <Switch
                  id="verify-toggle"
                  checked={useVerify}
                  onCheckedChange={setUseVerify}
                />
              </div>

              {(useNotify || useVerify) && (
                <div className="space-y-2">
                  <Label htmlFor="recipient-emails">Recipient email(s)</Label>
                  <RecipientChipInput
                    id="recipient-emails"
                    value={recipientEmails}
                    onChange={setRecipientEmails}
                    placeholder="alice@example.com, bob@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Up to 10 addresses. Press Enter or comma to add each one.
                    This list is used for both notification and verification.
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="download-limit" className="flex items-center gap-2">
                    <Icon name="Download01" size={16} className="text-[var(--text-subdued)]" />
                    Download Limit
                  </Label>
                  <Input
                    id="download-limit"
                    type="number"
                    min="1"
                    max="100"
                    value={downloadLimit}
                    onChange={(e) => setDownloadLimit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="flex items-center gap-2">
                    <Icon name="Clock" size={16} className="text-[var(--text-subdued)]" />
                    Expires After
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="expiry"
                      type="number"
                      min="1"
                      value={expiryValue}
                      onChange={(e) => setExpiryValue(e.target.value)}
                      className="flex-1"
                    />
                    <select
                      aria-label="Expiry unit"
                      value={expiryUnit}
                      onChange={(e) =>
                        setExpiryUnit(e.target.value as ExpiryUnit)
                      }
                      className="h-10 rounded-[var(--radius-sm)] bg-[var(--surface-card)] px-4 text-base shadow-[var(--ring-border),var(--shadow-field)] outline-none transition-[color,box-shadow] focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </PageEntranceItem>

          {isBusy && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="gemba-body-strong truncate">
                      {progressLabel}
                    </span>
                    <span className="gemba-body-sm shrink-0 text-[var(--text-subdued)]">
                      {`${Math.min(Math.round(uploadProgress), 100)}%`}
                    </span>
                  </div>
                  {files.length > 1 && (
                    <p className="gemba-body-sm text-[var(--text-subdued)]">
                      File {currentFileIndex + 1} of {files.length}
                      {currentFileName ? ` — ${currentFileName}` : ""}
                    </p>
                  )}
                  <Progress value={Math.min(uploadProgress, 100)} />
                </div>
              </CardContent>
            </Card>
          )}

          <PageEntranceItem>
          <Button
            size="default"
            className="w-full"
            disabled={files.length === 0 || isBusy || !storageMode}
            onClick={handleUpload}
          >
            <Icon name="Upload01" size={20} />
            {uploadState === "preparing"
              ? "Preparing…"
              : uploadState === "uploading"
                ? "Uploading…"
                : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}`}
          </Button>
          </PageEntranceItem>
        </div>
      )}

      <Dialog open={encryptionFailure !== null}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon
                name="AlertCircle"
                size={20}
                className="text-[var(--gemba-critical)]"
              />
              Encryption failed
            </DialogTitle>
            <DialogDescription>
              {`Couldn't encrypt "${encryptionFailure?.fileName}": ${encryptionFailure?.message}. `}
              You can retry, or upload this file without encryption —
              anyone with the link will be able to read it, since there
              will be no encryption key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => resolveEncryptionFallback("cancel")}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => resolveEncryptionFallback("retry")}
            >
              Retry Encryption
            </Button>
            <Button
              variant="destructive"
              onClick={() => resolveEncryptionFallback("unencrypted")}
            >
              Upload Unencrypted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageEntrance>
  );
}
