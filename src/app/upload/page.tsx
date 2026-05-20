"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Link2,
  Lock,
  Timer,
  Upload,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDropzone } from "@/components/file-dropzone";
import { toast } from "sonner";
import {
  encryptPacked,
  exportKeyBase64,
  generateKey,
  randomSaltBase64,
  sha256Hex,
} from "@/lib/crypto";

type UploadState = "idle" | "preparing" | "uploading" | "done";
type ExpiryUnit = "hours" | "days" | "months";
type StorageMode = "blob" | "fs";

const EXPIRY_UNIT_MS: Record<ExpiryUnit, number> = {
  hours: 3600_000,
  days: 24 * 3600_000,
  months: 30 * 24 * 3600_000,
};

interface DirectMetaPayload {
  name: string;
  type: string;
  size: number;
  passwordHash?: string;
  salt?: string;
  downloadsRemaining: number;
  expiresAt: number;
}

function uploadDirect(
  body: Blob,
  meta: DirectMetaPayload,
  onProgress: (loaded: number, total: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");

    const metaJson = JSON.stringify(meta);
    const metaB64 = btoa(unescape(encodeURIComponent(metaJson)));
    xhr.setRequestHeader("x-meta", metaB64);
    xhr.setRequestHeader("content-type", "application/octet-stream");

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText) as { id?: string };
          if (!resp.id) {
            reject(new Error("server returned no id"));
            return;
          }
          resolve(resp.id);
        } catch {
          reject(new Error("invalid server response"));
        }
      } else {
        reject(
          new Error(
            `HTTP ${xhr.status} ${xhr.responseText || ""}`.trim(),
          ),
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

async function buildPayload(
  files: File[],
): Promise<{ data: ArrayBuffer; name: string; type: string; size: number }> {
  if (files.length === 1) {
    const f = files[0];
    const data = await f.arrayBuffer();
    return {
      data,
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
    };
  }

  const { zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    entries[f.name] = new Uint8Array(await f.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 0 });
  return {
    data: zipped.buffer.slice(
      zipped.byteOffset,
      zipped.byteOffset + zipped.byteLength,
    ) as ArrayBuffer,
    name: `gemba-bundle-${Date.now()}.zip`,
    type: "application/zip",
    size: zipped.byteLength,
  };
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState("1");
  const [expiryValue, setExpiryValue] = useState("1");
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>("days");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/storage-mode");
        if (!res.ok) return;
        const data = (await res.json()) as { mode: StorageMode };
        setStorageMode(data.mode);
      } catch {
        // assume fs if config endpoint unreachable
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
    if (!storageMode) {
      toast.error("Still initialising — please try again in a moment");
      return;
    }

    setUploadState("preparing");
    setProgressLabel(
      files.length > 1 ? "Bundling & encrypting…" : "Encrypting…",
    );
    setUploadProgress(0);

    try {
      const payload = await buildPayload(files);

      const key = await generateKey();
      const keyB64 = await exportKeyBase64(key);
      const encrypted = await encryptPacked(payload.data, key);
      const encryptedBlob = new Blob([encrypted], {
        type: "application/octet-stream",
      });

      const downloadsRemaining = Math.max(
        1,
        Math.min(100, Number(downloadLimit) || 1),
      );
      const expiresAt =
        Date.now() +
        Math.max(1, Number(expiryValue) || 1) * EXPIRY_UNIT_MS[expiryUnit];

      let id: string;

      if (storageMode === "blob") {
        // Generate ID client-side so we know the share URL up front; server
        // validates it via the handleUpload hook.
        id = generateClientId();
        setUploadState("uploading");
        setProgressLabel("Uploading…");
        setUploadProgress(0);

        const clientPayload = JSON.stringify({
          id,
          name: payload.name,
          type: payload.type,
          size: payload.size,
          password: usePassword ? password : undefined,
          downloadsRemaining,
          expiresAt,
        });

        await upload(`gemba/blob/${id}.bin`, encryptedBlob, {
          access: "public",
          handleUploadUrl: "/api/files",
          clientPayload,
          contentType: "application/octet-stream",
          onUploadProgress: (e) => {
            setUploadProgress(e.percentage);
          },
        });
      } else {
        let passwordHash: string | undefined;
        let salt: string | undefined;
        if (usePassword) {
          salt = randomSaltBase64();
          passwordHash = await sha256Hex(password + salt);
        }

        const meta: DirectMetaPayload = {
          name: payload.name,
          type: payload.type,
          size: payload.size,
          passwordHash,
          salt,
          downloadsRemaining,
          expiresAt,
        };

        setUploadState("uploading");
        setProgressLabel("Uploading…");
        setUploadProgress(0);

        id = await uploadDirect(encryptedBlob, meta, (loaded, total) => {
          if (total > 0) setUploadProgress((loaded / total) * 100);
        });
      }

      const params = new URLSearchParams({ id });
      if (usePassword) params.set("pw", "1");
      setShareLink(`${window.location.origin}/download?${params}#${keyB64}`);
      setUploadState("done");
      setUploadProgress(100);
      toast.success(
        files.length > 1
          ? `${files.length} files uploaded as bundle`
          : "File uploaded",
      );
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setUploadState("idle");
    setUploadProgress(0);
    setProgressLabel("");
    setShareLink("");
    setPassword("");
    setUsePassword(false);
    setDownloadLimit("1");
    setExpiryValue("1");
    setExpiryUnit("days");
  };

  const isBusy = uploadState === "preparing" || uploadState === "uploading";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Upload Files</h1>
        <p className="mt-2 text-muted-foreground">
          Select files to encrypt and share securely.
        </p>
      </div>

      {uploadState === "done" ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Upload Complete</CardTitle>
            <CardDescription>
              Your files are encrypted and ready to share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {usePassword && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Password Protected
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Download className="h-3 w-3" />
                {downloadLimit} download{Number(downloadLimit) !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Timer className="h-3 w-3" />
                Expires in {expiryValue}{" "}
                {Number(expiryValue) === 1
                  ? expiryUnit.slice(0, -1)
                  : expiryUnit}
              </Badge>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Upload More
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCopy}>
                <Link2 className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Files</CardTitle>
              <CardDescription>
                Files are encrypted in your browser before uploading.
                Multiple files are bundled into a zip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone files={files} onFilesChange={setFiles} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Options</CardTitle>
              <CardDescription>
                Configure security and sharing settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="password-toggle" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
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

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="download-limit" className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
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
                    <Timer className="h-4 w-4 text-muted-foreground" />
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
                      className="dark:bg-input/30 border-input h-9 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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

          {isBusy && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{progressLabel}</span>
                    <span className="text-muted-foreground">
                      {uploadState === "uploading"
                        ? `${Math.min(Math.round(uploadProgress), 100)}%`
                        : "…"}
                    </span>
                  </div>
                  <Progress
                    value={
                      uploadState === "uploading"
                        ? Math.min(uploadProgress, 100)
                        : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={files.length === 0 || isBusy || !storageMode}
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4" />
            {uploadState === "preparing"
              ? "Preparing…"
              : uploadState === "uploading"
                ? "Uploading…"
                : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
