"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

const tabs = [
  { href: "/", label: "Home", icon: "Home01" },
  { href: "/upload", label: "Upload", icon: "Upload01" },
  { href: "/download", label: "Download", icon: "Download01" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch bg-card pb-[env(safe-area-inset-bottom)] shadow-[var(--ring-border)] md:hidden"
      aria-label="Primary"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className={`flex flex-1 flex-col items-center justify-center gap-1 ${
              active ? "text-[var(--text-primary)]" : "text-[var(--text-subdued)]"
            }`}
          >
            <Icon name={tab.icon} size={20} />
            <span className={`gemba-body-sm ${active ? "font-bold" : ""}`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
