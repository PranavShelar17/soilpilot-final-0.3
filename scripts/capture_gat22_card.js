const puppeteer = require('../frontend/node_modules/puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Rutuja/.gemini/antigravity/brain/e4eb20c6-cc56-4787-b96f-065cc083c7d5';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });

  console.log('Navigating to /soil-health-card?gat=22...');
  await page.goto('http://localhost:3000/soil-health-card?gat=22', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4000));

  const screenshotPath = path.join(ARTIFACT_DIR, 'soil_health_card_gat_22_dsm.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to', screenshotPath);

  await browser.close();
})();
