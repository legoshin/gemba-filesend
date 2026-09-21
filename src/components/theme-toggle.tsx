"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { transitions, variants } from "@/lib/motion";
import { useMotionPreset } from "@/lib/use-motion-preset";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// `resolvedTheme` (not `theme`) drives the icon — `theme` can be "system",
// which has no matching icon, while `resolvedTheme` is always light|dark.
function ThemeToggleIcon({ resolvedTheme }: { resolvedTheme: string | undefined }) {
  const iconMotion = useMotionPreset(variants.scaleIn, transitions.snappy);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={resolvedTheme} {...iconMotion} className="inline-flex">
        <Icon name={resolvedTheme === "dark" ? "Moon01" : "Sun"} size={20} />
      </motion.span>
    </AnimatePresence>
  );
}

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <ThemeToggleIcon resolvedTheme={resolvedTheme} />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Icon name="Sun" size={16} />
            <span className="gemba-body">Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Icon name="Moon01" size={16} />
            <span className="gemba-body">Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Icon name="Monitor01" size={16} />
            <span className="gemba-body">System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
