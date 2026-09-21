"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identities: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting them here keeps
// identity stable across re-renders (same pattern as chip.tsx/button.tsx).
const MotionRoot = motion.create(ProgressPrimitive.Root)
const MotionIndicator = motion.create(ProgressPrimitive.Indicator)

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name; omit them since Progress does not
// use drag/animation lifecycle callbacks itself (same pattern as button.tsx).
type NativeRootProps = Omit<
  React.ComponentProps<typeof ProgressPrimitive.Root>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

function Progress({ className, value, max, ...props }: NativeRootProps) {
  // Container reveal on mount only — the fill itself is driven by `value`
  // below, not by this preset.
  const reveal = useMotionPreset(variants.progress, transitions.snappy)

  return (
    <MotionRoot
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...reveal}
      {...props}
    >
      <MotionIndicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1"
        animate={{ x: `-${100 - (value || 0)}%` }}
        transition={transitions.fill}
      />
    </MotionRoot>
  )
}

export { Progress }
