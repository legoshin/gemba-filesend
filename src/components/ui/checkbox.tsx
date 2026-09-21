"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identity — see chip.tsx.
const MotionCheckIcon = motion.create(CheckIcon)

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  // Track checked state locally so the AnimatePresence reveal below works in
  // both controlled (checked+onCheckedChange, e.g. a future controlled call
  // site) and uncontrolled (defaultChecked only) usage — Radix's own internal
  // uncontrolled state isn't otherwise readable from here.
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState<
    boolean | "indeterminate"
  >(defaultChecked ?? false)
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : uncontrolledChecked
  const iconMotion = useMotionPreset(variants.scaleIn, transitions.snappy)

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(next) => {
        if (!isControlled) setUncontrolledChecked(next)
        onCheckedChange?.(next)
      }}
      className={cn(
        "peer size-[18px] shrink-0 rounded-[6px] bg-[var(--surface-card)] shadow-[inset_0_0_0_1.5px_var(--icon-subtle)] transition-shadow outline-none focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1.5px_var(--gemba-critical)] data-[state=checked]:bg-[var(--button-primary-bg)] data-[state=checked]:text-[var(--button-primary-fg)] data-[state=checked]:shadow-none",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        forceMount
        className="grid place-content-center text-current"
      >
        <AnimatePresence mode="wait">
          {isChecked && (
            <MotionCheckIcon
              key="check"
              className="size-3.5"
              {...iconMotion}
            />
          )}
        </AnimatePresence>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
