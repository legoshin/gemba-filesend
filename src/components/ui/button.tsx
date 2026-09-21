"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identities: `motion.create()` returns a new
// wrapped component object each call, so it must not be invoked during
// render (react-hooks/static-components) — hoisting them here keeps `Comp`
// identity stable across re-renders on both the native-button and asChild
// paths.
const MotionButton = motion.create("button")
const MotionSlot = motion.create(Slot.Root)

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:shadow-[var(--ring-focus)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        tertiary:
          "bg-[var(--button-subdued-bg)] text-primary hover:bg-[var(--button-subdued-bg)]/80",
        ghost: "text-primary hover:bg-[var(--surface-subdued)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 px-6 gap-2 rounded-[var(--radius-xl)] [&_svg:not([class*='size-'])]:size-5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-4 gap-2 rounded-[var(--radius-xl)]",
        lg: "h-10 rounded-[var(--radius-xl)] px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-[var(--radius-sm)] [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[var(--radius-sm)]",
        "icon-lg": "size-10 rounded-[var(--radius-xl)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name; omit them from the native button
// props since Button does not use drag/animation lifecycle callbacks itself.
type NativeButtonProps = Omit<
  React.ComponentProps<"button">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: NativeButtonProps &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? MotionSlot : MotionButton
  const press = useMotionPreset(variants.tapPress, transitions.micro)
  const hover = useMotionPreset(variants.hover, transitions.micro)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...press}
      {...hover}
      {...props}
    />
  )
}

export { Button, buttonVariants }
