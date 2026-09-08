"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileTabBar } from "@/components/mobile-tab-bar";

const navLinks = [
  { href: "/", label: "Home", icon: "Home01" },
  { href: "/upload", label: "Upload", icon: "Upload01" },
  { href: "/download", label: "Download", icon: "Download01" },
] as const;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-6 border-b border-[var(--border-default)] bg-card px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* Light-mode logo */}
          <Image
            src="/logo.svg"
            alt="Gemba"
            width={153}
            height={36}
            priority
            className="h-7 w-auto dark:hidden"
          />
          {/* Dark-mode logo */}
          <Image
            src="/logo-dark.svg"
            alt="Gemba"
            width={153}
            height={36}
            priority
            className="hidden h-7 w-auto dark:block"
          />
          <span className="gemba-body-sm text-[var(--text-subdued)]">Filesend</span>
        </Link>

        {/* Desktop top nav (mobile uses the bottom tab bar) */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 ${
                  active
                    ? "gemba-body-strong bg-[var(--surface-subdued)] text-[var(--text-primary)]"
                    : "gemba-body text-[var(--text-primary)] hover:bg-[var(--surface-subdued)]"
                }`}
              >
                <Icon name={link.icon} size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 bg-[var(--surface-page)] pb-16 md:pb-0">{children}</main>

      <MobileTabBar />
    </div>
  );
}
