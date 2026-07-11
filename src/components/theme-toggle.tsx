"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Icon
            name="Sun"
            size={20}
            className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <Icon
            name="Moon01"
            size={20}
            className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Icon name="Sun" size={16} />
          <span className={theme === "light" ? "gemba-body-strong" : "gemba-body"}>
            Light
          </span>
          {theme === "light" && <Icon name="Check" size={16} className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Icon name="Moon01" size={16} />
          <span className={theme === "dark" ? "gemba-body-strong" : "gemba-body"}>
            Dark
          </span>
          {theme === "dark" && <Icon name="Check" size={16} className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Icon name="Monitor01" size={16} />
          <span className={theme === "system" ? "gemba-body-strong" : "gemba-body"}>
            System
          </span>
          {theme === "system" && <Icon name="Check" size={16} className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
