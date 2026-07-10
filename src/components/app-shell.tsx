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
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-card md:flex">
        <Link href="/" className="flex items-center gap-2 px-6 py-6">
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

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 ${
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

        <div className="flex items-center justify-between px-6 py-4">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="flex h-16 items-center justify-end border-b border-[var(--border-default)] bg-card px-6">
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 bg-[var(--surface-page)] pb-16 md:pb-0">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
