"use client";

import { createContext, Suspense, useContext } from "react";
import { useSearchParams } from "next/navigation";

interface EmbedState {
  isEmbed: boolean;
  backgroundColor: string | null;
}

const DEFAULT: EmbedState = { isEmbed: false, backgroundColor: null };

const EmbedContext = createContext<EmbedState>(DEFAULT);

export function useEmbed(): EmbedState {
  return useContext(EmbedContext);
}

/**
 * Validates and normalizes an untrusted `color` query param into a hex
 * color string suitable for an inline style OBJECT VALUE only.
 *
 * SECURITY: the raw param is never concatenated into a CSS declaration or
 * style string — it is only ever returned here for use as an inline style
 * object value (e.g. `style={{ backgroundColor }}`) in the consumers.
 */
export function normalizeEmbedColor(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  if (!/^#?[0-9a-fA-F]{3,8}$/.test(raw)) return null;
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function EmbedReader({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const value: EmbedState = {
    isEmbed: params.get("mode") === "embed",
    backgroundColor: normalizeEmbedColor(params.get("color")),
  };
  return (
    <EmbedContext.Provider value={value}>{children}</EmbedContext.Provider>
  );
}

export function EmbedProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <EmbedContext.Provider value={DEFAULT}>
          {children}
        </EmbedContext.Provider>
      }
    >
      <EmbedReader>{children}</EmbedReader>
    </Suspense>
  );
}
