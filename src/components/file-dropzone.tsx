"use client";

import { useCallback, useState } from "react";
import { CloudUpload, File, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSizeMb?: number;
}

export function FileDropzone({
  files,
  onFilesChange,
  maxSizeMb = 15360,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const filterBySize = useCallback(
    (incoming: File[]): File[] => {
      const accepted: File[] = [];
      const rejected: string[] = [];
      for (const f of incoming) {
        if (f.size > maxSizeBytes) {
          rejected.push(f.name);
        } else {
          accepted.push(f);
        }
      }
      if (rejected.length > 0) {
        const label =
          maxSizeMb >= 1024 ? `${maxSizeMb / 1024} GB` : `${maxSizeMb} MB`;
        toast.error(
          rejected.length === 1
            ? `"${rejected[0]}" exceeds the ${label} per-file limit`
            : `${rejected.length} files exceed the ${label} per-file limit`,
        );
      }
      return accepted;
    },
    [maxSizeBytes, maxSizeMb],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const dropped = Array.from(e.dataTransfer.files);
      const accepted = filterBySize(dropped);
      if (accepted.length > 0) {
        onFilesChange([...files, ...accepted]);
      }
    },
    [files, onFilesChange, filterBySize],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selected = Array.from(e.target.files);
        const accepted = filterBySize(selected);
        if (accepted.length > 0) {
          onFilesChange([...files, ...accepted]);
        }
      }
    },
    [files, onFilesChange, filterBySize],
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <CloudUpload
          className={cn(
            "mb-4 h-10 w-10",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="text-sm font-medium">
          {isDragging ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse &middot; Max {maxSizeMb >= 1024 ? `${maxSizeMb / 1024} GB` : `${maxSizeMb} MB`} per file
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <File className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
