// Captures Play Store-ready phone screenshots of the deployed-ish app.
//
// Run with: node scripts/play-screenshots.mjs
// (Requires the dev server running on http://localhost:3000.)
//
// Output: play-screenshots/*.png — portrait, 1080×1920, both themes for
// each top-level route. Phone-format screenshots are the minimum required
// asset type in Play Console.
import puppeteer from "puppeteer-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(import.meta.dirname, "..", "play-screenshots");

// Use a real-phone CSS-pixel width (below Tailwind's md: 768px breakpoint)
// so the mobile layout — hamburger nav, stacked cards — actually renders.
// deviceScaleFactor=3 gives a 1080x2400 output PNG, which sits comfortably
// inside Play Console's 320–3840 range and looks crisp on a phone listing.
const VIEWPORT = {
  width: 360,
  height: 800,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const shots = [
  { name: "01-home-light", url: "/", theme: "light" },
  { name: "02-upload-light", url: "/upload", theme: "light" },
  { name: "03-download-light", url: "/download", theme: "light" },
  { name: "04-home-dark", url: "/", theme: "dark" },
  { name: "05-upload-dark", url: "/upload", theme: "dark" },
  { name: "06-download-dark", url: "/download", theme: "dark" },
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: VIEWPORT,
  });

  try {
    for (const cfg of shots) {
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      // Apply the theme via localStorage so next-themes picks it up on load
      // and the SSR'd <html> class matches the first paint (avoids a flash).
      await page.evaluateOnNewDocument((theme) => {
        try {
          window.localStorage.setItem("theme", theme);
          document.documentElement.classList.add(theme);
          document.documentElement.style.colorScheme = theme;
        } catch {}
      }, cfg.theme);

      await page.goto(`${BASE}${cfg.url}`, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });
      // Hide Next.js dev-mode indicators (the floating "N" pill, build
      // toasts, route announcer) so the screenshots show only product UI.
      await page.addStyleTag({
        content: `
          nextjs-portal,
          [data-nextjs-toast],
          [data-nextjs-dev-tools-button],
          [data-nextjs-router-announcer],
          [data-next-mark] { display: none !important; }
        `,
      });
      // Give animations / theme transition a beat to settle.
      await new Promise((r) => setTimeout(r, 500));

      const buf = await page.screenshot({
        type: "png",
        fullPage: false,
        omitBackground: false,
      });
      await writeFile(path.join(OUT, `${cfg.name}.png`), buf);
      console.log(`✓ ${cfg.name}.png`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("screenshot run failed:", err);
  process.exit(1);
});
