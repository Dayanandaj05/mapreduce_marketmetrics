const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:5173');
  
  // Wait for initial load
  await page.waitForTimeout(2000);
  
  console.log("Capturing idle dashboard...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_idle_dashboard.png') });
  
  console.log("Triggering run...");
  await page.click('button:has-text("Run New Analysis")');
  
  console.log("Waiting for completion (could take 20s)...");
  await page.waitForFunction(() => document.body.innerText.includes('TERMINATED'), undefined, { timeout: 60000 });
  
  console.log("Capturing completed results...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_completed_results.png') });
  
  // Mobile screenshot of complete results
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173');
  await mobilePage.waitForTimeout(2000);
  console.log("Capturing mobile dashboard...");
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '05_mobile_dashboard.png'), fullPage: true });

  await browser.close();
  console.log("All screenshots captured in /docs/screenshots/");
})();
