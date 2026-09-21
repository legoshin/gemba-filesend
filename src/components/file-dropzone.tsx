"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import { shape } from "@/lib/shape";

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSizeMb?: number;
}

// Stable module-level component identity: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting it here matches
// chip.tsx's `MotionSlot` convention.
const MotionLabel = motion.create("label");

interface FileRowProps {
  file: File;
  index: number;
  formattedSize: string;
  onRemove: (index: number) => void;
}

// Extracted so `useMotionPreset` is called once per row instance rather than
// inside `files.map(...)` — calling a hook inside a loop with a variable
// iteration count violates the Rules of Hooks (RESEARCH Pitfall 4).
function FileRow({ file, index, formattedSize, onRemove }: FileRowProps) {
  const rowMotion = useMotionPreset(variants.stagger, transitions.snappy);

  return (
    <motion.div
      layout
      {...rowMotion}
      className={cn(
        "flex items-center gap-3 bg-[var(--surface-card)] p-3 shadow-[var(--ring-border)]",
        shape.innerCard
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-subdued)]">
        <Icon name="File01" size={16} className="text-[var(--icon-subdued)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="gemba-body-strong truncate">{file.name}</p>
        <p className="gemba-body-sm text-[var(--text-subdued)]">
          {formattedSize}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label={`Remove ${file.name}`}
        onClick={() => onRemove(index)}
      >
        <Icon name="XClose" size={16} />
      </Button>
    </motion.div>
  );
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

  const dropzoneMotion = useMotionPreset(
    {
      full: { animate: { scale: isDragging ? 1.02 : 1 } },
      reduced: { animate: {} },
    },
    transitions.micro,
  );

  return (
    <div className="space-y-4">
      <MotionLabel
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-colors",
          shape.card,
          isDragging
            ? "border-[var(--gemba-accent)] bg-[var(--gemba-accent-subdued)]"
            : "border-[var(--border-default)] hover:border-[var(--gemba-accent)]/50"
        )}
        {...dropzoneMotion}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="sr-only"
        />
        <Icon
          aria-hidden="true"
          name="UploadCloud01"
          size={40}
          className={cn(
            "pointer-events-none mb-4",
            isDragging ? "text-[var(--gemba-accent)]" : "text-[var(--icon-subdued)]"
          )}
        />
        <p className="gemba-body-strong pointer-events-none">
          {isDragging ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="gemba-body-sm pointer-events-none mt-1 text-[var(--text-subdued)]">
          or click to browse &middot; Max {maxSizeMb >= 1024 ? `${maxSizeMb / 1024} GB` : `${maxSizeMb} MB`} per file
        </p>
      </MotionLabel>

      {files.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {files.map((file, index) => (
              <FileRow
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                formattedSize={formatSize(file.size)}
                onRemove={removeFile}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
