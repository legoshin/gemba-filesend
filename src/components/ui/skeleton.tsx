import * as React from "react"

import { cn } from "@/lib/utils"
import { shape } from "@/lib/shape"

/**
 * Pure-CSS loading placeholder — SmoothUI's own skeleton-loader is
 * `animate-pulse`, no `motion.*` involved (RESEARCH Component Map
 * "Skeleton/loading treatment"). Degrades under reduced motion via the
 * Tailwind `motion-reduce:` variant, no `useReducedMotion()` needed.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse bg-[var(--surface-subdued)] motion-reduce:animate-none",
        shape.innerCard,
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
