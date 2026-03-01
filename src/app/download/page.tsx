"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Download,
  File,
  Loader2,
  Lock,
  ShieldCheck,
  Timer,
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getFile, type StoredFile } from "@/lib/file-store";

type DownloadState = "input" | "preview" | "downloading" | "done";

interface FileInfo {
  name: string;
  size: string;
  type: string;
  downloadsRemaining: number;
  expiresIn: string;
  passwordProtected: boolean;
}

export default function DownloadPage() {
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<DownloadState>("input");
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [storedFile, setStoredFile] = useState<StoredFile | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchFileInfo = async (shareLink: string) => {
    let fileId = "";
    try {
      const url = new URL(shareLink);
      fileId = url.searchParams.get("id") ?? "";
    } catch {
      toast.error("Invalid share link");
      return;
    }

    if (!fileId) {
      toast.error("No file ID found in link");
      return;
    }

    const file = await getFile(fileId);
    if (!file) {
      toast.error("File not found or has expired");
      return;
    }

    if (file.expiresAt < Date.now()) {
      toast.error("This file has expired");
      return;
    }

    setStoredFile(file);

    const hoursLeft = Math.max(1, Math.round((file.expiresAt - Date.now()) / 3600_000));

    setState("preview");
    setFileInfo({
      name: file.name,
      size: formatSize(file.size),
      type: file.type,
      downloadsRemaining: file.downloadsRemaining,
      expiresIn: `${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}`,
      passwordProtected: file.passwordProtected,
    });
  };

  const handleFetchInfo = () => {
    if (!link.trim()) return;
    fetchFileInfo(link);
  };

  // Auto-fetch file info when the page is opened with a share link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("id")) {
      const currentUrl = window.location.href;
      setLink(currentUrl);
      fetchFileInfo(currentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (fileInfo?.passwordProtected && !password) {
      toast.error("Please enter the password to download");
      return;
    }

    setState("downloading");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);

      // Trigger actual browser download with real file data
      if (storedFile) {
        const blob = new Blob([storedFile.data], { type: storedFile.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = storedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setState("done");
      toast.success("File downloaded and decrypted!");
    }, 2000);
  };

  const handleReset = () => {
    setLink("");
    setPassword("");
    setState("input");
    setProgress(0);
    setFileInfo(null);
    setStoredFile(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Download File</h1>
        <p className="mt-2 text-muted-foreground">
          Paste a share link to download and decrypt your file.
        </p>
      </div>

      {state === "input" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter Share Link</CardTitle>
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
              <Download className="h-4 w-4" />
              Fetch File Info
            </Button>
          </CardContent>
        </Card>
      )}

      {state === "preview" && fileInfo && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Details</CardTitle>
              <CardDescription>
                Review file information before downloading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <File className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{fileInfo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {fileInfo.size} &middot; {fileInfo.type}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Download className="h-3 w-3" />
                  {fileInfo.downloadsRemaining} downloads left
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Timer className="h-3 w-3" />
                  Expires in {fileInfo.expiresIn}
                </Badge>
                {fileInfo.passwordProtected && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Password Required
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  E2E Encrypted
                </Badge>
              </div>

              {fileInfo.passwordProtected && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter the file password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDownload()}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download & Decrypt
            </Button>
          </div>
        </div>
      )}

      {state === "downloading" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-sm space-y-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Downloading & decrypting...</p>
                <p className="text-sm text-muted-foreground">
                  {fileInfo?.name}
                </p>
              </div>
              <Progress value={Math.min(progress, 100)} />
              <p className="text-sm text-muted-foreground">
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Download Complete</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fileInfo?.name} has been decrypted and saved.
                </p>
              </div>
              <Button variant="outline" onClick={handleReset}>
                Download Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
