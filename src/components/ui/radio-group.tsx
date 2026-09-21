"use client"

import * as React from "react"
import { CircleIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { transitions, variants } from "@/lib/motion"
import { useMotionPreset } from "@/lib/use-motion-preset"

// Stable module-level component identity — see chip.tsx.
const MotionCircleIcon = motion.create(CircleIcon)

// Radix doesn't expose the group's current selected value to individual
// items, so `RadioGroupItem` has no way to know whether its own dot is
// selected in order to drive `AnimatePresence`'s exit animation the same
// way `Checkbox` does with its own controlled/uncontrolled `checked` state.
// Track it here and share the resolved value down, mirroring
// `DialogMotionContext`/`DropdownMenuMotionContext`.
const RadioGroupValueContext = React.createContext<
  string | null | undefined
>(undefined)

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : uncontrolledValue

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (!isControlled) setUncontrolledValue(next)
        onValueChange?.(next)
      }}
      {...props}
    >
      <RadioGroupValueContext.Provider value={currentValue}>
        {children}
      </RadioGroupValueContext.Provider>
    </RadioGroupPrimitive.Root>
  )
}

function RadioGroupItem({
  className,
  value,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  const dotMotion = useMotionPreset(variants.scaleIn, transitions.snappy)
  const currentValue = React.useContext(RadioGroupValueContext)
  const isSelected = currentValue === value

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      value={value}
      className={cn(
        "aspect-square size-[18px] shrink-0 rounded-full bg-[var(--surface-card)] shadow-[inset_0_0_0_1.5px_var(--icon-subtle)] transition-[color,box-shadow] outline-none focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1.5px_var(--gemba-critical)] data-[state=checked]:shadow-[inset_0_0_0_1.5px_var(--button-primary-bg)]",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        forceMount
        className="relative flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {isSelected && (
            <MotionCircleIcon
              key="dot"
              className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-[var(--button-primary-bg)]"
              {...dotMotion}
            />
          )}
        </AnimatePresence>
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
