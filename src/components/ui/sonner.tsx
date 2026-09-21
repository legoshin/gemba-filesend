"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { cn } from "@/lib/utils"
import { shape } from "@/lib/shape"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        // Sonner's injected styles win the cascade, so these Tailwind
        // utilities need the `!` override marker (sonner's own styling
        // docs). CSS-surface re-skin only — sonner renders/animates its
        // own portal DOM and already ships its own reduced-motion media
        // query, so no motion/react wrap and no custom reduced-motion
        // handling here (10-RESEARCH.md Pitfall 2).
        classNames: {
          toast: cn(
            `!${shape.card}`,
            `!${shape.ring}`,
            "!shadow-[var(--shadow-popover)]"
          ),
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
