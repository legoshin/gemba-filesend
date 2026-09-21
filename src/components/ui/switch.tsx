"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { transitions } from "@/lib/motion"

// Stable module-level component identity — see chip.tsx.
const MotionThumb = motion.create(SwitchPrimitive.Thumb)

// Mirrors the pre-existing `translate-x-[calc(100%-2px)]` CSS value per size
// variant (the thumb's own width minus a 2px inset) — Motion cannot
// interpolate a `calc()` string smoothly as a spring, so the equivalent px
// value is made explicit here instead.
const THUMB_TRAVEL_PX: Record<"sm" | "default", number> = {
  default: 14, // size-4 thumb (16px) - 2px inset
  sm: 10, // size-3 thumb (12px) - 2px inset
}

function Switch({
  className,
  size = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  // Track checked state locally so the thumb's `animate` prop has a real
  // boolean to condition on in both controlled and uncontrolled usage —
  // Radix's own internal uncontrolled state isn't otherwise readable here.
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(
    defaultChecked ?? false
  )
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : uncontrolledChecked
  // Calls useReducedMotion() directly instead of going through
  // useMotionPreset/resolveMotionPreset: the thumb's `animate.x` value
  // varies by isChecked x size (a per-size pixel constant), not a
  // {full, reduced} variant pair, so it can't be expressed as one.
  const shouldReduceMotion = useReducedMotion()

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(next) => {
        if (!isControlled) setUncontrolledChecked(next)
        onCheckedChange?.(next)
      }}
      className={cn(
        "peer data-[state=checked]:bg-[var(--button-primary-bg)] data-[state=unchecked]:bg-[var(--icon-subtle)] focus-visible:shadow-[var(--ring-focus)] group/switch inline-flex shrink-0 items-center rounded-[var(--radius-pill)] transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className
      )}
      {...props}
    >
      <MotionThumb
        data-slot="switch-thumb"
        className="bg-[var(--surface-card)] pointer-events-none block rounded-full shadow-[0_1px_2px_rgba(40,51,73,0.25)] group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3"
        animate={{ x: isChecked ? THUMB_TRAVEL_PX[size] : 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : transitions.snappy}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
