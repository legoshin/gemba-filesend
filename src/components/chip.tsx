import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

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

interface ChipProps
  extends React.ComponentProps<"span">,
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
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="chip"
      data-variant={variant}
      className={cn(chipVariants({ variant }), className)}
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
