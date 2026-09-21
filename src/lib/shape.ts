/**
 * SmoothUI-flavoured shape presets, derived entirely from existing Gemba
 * radii/ring tokens — no new colour or radius values are introduced. See
 * src/app/globals.css `@theme inline` block (--radius-sm..4xl) and
 * --ring-border/--ring-focus for the source tokens.
 */
export const shape = {
  field: "rounded-[var(--radius-sm)]", // 8px  — inputs, square buttons
  innerCard: "rounded-[var(--radius-md)]", // 12px — inner/nested cards
  card: "rounded-[var(--radius-lg)]", // 16px — cards, chips
  pillButton: "rounded-[var(--radius-xl)]", // 24px — pill buttons, hero blocks
  pill: "rounded-full", // full pill (badges, CTAs)
  ring: "shadow-[var(--ring-border)]", // inset hairline ring
  ringFocus: "focus-visible:shadow-[var(--ring-focus)]", // inset focus ring
} as const;

/**
 * Clip-corner motif geometry (compound pattern — 4 absolutely-positioned
 * corner triangles over a rectangular surface). Not expressible as a single
 * Tailwind class; consumed as constants by the Phase 10 component that
 * implements the motif.
 */
export const clipCorner = {
  triangleSizePx: 8,
  insetPx: 6, // top-1.5 / left-1.5 (0.375rem)
  hoverMovePx: 4,
} as const;
