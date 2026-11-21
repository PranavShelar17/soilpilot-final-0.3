import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pranav/.gemini/antigravity/brain/8a6f5685-5cbf-434b-83c1-7f890e83d288';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDataDir = 'C:/Users/Pranav/AppData/Local/Temp/chrome_mkt_detail_' + Date.now();

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function main() {
  console.log('Logging into backend for Gat 63...');
  let token = 'mock_token_63';
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/gat-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state_id: 1,
        district_id: 1,
        taluka_id: 6,
        village_id: 87,
        gat_no: '63'
      })
    });
    const data = await res.json();
    if (data.token) {
      token = data.token;
      console.log('Obtained token:', token.substring(0, 20) + '...');
    }
  } catch (err) {
    console.warn('Backend login warning:', err.message);
  }

  console.log('Launching headless Chrome...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9260',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9260/json/list');
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
    height: 1050,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Network.enable');
  await send('Page.enable');
  await send('Runtime.enable');

  await send('Network.setCookie', {
    name: 'soilpilot_session',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: false
  });

  // Navigate to root to set session storage
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('soilpilot_token', '${token}');
      localStorage.setItem('soilpilot_selected_gat', '63');
      localStorage.setItem('soilpilot_language', 'en');
    `
  });

  // 1. Find Crops for My Farm - Overview Cards
  console.log('Capturing Find Crops for My Farm...');
  await send('Page.navigate', { url: 'http://localhost:3000/market-intelligence?tab=find_crops' });
  await new Promise(r => setTimeout(r, 6000));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'market_planner_find_crops.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved market_planner_find_crops.png');

  // Switch to Table View to show the complete economic comparison table
  console.log('Switching to table comparison view...');
  await send('Runtime.evaluate', {
    expression: `
      const tableBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Table'));
      if (tableBtn) tableBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Expand Onion row to show CACP/MPKV cost component percentage breakdown
  console.log('Expanding Onion cost components breakdown...');
  await send('Runtime.evaluate', {
    expression: `
      const expandBtns = document.querySelectorAll('button[title="Toggle breakdown"]');
      if (expandBtns.length > 0) expandBtns[0].click();
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'market_planner_crop_breakdown_expanded.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved market_planner_crop_breakdown_expanded.png');

  // 2. Today's Crop Prices Tab (Pune APMC Gultekdi)
  console.log("Capturing Today's Live Crop Prices tab...");
  await send('Page.navigate', { url: 'http://localhost:3000/market-intelligence?tab=today_prices' });
  await new Promise(r => setTimeout(r, 6000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'market_planner_live_mandi_prices.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved market_planner_live_mandi_prices.png');

  // 3. Plan My Planting Tab (Windows and Duration)
  console.log('Capturing Plan My Planting tab...');
  await send('Page.navigate', { url: 'http://localhost:3000/market-intelligence?tab=plan_planting' });
  await new Promise(r => setTimeout(r, 6000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'market_planner_planting_schedule.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved market_planner_planting_schedule.png');

  ws.close();
  try { chrome.kill(); } catch (e) {}
  console.log('All detailed market planner captures complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
