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
        // rounded-[6px] was off the app's radius scale (--radius-sm=8 is the
        // nearest step); before:-inset expands the click/touch target to
        // ~44px without growing the visible 18px box.
        "peer relative size-[18px] shrink-0 rounded-[var(--radius-sm)] bg-[var(--surface-card)] shadow-[inset_0_0_0_1.5px_var(--icon-subtle)] transition-shadow outline-none before:absolute before:-inset-[13px] before:content-[''] focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1.5px_var(--gemba-critical)] data-[state=checked]:bg-[var(--button-primary-bg)] data-[state=checked]:text-[var(--button-primary-fg)] data-[state=checked]:shadow-none",
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
