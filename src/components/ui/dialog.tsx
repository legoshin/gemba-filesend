"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"
import { shape } from "@/lib/shape"

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
// exit-complete callback) from `Dialog` down to `DialogOverlay`/
// `DialogContent` without gating `DialogTrigger` — unlike the previous
// implementation, which gated all of `children` and unmounted the trigger
// whenever the dialog was closed. Mirrors `DropdownMenuMotionContext`.
const DialogMotionContext = React.createContext<{
  isOpen: boolean
  onContentExitComplete: () => void
}>({ isOpen: false, onContentExitComplete: () => {} })

function Dialog({
  open,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  // Wrapper owns the resolved `open` state so forceMount+AnimatePresence can
  // run the exit animation before Radix unmounts the tree (RESEARCH Pattern
  // 2, verified from SmoothUI's dialog/index.tsx). `isControlled` mirrors
  // the controlled/uncontrolled contract Radix itself exposes.
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  // showContent + prevOpenRef keep the Radix tree mounted through the exit
  // animation, clearing only once AnimatePresence's exit finishes.
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
    <DialogPrimitive.Root
      data-slot="dialog"
      open={isOpen || showContent}
      onOpenChange={handleOpenChange}
      {...props}
    >
      <DialogMotionContext.Provider value={motionContext}>
        {children}
      </DialogMotionContext.Provider>
    </DialogPrimitive.Root>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal" forceMount {...props} />
  )
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
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
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      asChild
      forceMount
      {...props}
    >
      <motion.div
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
        {...overlayMotion}
      />
    </DialogPrimitive.Overlay>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  NativeMotionConflicts
> & {
  showCloseButton?: boolean
}) {
  // Only the panel (+ its overlay) gate on `isOpen` — `DialogTrigger` lives
  // outside this component, as a direct sibling in `Dialog`'s `children`,
  // so it stays mounted while closed. Both are exiting members of the same
  // `AnimatePresence` boundary so `onContentExitComplete` fires once both
  // finish, matching the pre-fix single-boundary timing.
  const { isOpen, onContentExitComplete } = React.useContext(
    DialogMotionContext
  )
  const panelMotion = useMotionPreset(variants.scaleIn, transitions.snappy)
  return (
    <DialogPortal data-slot="dialog-portal">
      <AnimatePresence onExitComplete={onContentExitComplete}>
        {isOpen
          ? [
              <DialogOverlay key="overlay" />,
              <DialogPrimitive.Content
                key="content"
                data-slot="dialog-content"
                asChild
                forceMount
                {...props}
              >
                <motion.div
                  className={cn(
                    "bg-[var(--surface-card)] fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 shadow-[var(--ring-border),var(--shadow-popover)] outline-none sm:max-w-lg",
                    shape.card,
                    className
                  )}
                  {...panelMotion}
                >
                  {children}
                  {showCloseButton && (
                    <DialogPrimitive.Close
                      data-slot="dialog-close"
                      className="data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 outline-none transition-opacity before:absolute before:-inset-[14px] before:content-[''] hover:opacity-100 focus-visible:shadow-[var(--ring-focus)] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                    >
                      <XIcon />
                      <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                  )}
                </motion.div>
              </DialogPrimitive.Content>,
            ]
          : null}
      </AnimatePresence>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
