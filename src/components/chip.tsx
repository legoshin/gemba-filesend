"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, variants, useMotionPreset } from "@/lib/motion"

const chipVariants = cva(
  "gemba-chip-label inline-flex w-fit shrink-0 items-center gap-[var(--space-2)] whitespace-nowrap uppercase h-5 rounded-[var(--radius-lg)] px-2.5 py-[3px] overflow-hidden",
  {
    variants: {
      variant: {
        neutral:
          "bg-[var(--gemba-neutral-subdued)] text-[var(--gemba-neutral-signal)]",
        accent: "bg-[var(--gemba-accent-subdued)] text-[var(--gemba-accent)]",
        success:
          "bg-[var(--gemba-success-subdued)] text-[var(--gemba-success)]",
        warning:
          "bg-[var(--gemba-warning-subdued)] text-[var(--gemba-warning)]",
        critical:
          "bg-[var(--gemba-critical-subdued)] text-[var(--gemba-critical)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name; omit them from the native span props
// since Chip does not use drag/animation lifecycle callbacks itself.
type NativeSpanProps = Omit<
  React.ComponentProps<"span">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

interface ChipProps
  extends NativeSpanProps,
    VariantProps<typeof chipVariants> {
  asChild?: boolean
  icon?: React.ReactNode
}

function Chip({
  className,
  variant = "neutral",
  asChild = false,
  icon,
  children,
  ...props
}: ChipProps) {
  const Comp = asChild ? motion.create(Slot.Root) : motion.span
  const motionProps = useMotionPreset(variants.fadeSlideUp, transitions.snappy)

  return (
    <Comp
      data-slot="chip"
      data-variant={variant}
      className={cn(chipVariants({ variant }), className)}
      {...motionProps}
      {...props}
    >
      {icon && (
        <span className="flex size-4 shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      {children}
    </Comp>
  )
}

export { Chip, chipVariants }
