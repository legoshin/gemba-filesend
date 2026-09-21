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

  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      open={isOpen || showContent}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <AnimatePresence onExitComplete={() => setShowContent(false)}>
        {isOpen ? children : null}
      </AnimatePresence>
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
    <SheetPrimitive.Overlay data-slot="sheet-overlay" asChild forceMount>
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
        {...overlayMotion}
        {...props}
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
      <SheetOverlay />
      <SheetPrimitive.Content data-slot="sheet-content" asChild forceMount>
        <motion.div
          className={cn(
            "bg-background fixed z-50 flex flex-col gap-4 shadow-lg",
            side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
            side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
            side === "top" && "inset-x-0 top-0 h-auto border-b",
            side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
            className
          )}
          {...panelMotion}
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
        </motion.div>
      </SheetPrimitive.Content>
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
