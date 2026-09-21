"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identity — see chip.tsx for why
// `motion.create()` must never be called inside a render function.
const MotionInput = motion.create("input")

// Motion's drag/animation event props have signatures incompatible with the
// native DOM handlers of the same name (same conflict chip.tsx already
// resolves for its span props); Input never uses drag/animation lifecycle
// callbacks itself.
type NativeInputProps = Omit<
  React.ComponentProps<"input">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

function Input({ className, type, ...props }: NativeInputProps) {
  const focus = useMotionPreset(variants.focusPop, transitions.micro)

  return (
    <MotionInput
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-10 w-full min-w-0 rounded-[var(--radius-sm)] bg-[var(--surface-card)] px-4 py-1 text-base shadow-[var(--ring-border),var(--shadow-field)] transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:shadow-[var(--ring-focus)]",
        "aria-invalid:shadow-[inset_0_0_0_1px_var(--gemba-critical)]",
        className
      )}
      {...focus}
      {...props}
    />
  )
}

export { Input }
