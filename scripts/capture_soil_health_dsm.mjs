import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Rutuja/.gemini/antigravity/brain/e4eb20c6-cc56-4787-b96f-065cc083c7d5';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDataDir = 'C:/Users/Rutuja/AppData/Local/Temp/chrome_soil_dsm_' + Date.now();

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function main() {
  console.log('Launching headless Chrome with debugging on port 9230...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9230/json/list');
      const list = await res.json();
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Failed to connect to Chrome debugging target');
    try { chrome.kill(); } catch (e) {}
    process.exit(1);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === id) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });

  // First visit root to initialize storage
  console.log('Navigating to root to seed storage...');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.setItem('soilpilot_selected_gat', '22');
        localStorage.setItem('soilpilot_language', 'en');
      })()
    `
  });

  console.log('Navigating to http://localhost:3000/soil-health-card?gat=22 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/soil-health-card?gat=22' });

  // Poll until table exists
  for (let i = 0; i < 40; i++) {
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('table tbody tr'))`
    });
    if (res && res.result && res.result.value) {
      console.log(`Table found after ${(i + 1) * 500}ms!`);
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1500));

  // Capture Top of Soil Health Card
  let shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'soil_health_card_gat_22_summary.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved soil_health_card_gat_22_summary.png');

  // Scroll down to Parameter Table
  await send('Runtime.evaluate', {
    expression: `window.scrollBy(0, 480);`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Parameter Table
  let shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'soil_health_card_gat_22_table.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Saved soil_health_card_gat_22_table.png');

  // Also capture Gat 100 (Measured field) for comparison
  console.log('Navigating to http://localhost:3000/soil-health-card?gat=100 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/soil-health-card?gat=100' });

  for (let i = 0; i < 40; i++) {
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('table tbody tr'))`
    });
    if (res && res.result && res.result.value) {
      console.log(`Gat 100 table found after ${(i + 1) * 500}ms!`);
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1000));

  await send('Runtime.evaluate', {
    expression: `window.scrollBy(0, 480);`
  });
  await new Promise(r => setTimeout(r, 1000));

  let shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'soil_health_card_gat_100_measured_table.png'), Buffer.from(shot3.data, 'base64'));
  console.log('Saved soil_health_card_gat_100_measured_table.png');

  try { ws.close(); } catch (e) {}
  try { chrome.kill(); } catch (e) {}
  console.log('Completed all captures successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
