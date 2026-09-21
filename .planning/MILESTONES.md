# Milestones

## v1.1 SmoothUI Re-shape (Shipped: 2026-09-21)

**Phases completed:** 4 phases, 12 plans, 27 tasks

**Key accomplishments:**

- Installed `motion` (Framer Motion successor) and built the shared shape + motion preset layer — named transitions (snappy/fill/micro/backdrop), a full/reduced variant inventory across 8 interaction types, a pure/hook resolver pair, radii/ring shape constants, and an app-root `MotionConfig` — proven end-to-end through a real `chip.tsx` consumer.
- Wrote `design-system/MOTION.md` documenting the shape (radii/ring/clip-corner) and motion (transition/variant/reduced-motion) presets exported by `src/lib/motion.ts`/`src/lib/shape.ts`, with an explicit colour/type-unchanged statement, and linked it from `DESIGN-SYSTEM.md`.
- Button reshaped onto SmoothUI press/hover motion via the chip.tsx pattern (all 7 variants/8 sizes preserved, `npm run build` green), plus two new `src/lib/motion.ts` exports — `variants.focusPop` and `getSlideOffset(side)` — unit-tested and documented for the Input and Sheet waves.
- Input/Checkbox/RadioGroup/Switch re-shaped onto SmoothUI geometry + motion (whileFocus pop, AnimatePresence check reveal, dot scale-in, spring thumb travel) while Radix keeps all state/keyboard/aria.
- Progress bar reshaped onto `transitions.fill` motion (module-scope `motion.create()` on both Root and Indicator), sonner toasts re-skinned via `toastOptions.classNames` with `!`-prefixed shape tokens — no `motion/react` import into sonner.
- Reshaped Card, Badge, Avatar, and Separator onto SmoothUI motion/geometry — closed Card's one confirmed literal `rounded-lg` gap and brought Badge to full parity with its already-migrated sibling chip.tsx.
- Dialog, Sheet, and DropdownMenuContent reshaped onto forceMount + AnimatePresence with SmoothUI spring motion (scaleIn panel, per-side slide, menu variant), Radix focus-trap/keyboard/ARIA fully preserved via asChild / direct motion.create wrapping.
- Tabs, sidebar nav, and mobile tab bar share one `layoutId`-driven sliding-indicator pattern; theme-toggle crossfades its trigger icon via `AnimatePresence` while keeping the 3-way light/dark/system control intact.
- File-dropzone drag + selected-file rows, upload share-result rows, and download file rows reshaped onto SmoothUI AnimatePresence/stagger motion via per-row subcomponents; new pure-CSS Skeleton created and wired into a newly added download metadata-fetch loading state — encryption/storage/multi-file logic untouched (127/127 tests green throughout).
- staggerContainer foundation preset + reusable PageEntrance/PageEntranceItem wrapper wired end-to-end on the home page, plus a reusable ScrollProgress top-bar component built and ready for Wave 2.
- Upload page's Select Files / Options / action cards and the Upload-Complete card now stagger in via the shared PageEntrance/PageEntranceItem wrapper, and a ScrollProgress bar tracks scroll on the page — reusing the wave-1 components verbatim.
- Wrapped all 8 download-page state cards in the shared PageEntrance/PageEntranceItem stagger and mounted the shared ScrollProgress bar, with zero changes to decrypt/download logic, existing file-row AnimatePresence, or Skeleton loading state.

---
