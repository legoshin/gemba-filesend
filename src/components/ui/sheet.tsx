"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, getSlideOffset } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name (see chip.tsx's NativeSpanProps) —
// omit them from the Radix primitives' own props before spreading onto
// `motion.div` via `asChild`.
type NativeMotionConflicts =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"

// Shares the wrapper-owned resolved `open` (plus the AnimatePresence
// exit-complete callback) from `Sheet` down to `SheetOverlay`/
// `SheetContent` without gating `SheetTrigger` — unlike the previous
// implementation, which gated all of `children` and unmounted the trigger
// whenever the sheet was closed. Mirrors `DropdownMenuMotionContext`.
const SheetMotionContext = React.createContext<{
  isOpen: boolean
  onContentExitComplete: () => void
}>({ isOpen: false, onContentExitComplete: () => {} })

function Sheet({
  open,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  // Same forceMount+AnimatePresence resolved-open ownership as Dialog
  // (Sheet wraps the same Radix Dialog primitive) — RESEARCH Pattern 2.
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const [showContent, setShowContent] = React.useState(false)
  const prevOpenRef = React.useRef(false)
  React.useEffect(() => {
    if (isOpen && !prevOpenRef.current) setShowContent(true)
    prevOpenRef.current = !!isOpen
  }, [isOpen])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  const motionContext = React.useMemo(
    () => ({ isOpen, onContentExitComplete: () => setShowContent(false) }),
    [isOpen]
  )

  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      open={isOpen || showContent}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <SheetMotionContext.Provider value={motionContext}>
        {children}
      </SheetMotionContext.Provider>
    </SheetPrimitive.Root>
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal" forceMount {...props} />
  )
}

function SheetOverlay({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetPrimitive.Overlay>,
  NativeMotionConflicts
>) {
  const overlayMotion = useMotionPreset(
    {
      full: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
      reduced: { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } },
    },
    transitions.backdrop
  )
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      asChild
      forceMount
      {...props}
    >
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
        {...overlayMotion}
      />
    </SheetPrimitive.Overlay>
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Omit<
  React.ComponentProps<typeof SheetPrimitive.Content>,
  NativeMotionConflicts
> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  // Only the panel (+ its overlay) gate on `isOpen` — `SheetTrigger` lives
  // outside this component, as a direct sibling in `Sheet`'s `children`, so
  // it stays mounted while closed. Both are exiting members of the same
  // `AnimatePresence` boundary so `onContentExitComplete` fires once both
  // finish, matching the pre-fix single-boundary timing.
  const { isOpen, onContentExitComplete } = React.useContext(
    SheetMotionContext
  )
  const offset = getSlideOffset(side)
  const panelMotion = useMotionPreset(
    {
      full: {
        initial: { ...offset },
        animate: { x: 0, y: 0 },
        exit: { ...offset },
      },
      reduced: {
        initial: { opacity: 1, x: 0, y: 0 },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 1, x: 0, y: 0 },
      },
    },
    transitions.snappy
  )
  return (
    <SheetPortal>
      <AnimatePresence onExitComplete={onContentExitComplete}>
        {isOpen
          ? [
              <SheetOverlay key="overlay" />,
              <SheetPrimitive.Content
                key="content"
                data-slot="sheet-content"
                asChild
                forceMount
                {...props}
              >
                <motion.div
                  className={cn(
                    "bg-[var(--surface-card)] fixed z-50 flex flex-col gap-4 shadow-[var(--ring-border),var(--shadow-popover)]",
                    side === "right" && "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm",
                    side === "left" && "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm",
                    side === "top" && "inset-x-0 top-0 h-auto",
                    side === "bottom" && "inset-x-0 bottom-0 h-auto",
                    className
                  )}
                  {...panelMotion}
                >
                  {children}
                  {showCloseButton && (
                    <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
                      <XIcon className="size-4" />
                      <span className="sr-only">Close</span>
                    </SheetPrimitive.Close>
                  )}
                </motion.div>
              </SheetPrimitive.Content>,
            ]
          : null}
      </AnimatePresence>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
