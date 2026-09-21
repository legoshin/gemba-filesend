"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icon";
import { Chip } from "@/components/chip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { decryptPacked, importKeyBase64 } from "@/lib/crypto";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import { PageEntrance, PageEntranceItem } from "@/components/page-entrance";
import { ScrollProgress } from "@/components/scroll-progress";

type DownloadState =
  | "input"
  | "preview"
  | "downloading"
  | "done"
  | "invalid-link"
  | "file-not-found"
  | "expired";

interface FileInfo {
  id: string;
  name: string;
  type: string;
  sizeBytes: number;
  size: string;
  downloadsRemaining: number;
  expiresIn: string;
  passwordProtected: boolean;
  verifyRequired: boolean;
  /** False only for files the uploader explicitly chose to send unencrypted
   *  after an encryption failure (the "upload unencrypted" fallback). */
  encrypted: boolean;
  keyBase64: string;
  /** Every file in the share; length 1 for a legacy single-file share. One
   *  shared key (keyBase64) decrypts them all. */
  files: Array<{ name: string; type: string; sizeBytes: number; size: string }>;
  /** Set when the share can no longer be downloaded — the file list is shown
   *  read-only with disabled download controls. */
  unavailable?: "expired" | "exhausted";
}

/** Result of downloading one file: null on success, else a classified error. */
type DownloadFailure = { kind: "password" | "verify" | "other"; message: string };

// Extracted so `useMotionPreset` is called once per row instance rather than
// inside `fileInfo.files.map(...)` — calling a hook inside a loop with a
// variable iteration count violates the Rules of Hooks (RESEARCH Pitfall 4).
function DownloadFileRow({
  file,
  index,
  showDownloadButton,
  disabled,
  onDownload,
}: {
  file: FileInfo["files"][number];
  index: number;
  showDownloadButton: boolean;
  disabled: boolean;
  onDownload: (index: number) => void;
}) {
  const rowMotion = useMotionPreset(variants.stagger, transitions.snappy);
  return (
    <motion.div
      layout
      {...rowMotion}
      className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--surface-card)] p-4 shadow-[var(--ring-border)]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
        <Icon name="File01" size={24} className="text-[var(--icon-subdued)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="gemba-body-strong truncate">{file.name}</p>
        <p className="gemba-body-sm text-[var(--text-subdued)]">
          {file.size} &middot; {file.type}
        </p>
      </div>
      {showDownloadButton && (
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 gap-1"
          disabled={disabled}
          onClick={() => onDownload(index)}
        >
          <Icon name="Download01" size={16} />
          Download
        </Button>
      )}
    </motion.div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isMetaPayload(obj: unknown): obj is {
  name: string;
  type: string;
  size: number;
  passwordProtected: boolean;
  verifyRequired: boolean;
  downloadsRemaining: number;
  expiresAt: number;
  encrypted: boolean;
  files?: Array<{ name: string; type: string; size: number }>;
} {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  const baseOk =
    typeof o.name === "string" &&
    typeof o.type === "string" &&
    typeof o.size === "number" &&
    typeof o.passwordProtected === "boolean" &&
    typeof o.verifyRequired === "boolean" &&
    typeof o.downloadsRemaining === "number" &&
    typeof o.expiresAt === "number" &&
    typeof o.encrypted === "boolean";
  if (!baseOk) return false;
  // files[] is OPTIONAL — a legacy single-file meta (no files array) still
  // passes. When present, every entry must carry name/type/size.
  if (o.files !== undefined) {
    if (!Array.isArray(o.files)) return false;
    const allValid = o.files.every((f) => {
      if (typeof f !== "object" || f === null) return false;
      const e = f as Record<string, unknown>;
      return (
        typeof e.name === "string" &&
        typeof e.type === "string" &&
        typeof e.size === "number"
      );
    });
    if (!allValid) return false;
  }
  return true;
}

function formatExpiresIn(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const hours = ms / 3600_000;
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (hours < 48) {
    const h = Math.round(hours);
    return `${h} hour${h !== 1 ? "s" : ""}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export default function DownloadPage() {
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<DownloadState>("input");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Downloading…");
  const [currentName, setCurrentName] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyStep, setVerifyStep] = useState<
    "idle" | "code-sent" | "verified"
  >("idle");
  const [hasVerifyCodeError, setHasVerifyCodeError] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const fetchFileInfo = useCallback(async (shareLink: string) => {
    let id = "";
    let keyBase64 = "";
    try {
      const url = new URL(shareLink);
      id = url.searchParams.get("id") ?? "";
      keyBase64 = url.hash.replace(/^#/, "");
    } catch {
      setState("invalid-link");
      return;
    }
    if (!id) {
      setState("invalid-link");
      return;
    }
    // Note: keyBase64 may legitimately be empty — files uploaded via the
    // explicit "upload unencrypted" fallback have no key. Whether one is
    // required is decided below, once the server reports `encrypted`.

    let res: Response;
    try {
      res = await fetch(`/api/files/${encodeURIComponent(id)}/meta`);
    } catch {
      toast.error("Network error fetching file info");
      return;
    }

    if (!res.ok) {
      if (res.status === 404) {
        setState("file-not-found");
        return;
      }
      if (res.status === 410) {
        // Expired/exhausted: if the body carries the file list, show it
        // read-only with disabled controls; otherwise fall back to the screen.
        const body = (await res.json().catch(() => null)) as {
          reason?: string;
          files?: Array<{ name: string; type: string; size: number }>;
          encrypted?: boolean;
        } | null;
        if (body && Array.isArray(body.files) && body.files.length > 0) {
          const files = body.files.map((f) => ({
            name: f.name,
            type: f.type,
            sizeBytes: f.size,
            size: formatSize(f.size),
          }));
          setFileInfo({
            id,
            name: files[0].name,
            type: files[0].type,
            sizeBytes: files[0].sizeBytes,
            size: files[0].size,
            downloadsRemaining: 0,
            expiresIn: body.reason === "exhausted" ? "no downloads left" : "expired",
            passwordProtected: false,
            verifyRequired: false,
            encrypted: body.encrypted !== false,
            keyBase64,
            files,
            unavailable: body.reason === "exhausted" ? "exhausted" : "expired",
          });
          setState("preview");
          return;
        }
        setState("expired");
        return;
      }
      toast.error(`Failed to fetch file info (HTTP ${res.status})`);
      return;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      toast.error("Received an invalid response from the server");
      return;
    }

    if (!isMetaPayload(data)) {
      toast.error("Received an invalid response from the server");
      setState("invalid-link");
      return;
    }

    if (data.encrypted && !keyBase64) {
      setState("invalid-link");
      return;
    }

    // Multi-file share → one row per file; legacy meta (no files[]) → a single
    // row derived from the top-level fields. One shared key decrypts them all.
    const rawFiles =
      data.files && data.files.length > 0
        ? data.files
        : [{ name: data.name, type: data.type, size: data.size }];
    const files = rawFiles.map((f) => ({
      name: f.name,
      type: f.type,
      sizeBytes: f.size,
      size: formatSize(f.size),
    }));

    setFileInfo({
      id,
      name: files[0].name,
      type: files[0].type,
      sizeBytes: files[0].sizeBytes,
      size: files[0].size,
      downloadsRemaining: data.downloadsRemaining,
      expiresIn: formatExpiresIn(data.expiresAt),
      passwordProtected: data.passwordProtected,
      verifyRequired: data.verifyRequired,
      encrypted: data.encrypted,
      keyBase64,
      files,
    });
    setState("preview");
  }, []);

  const handleFetchInfo = () => {
    if (!link.trim() || isFetchingInfo) return;
    setIsFetchingInfo(true);
    void fetchFileInfo(link).finally(() => setIsFetchingInfo(false));
  };

  const handleRequestCode = async () => {
    if (!fileInfo || !verifyEmail.trim() || verifyBusy) return;
    setVerifyBusy(true);
    try {
      const res = await fetch(
        `/api/files/${encodeURIComponent(fileInfo.id)}/request-code`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: verifyEmail.trim() }),
        },
      );
      if (!res.ok) {
        toast.error("Couldn't send a verification code — try again");
        return;
      }
      setVerifyStep("code-sent");
      toast.success("If that address is on the list, a code is on its way");
    } catch {
      toast.error("Network error requesting a verification code");
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!fileInfo || verifyCode.length !== 6 || verifyBusy) return;
    setVerifyBusy(true);
    setHasVerifyCodeError(false);
    try {
      const res = await fetch(
        `/api/files/${encodeURIComponent(fileInfo.id)}/verify-code`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: verifyCode }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        verified?: boolean;
        token?: string;
      } | null;
      if (res.ok && data?.verified && data.token) {
        setVerifyToken(data.token);
        setVerifyStep("verified");
        return;
      }
      setHasVerifyCodeError(true);
    } catch {
      toast.error("Network error verifying the code");
    } finally {
      setVerifyBusy(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("id")) {
      const currentUrl = window.location.href;
      setLink(currentUrl);
      void fetchFileInfo(currentUrl);
    }
  }, [fetchFileInfo]);

  // Downloads + decrypts ONE file of the share (by index) with the single
  // shared key. Returns null on success, or a classified failure. Every fetch
  // decrements the shared counter server-side (no client "consume" flag), so
  // fetching all N files == one whole-share download (counter seeded × N).
  const downloadOne = async (
    index: number,
    file: { name: string; type: string; sizeBytes: number },
  ): Promise<DownloadFailure | null> => {
    if (!fileInfo) return { kind: "other", message: "No file info" };
    setProgress(0);
    setProgressLabel(`Downloading ${file.name}…`);
    setCurrentName(file.name);
    try {
      const headers: Record<string, string> = {};
      if (fileInfo.passwordProtected) headers["x-password"] = password;
      if (fileInfo.verifyRequired) headers["x-verify-token"] = verifyToken;

      // Step 1: ask our API for a presigned download URL for this file index.
      // The function enforces verify + password + counter checks and returns
      // { url } pointing at the Blob CDN. Errors come back as non-2xx.
      const authRes = await fetch(
        `/api/files/${encodeURIComponent(fileInfo.id)}?index=${index}`,
        { headers },
      );

      if (!authRes.ok) {
        const text = await authRes.text().catch(() => "");
        if (authRes.status === 401 || authRes.status === 403) {
          // Verification gate runs before the password gate server-side; its
          // body says "verification" — distinguish so the right inline error
          // fires instead of a misleading "incorrect password".
          if (fileInfo.verifyRequired && /verif/i.test(text)) {
            return { kind: "verify", message: "Verification required or expired" };
          }
          return { kind: "password", message: "Incorrect password" };
        }
        if (authRes.status === 404) return { kind: "other", message: "File not found" };
        if (authRes.status === 410) {
          return { kind: "other", message: "File expired or exhausted" };
        }
        return { kind: "other", message: text || `HTTP ${authRes.status}` };
      }

      const auth = (await authRes.json()) as { url?: string };
      if (!auth.url) {
        return { kind: "other", message: "Server did not return a download URL" };
      }

      // Step 2: fetch the encrypted bytes directly from the Blob CDN.
      const res = await fetch(auth.url);
      if (!res.ok) {
        return {
          kind: "other",
          message: `Blob CDN returned HTTP ${res.status}. The presigned URL may have expired — try again.`,
        };
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("octet-stream")) {
        const text = await res.text().catch(() => "");
        return { kind: "other", message: text || `Unexpected response (${contentType})` };
      }

      const total =
        Number(res.headers.get("content-length")) || file.sizeBytes || 0;
      if (!res.body) return { kind: "other", message: "Empty response body" };

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (total > 0) setProgress((received / total) * 100);
        }
      }

      const downloadedBytes = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        downloadedBytes.set(c, offset);
        offset += c.byteLength;
      }

      let fileBytes: Uint8Array<ArrayBuffer>;
      if (fileInfo.encrypted) {
        // AES-GCM payload is at minimum IV (12) + tag (16) = 28 bytes.
        if (downloadedBytes.byteLength < 28) {
          const preview = new TextDecoder("utf-8", { fatal: false }).decode(
            downloadedBytes,
          );
          return {
            kind: "other",
            message: `Server returned only ${downloadedBytes.byteLength} bytes${preview ? `: "${preview}"` : ""}. The file may have expired, been exhausted, or the link is invalid.`,
          };
        }
        if (total > 0 && downloadedBytes.byteLength < total) {
          return {
            kind: "other",
            message: `Download truncated: received ${downloadedBytes.byteLength} of ${total} bytes. Try again.`,
          };
        }

        setProgressLabel(`Decrypting ${file.name}…`);
        setProgress(100);

        // ONE shared key decrypts every file in the share.
        const key = await importKeyBase64(fileInfo.keyBase64);
        fileBytes = new Uint8Array(
          await decryptPacked(downloadedBytes.buffer, key),
        );
      } else {
        if (total > 0 && downloadedBytes.byteLength < total) {
          return {
            kind: "other",
            message: `Download truncated: received ${downloadedBytes.byteLength} of ${total} bytes. Try again.`,
          };
        }
        setProgress(100);
        fileBytes = downloadedBytes;
      }

      const blob = new Blob([fileBytes], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return null;
    } catch (err) {
      return {
        kind: "other",
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };

  // Gate once for the whole share, then download the given file indices
  // sequentially. Downloading every index is "one whole-share download".
  const startDownload = async (indices: number[]) => {
    if (!fileInfo) return;
    if (fileInfo.passwordProtected && !password) {
      toast.error("Please enter the password to download");
      return;
    }
    if (fileInfo.verifyRequired && !verifyToken) {
      toast.error("Please verify your email to download");
      return;
    }

    setState("downloading");
    setProgress(0);
    setHasPasswordError(false);

    for (const i of indices) {
      const file = fileInfo.files[i];
      if (!file) continue;
      const failure = await downloadOne(i, file);
      if (failure) {
        setState("preview");
        setProgress(0);
        if (failure.kind === "password") {
          setHasPasswordError(true);
          return;
        }
        if (failure.kind === "verify") {
          setVerifyToken("");
          setVerifyStep("idle");
          setVerifyCode("");
          setHasVerifyCodeError(false);
          toast.error("Verification expired — request a new code");
          return;
        }
        toast.error("Download failed: " + failure.message);
        return;
      }
    }

    // A multi-file share stays on the file list so the recipient can download
    // the other files; only a single-file share lands on the "done" screen.
    const isMultiShare = fileInfo.files.length > 1;
    setState(isMultiShare ? "preview" : "done");
    setProgress(0);
    setCurrentName("");
    const multi = indices.length > 1;
    toast.success(
      fileInfo.encrypted
        ? multi
          ? "All files downloaded and decrypted!"
          : "File downloaded and decrypted!"
        : "File downloaded (was not encrypted).",
    );
  };

  const handleDownloadAll = () => {
    if (fileInfo) void startDownload(fileInfo.files.map((_, i) => i));
  };
  const handleDownloadOne = (index: number) => {
    void startDownload([index]);
  };

  const handleReset = () => {
    setLink("");
    setPassword("");
    setState("input");
    setProgress(0);
    setProgressLabel("Downloading…");
    setCurrentName("");
    setFileInfo(null);
    setHasPasswordError(false);
    setVerifyEmail("");
    setVerifyCode("");
    setVerifyToken("");
    setVerifyStep("idle");
    setHasVerifyCodeError(false);
  };

  return (
    <PageEntrance className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <ScrollProgress />
      <div className="mb-8 text-center">
        <h1 className="gemba-h2">Download File</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a share link to download and decrypt your file.
        </p>
      </div>

      {/*
        Single, stable PageEntranceItem wrapping the whole state-card
        region: it mounts once (with the page) and its CHILDREN swap as
        `state` changes, so the load entrance plays once, not on every
        state transition (see CR-01 in 11-REVIEW.md / MOTION.md).
      */}
      <PageEntranceItem>
      {state === "input" && isFetchingInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="gemba-h4">Fetching File Info</CardTitle>
              <CardDescription>Loading file details…</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
      )}

      {state === "input" && !isFetchingInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="gemba-h4">Enter Share Link</CardTitle>
              <CardDescription>
                Paste the link you received to access the shared file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link">Share Link</Label>
                <Input
                  id="link"
                  placeholder="https://example.com/download?id=..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
                />
              </div>
              <Button
                className="w-full gap-2"
                disabled={!link.trim()}
                onClick={handleFetchInfo}
              >
                <Icon name="Download01" size={16} />
                Fetch file info
              </Button>
            </CardContent>
          </Card>
      )}

      {state === "preview" && fileInfo && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="gemba-h4">File Details</CardTitle>
              <CardDescription>
                Review file information before downloading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {fileInfo.files.map((f, i) => (
                    <DownloadFileRow
                      key={i}
                      file={f}
                      index={i}
                      showDownloadButton={fileInfo.files.length > 1}
                      disabled={!!fileInfo.unavailable}
                      onDownload={handleDownloadOne}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap gap-2">
                {fileInfo.unavailable ? (
                  <Chip variant="warning" icon={<Icon name="AlertCircle" size={16} />}>
                    {fileInfo.unavailable === "exhausted"
                      ? "NO DOWNLOADS LEFT"
                      : "EXPIRED"}
                  </Chip>
                ) : (
                  <>
                    <Chip variant="neutral" icon={<Icon name="Download01" size={16} />}>
                      {fileInfo.downloadsRemaining} DOWNLOADS LEFT
                    </Chip>
                    <Chip variant="neutral" icon={<Icon name="Clock" size={16} />}>
                      EXPIRES IN {fileInfo.expiresIn.toUpperCase()}
                    </Chip>
                  </>
                )}
                {fileInfo.passwordProtected && (
                  <Chip variant="neutral" icon={<Icon name="Lock01" size={16} />}>
                    PASSWORD REQUIRED
                  </Chip>
                )}
                {!fileInfo.encrypted && (
                  <Chip variant="warning" icon={<Icon name="AlertCircle" size={16} />}>
                    NOT ENCRYPTED
                  </Chip>
                )}
                {fileInfo.verifyRequired &&
                  (verifyStep === "verified" ? (
                    <Chip variant="success" icon={<Icon name="Check" size={16} />}>
                      RECIPIENT VERIFIED
                    </Chip>
                  ) : (
                    <Chip variant="neutral" icon={<Icon name="Mail01" size={16} />}>
                      VERIFICATION REQUIRED
                    </Chip>
                  ))}
                <Chip variant="success" icon={<Icon name="ShieldTick" size={16} />}>
                  E2E ENCRYPTED
                </Chip>
              </div>

              <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)] p-4">
                <Icon
                  name="ShieldTick"
                  size={20}
                  className="mt-0.5 shrink-0 text-[var(--gemba-success)]"
                />
                <p className="gemba-body-sm text-[var(--text-primary)]">
                  End-to-end encrypted — decrypted in your browser; the key
                  never reaches our server.
                </p>
              </div>

              {fileInfo.verifyRequired && verifyStep !== "verified" && (
                <div className="space-y-3">
                  <Label htmlFor="verify-email" className="flex items-center gap-2">
                    <Icon name="Mail01" size={16} className="text-[var(--text-subdued)]" />
                    Recipient Verification
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="verify-email"
                      type="email"
                      placeholder="your@email.com"
                      value={verifyEmail}
                      disabled={verifyStep === "code-sent"}
                      onChange={(e) => setVerifyEmail(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        verifyStep === "idle" &&
                        handleRequestCode()
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={
                        !verifyEmail.trim() ||
                        verifyBusy ||
                        verifyStep === "code-sent"
                      }
                      onClick={handleRequestCode}
                    >
                      Get verification code
                    </Button>
                  </div>
                  {verifyStep === "code-sent" && (
                    <>
                      <p className="gemba-body-sm text-[var(--text-subdued)]">
                        If that address is on the list, a code is on its way
                        — check your inbox.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          id="verify-code"
                          inputMode="numeric"
                          placeholder="6-digit code"
                          value={verifyCode}
                          aria-invalid={hasVerifyCodeError}
                          className={
                            hasVerifyCodeError
                              ? "shadow-[inset_0_0_0_1px_var(--gemba-critical),var(--shadow-field)]"
                              : undefined
                          }
                          onChange={(e) => {
                            setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                            setHasVerifyCodeError(false);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          disabled={verifyCode.length !== 6 || verifyBusy}
                          onClick={handleVerifyCode}
                        >
                          Verify
                        </Button>
                      </div>
                      {hasVerifyCodeError && (
                        <p className="gemba-body-sm flex items-center gap-1 text-[var(--gemba-critical)]">
                          <Icon name="AlertCircle" size={16} />
                          Incorrect or expired code — try again.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {fileInfo.passwordProtected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter the file password"
                    value={password}
                    aria-invalid={hasPasswordError}
                    className={
                      hasPasswordError
                        ? "shadow-[inset_0_0_0_1px_var(--gemba-critical),var(--shadow-field)]"
                        : undefined
                    }
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setHasPasswordError(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleDownloadAll()}
                  />
                  {hasPasswordError && (
                    <p className="gemba-body-sm flex items-center gap-1 text-[var(--gemba-critical)]">
                      <Icon name="AlertCircle" size={16} />
                      Incorrect password — try again.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleReset}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!!fileInfo.unavailable}
              onClick={handleDownloadAll}
            >
              <Icon name="Download01" size={16} />
              {fileInfo.unavailable
                ? fileInfo.unavailable === "exhausted"
                  ? "No downloads left"
                  : "Expired"
                : fileInfo.files.length > 1
                  ? "Download all"
                  : "Download and decrypt"}
            </Button>
          </div>
        </div>
      )}

      {state === "downloading" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <Icon
                name="Loading03"
                size={32}
                className="mx-auto animate-spin text-[var(--icon-primary)] motion-reduce:animate-none"
              />
              <div>
                <p className="gemba-body-strong">{progressLabel}</p>
                <p className="gemba-body-sm text-[var(--text-subdued)]">
                  {currentName || fileInfo?.name}
                </p>
              </div>
              <Progress value={Math.min(progress, 100)} />
              <p className="gemba-body-sm text-[var(--text-subdued)]">
                {Math.min(Math.round(progress), 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "done" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-6 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gemba-success-subdued)]">
                <Icon name="Check" size={20} className="text-[var(--gemba-success)]" />
              </div>
              <div>
                <h3 className="gemba-h4">Download Complete</h3>
                <p className="gemba-body-sm mt-1 text-[var(--text-subdued)]">
                  {fileInfo?.name} has been decrypted and saved.
                </p>
              </div>
              <Button variant="secondary" onClick={handleReset}>
                Download another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "invalid-link" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
                <Icon
                  name="LinkBroken02"
                  size={24}
                  className="text-[var(--icon-subdued)]"
                />
              </div>
              <div>
                <h3 className="gemba-h4">Invalid share link</h3>
                <p className="gemba-body mt-1 text-[var(--text-subdued)]">
                  This link doesn&apos;t look right — check that you copied
                  the whole URL, including the part after the #.
                </p>
              </div>
              <Button className="w-full" onClick={handleReset}>
                Try another link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "file-not-found" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
                <Icon
                  name="SearchRefraction"
                  size={24}
                  className="text-[var(--icon-subdued)]"
                />
              </div>
              <div>
                <h3 className="gemba-h4">File not found</h3>
                <p className="gemba-body mt-1 text-[var(--text-subdued)]">
                  This file may have been removed, or the link may be
                  incorrect.
                </p>
              </div>
              <Button className="w-full" onClick={handleReset}>
                Try another link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "expired" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--gemba-warning-subdued)]">
                <Icon
                  name="Clock"
                  size={24}
                  className="text-[var(--gemba-warning)]"
                />
              </div>
              <div>
                <h3 className="gemba-h4">Link expired</h3>
                <p className="gemba-body mt-1 text-[var(--text-subdued)]">
                  This file is no longer available — it&apos;s expired or
                  reached its download limit.
                </p>
              </div>
              <Button className="w-full" onClick={handleReset}>
                Try another link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </PageEntranceItem>
    </PageEntrance>
  );
}
