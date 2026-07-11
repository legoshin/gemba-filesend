"use client";

import { useCallback, useEffect, useState } from "react";
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
import { toast } from "sonner";
import { decryptPacked, importKeyBase64 } from "@/lib/crypto";

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
  keyBase64: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [hasPasswordError, setHasPasswordError] = useState(false);

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
    if (!keyBase64) {
      setState("invalid-link");
      return;
    }

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
        setState("expired");
        return;
      }
      toast.error(`Failed to fetch file info (HTTP ${res.status})`);
      return;
    }

    const data = (await res.json()) as {
      name: string;
      type: string;
      size: number;
      passwordProtected: boolean;
      downloadsRemaining: number;
      expiresAt: number;
    };

    setFileInfo({
      id,
      name: data.name,
      type: data.type,
      sizeBytes: data.size,
      size: formatSize(data.size),
      downloadsRemaining: data.downloadsRemaining,
      expiresIn: formatExpiresIn(data.expiresAt),
      passwordProtected: data.passwordProtected,
      keyBase64,
    });
    setState("preview");
  }, []);

  const handleFetchInfo = () => {
    if (!link.trim()) return;
    void fetchFileInfo(link);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("id")) {
      const currentUrl = window.location.href;
      setLink(currentUrl);
      void fetchFileInfo(currentUrl);
    }
  }, [fetchFileInfo]);

  const handleDownload = async () => {
    if (!fileInfo) return;
    if (fileInfo.passwordProtected && !password) {
      toast.error("Please enter the password to download");
      return;
    }

    setState("downloading");
    setProgress(0);
    setProgressLabel("Downloading…");
    setHasPasswordError(false);

    let isPasswordError = false;

    try {
      const headers: Record<string, string> = {};
      if (fileInfo.passwordProtected) headers["x-password"] = password;

      // Step 1: ask our API for a presigned download URL. The function
      // enforces password + counter checks and returns { url } pointing at
      // the Blob CDN. Errors (401/403/404/410) come back as non-2xx.
      const authRes = await fetch(
        `/api/files/${encodeURIComponent(fileInfo.id)}`,
        { headers },
      );

      if (!authRes.ok) {
        const text = await authRes.text().catch(() => "");
        if (authRes.status === 401 || authRes.status === 403) {
          isPasswordError = true;
          throw new Error("Incorrect password");
        }
        if (authRes.status === 404) throw new Error("File not found");
        if (authRes.status === 410) {
          throw new Error("File expired or exhausted");
        }
        throw new Error(text || `HTTP ${authRes.status}`);
      }

      const auth = (await authRes.json()) as { url?: string };
      if (!auth.url) throw new Error("Server did not return a download URL");

      // Step 2: fetch the encrypted bytes directly from the Blob CDN.
      const res = await fetch(auth.url);
      if (!res.ok) {
        throw new Error(
          `Blob CDN returned HTTP ${res.status}. The presigned URL may have expired — try again.`,
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("octet-stream")) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Unexpected response (${contentType})`);
      }

      const total =
        Number(res.headers.get("content-length")) || fileInfo.sizeBytes || 0;
      if (!res.body) throw new Error("Empty response body");

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

      const encrypted = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        encrypted.set(c, offset);
        offset += c.byteLength;
      }

      // An AES-GCM encrypted payload is at minimum IV (12) + auth tag (16)
      // = 28 bytes. Anything shorter is a truncated or wrong-shaped
      // response, not a valid ciphertext.
      if (encrypted.byteLength < 28) {
        const preview = new TextDecoder("utf-8", { fatal: false }).decode(
          encrypted,
        );
        throw new Error(
          `Server returned only ${encrypted.byteLength} bytes${preview ? `: "${preview}"` : ""}. The file may have expired, been exhausted, or the link is invalid.`,
        );
      }
      if (total > 0 && encrypted.byteLength < total) {
        throw new Error(
          `Download truncated: received ${encrypted.byteLength} of ${total} bytes. Try again.`,
        );
      }

      setProgressLabel("Decrypting…");
      setProgress(100);

      const key = await importKeyBase64(fileInfo.keyBase64);
      const decrypted = await decryptPacked(encrypted.buffer, key);

      const blob = new Blob([decrypted], { type: fileInfo.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState("done");
      toast.success("File downloaded and decrypted!");
    } catch (err) {
      setState("preview");
      setProgress(0);
      if (isPasswordError) {
        setHasPasswordError(true);
        return;
      }
      toast.error(
        "Download failed: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const handleReset = () => {
    setLink("");
    setPassword("");
    setState("input");
    setProgress(0);
    setProgressLabel("Downloading…");
    setFileInfo(null);
    setHasPasswordError(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="gemba-h2">Download File</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a share link to download and decrypt your file.
        </p>
      </div>

      {state === "input" && (
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
              <div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--surface-card)] p-4 shadow-[var(--ring-border)]">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
                  <Icon name="File01" size={24} className="text-[var(--icon-subdued)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="gemba-body-strong truncate">{fileInfo.name}</p>
                  <p className="gemba-body-sm text-[var(--text-subdued)]">
                    {fileInfo.size} &middot; {fileInfo.type}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip variant="neutral" icon={<Icon name="Download01" size={16} />}>
                  {fileInfo.downloadsRemaining} DOWNLOADS LEFT
                </Chip>
                <Chip variant="neutral" icon={<Icon name="Clock" size={16} />}>
                  EXPIRES IN {fileInfo.expiresIn.toUpperCase()}
                </Chip>
                {fileInfo.passwordProtected && (
                  <Chip variant="neutral" icon={<Icon name="Lock01" size={16} />}>
                    PASSWORD REQUIRED
                  </Chip>
                )}
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
                    onKeyDown={(e) => e.key === "Enter" && handleDownload()}
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
            <Button className="flex-1 gap-2" onClick={handleDownload}>
              <Icon name="Download01" size={16} />
              Download and decrypt
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
                className="mx-auto animate-spin text-[var(--icon-primary)]"
              />
              <div>
                <p className="gemba-body-strong">{progressLabel}</p>
                <p className="gemba-body-sm text-[var(--text-subdued)]">
                  {fileInfo?.name}
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
    </div>
  );
}
