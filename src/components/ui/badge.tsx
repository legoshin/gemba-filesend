"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identity: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting it here keeps `Comp`
// identity stable across re-renders on the `asChild` path.
const MotionSlot = motion.create(Slot.Root)

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name; omit them from the native span props
// since Badge does not use drag/animation lifecycle callbacks itself.
type NativeSpanProps = Omit<
  React.ComponentProps<"span">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: NativeSpanProps &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? MotionSlot : motion.span
  const motionProps = useMotionPreset(variants.fadeSlideUp, transitions.snappy)

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...motionProps}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
