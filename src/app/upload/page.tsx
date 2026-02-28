"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Link2,
  Lock,
  QrCode,
  Timer,
  Upload,
} from "lucide-react";
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

type UploadState = "idle" | "uploading" | "done";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState("1");
  const [expiryHours, setExpiryHours] = useState("24");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploadState("uploading");
    setUploadProgress(0);

    // Simulate upload with progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Simulate completion
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setUploadState("done");
      const id = Math.random().toString(36).substring(2, 10);
      const key = Math.random().toString(36).substring(2, 14);
      const params = new URLSearchParams({ id });
      if (usePassword) params.set("pw", "1");
      setShareLink(`${window.location.origin}/download?${params}#${key}`);
      toast.success("Files uploaded successfully!");
    }, 2500);
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
    setShareLink("");
    setPassword("");
    setUsePassword(false);
    setDownloadLimit("1");
    setExpiryHours("24");
  };

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
                Expires in {expiryHours}h
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
                    Expires After (hours)
                  </Label>
                  <Input
                    id="expiry"
                    type="number"
                    min="1"
                    max="168"
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {uploadState === "uploading" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Encrypting & uploading...</span>
                    <span className="text-muted-foreground">
                      {Math.min(Math.round(uploadProgress), 100)}%
                    </span>
                  </div>
                  <Progress value={Math.min(uploadProgress, 100)} />
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={files.length === 0 || uploadState === "uploading"}
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4" />
            {uploadState === "uploading"
              ? "Uploading..."
              : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
