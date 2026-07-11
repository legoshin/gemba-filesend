import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gemba Filesend - Secure File Sharing",
  description:
    "Share files securely with end-to-end encryption. Upload, share a link, and your recipient downloads with ease.",
  applicationName: "Gemba Filesend",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Filesend",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Public Sans is loaded via a document-head <link> instead of the
          fonts.css `@import` (design-system/tokens/fonts.css) because
          Turbopack/Lightning CSS silently strips remote @import rules from
          the production build, dropping the webfont in prod even though
          `next dev` renders it correctly. This <link> is independent of
          that CSS pipeline and survives `npm run build`.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this
            rule targets pages-router `_app.js`; here it's the App Router
            root layout, which already applies to every page (equivalent to
            `_document.js`), so the "only loads for a single page" warning
            does not apply. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
        {/*
          Service worker registration. The SW caches the static app shell so
          the PWA passes the installability checks Bubblewrap and Play Store
          look for. Loaded after interactive so it never blocks first paint.
        */}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .catch(() => {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}
