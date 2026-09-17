"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icon";
import {
  MAX_RECIPIENT_EMAILS,
  commitRecipientTokens,
} from "@/lib/recipient-emails";

interface RecipientChipInputProps {
  id?: string;
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

/**
 * Controlled email chip input built from the existing shadcn `Input` + `Badge`
 * primitives (no new dependency). Committed emails render as removable chips;
 * typed tokens commit on Enter, comma, or blur. All commit/reject/dedupe/cap
 * decisions come from the tested {@link commitRecipientTokens} helper — this
 * component is thin presentational glue and does not re-implement validation.
 */
export function RecipientChipInput({
  id,
  value,
  onChange,
  placeholder,
}: RecipientChipInputProps) {
  const [draft, setDraft] = useState("");
  const [rejected, setRejected] = useState<string[]>([]);
  const atCap = value.length >= MAX_RECIPIENT_EMAILS;

  const commit = (raw: string) => {
    if (raw.trim().length === 0) return;
    const { emails, rejected: rej } = commitRecipientTokens(value, raw);
    if (emails.length !== value.length) onChange(emails);
    setDraft("");
    setRejected(rej);
  };

  const removeEmail = (email: string) => {
    onChange(value.filter((e) => e !== email));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1 pr-1">
              <span className="truncate">{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => removeEmail(email)}
                className="inline-flex size-4 items-center justify-center rounded-full text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground focus-visible:outline-none focus-visible:shadow-[var(--ring-focus)]"
              >
                <Icon name="XClose" size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder={
          atCap ? `Maximum ${MAX_RECIPIENT_EMAILS} recipients reached` : placeholder
        }
        value={draft}
        disabled={atCap}
        aria-invalid={rejected.length > 0 || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          }
        }}
        onBlur={() => commit(draft)}
      />

      {rejected.length > 0 && (
        <p
          aria-live="polite"
          className="text-xs text-[var(--gemba-critical)]"
        >
          Not added (invalid or over the {MAX_RECIPIENT_EMAILS} limit):{" "}
          {rejected.join(", ")}
        </p>
      )}

      {atCap && rejected.length === 0 && (
        <p className="text-xs text-muted-foreground">
          You can add up to {MAX_RECIPIENT_EMAILS} recipients.
        </p>
      )}
    </div>
  );
}
