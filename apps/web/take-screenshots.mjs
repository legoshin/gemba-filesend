import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
const BASE = 'http://localhost:3099';
const OUT = '/home/user/ffsend-web/screenshots';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const pages = [
    { name: 'landing-light', url: '/', theme: 'light', viewport: { width: 1440, height: 900 } },
    { name: 'landing-light-full', url: '/', theme: 'light', viewport: { width: 1440, height: 900 }, fullPage: true },
    { name: 'landing-dark-full', url: '/', theme: 'dark', viewport: { width: 1440, height: 900 }, fullPage: true },
    { name: 'landing-mobile', url: '/', theme: 'light', viewport: { width: 390, height: 844 }, fullPage: true },
    { name: 'upload-light', url: '/upload', theme: 'light', viewport: { width: 1440, height: 900 } },
    { name: 'upload-dark', url: '/upload', theme: 'dark', viewport: { width: 1440, height: 900 } },
    { name: 'download-light', url: '/download', theme: 'light', viewport: { width: 1440, height: 900 } },
    { name: 'download-dark', url: '/download', theme: 'dark', viewport: { width: 1440, height: 900 } },
  ];

  for (const cfg of pages) {
    const page = await browser.newPage();
    await page.setViewport(cfg.viewport);

    // Set theme via cookie/class before navigating
    await page.goto(cfg.url.startsWith('http') ? cfg.url : `${BASE}${cfg.url}`, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    });

    // Apply theme
    if (cfg.theme === 'dark') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      });
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      });
    }

    // Small delay for styles to apply
    await new Promise(r => setTimeout(r, 500));

    await page.screenshot({
      path: `${OUT}/${cfg.name}.png`,
      fullPage: cfg.fullPage || false,
    });

    console.log(`Captured: ${cfg.name}.png`);
    await page.close();
  }

  await browser.close();
  console.log('All screenshots captured!');
}

run().catch(console.error);
