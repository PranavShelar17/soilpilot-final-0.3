import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pranav/.gemini/antigravity/brain/8a6f5685-5cbf-434b-83c1-7f890e83d288';
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDataDir = 'C:/Users/Pranav/AppData/Local/Temp/chrome_soil_live_' + Date.now();

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function main() {
  console.log('Logging in to backend for Gat 63...');
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

  console.log('Starting headless Chrome...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9250',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9250/json/list');
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
    height: 980,
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

  // Navigate to root first
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `
      sessionStorage.setItem('soilpilot_token', '${token}');
      localStorage.setItem('soilpilot_selected_gat', '63');
      localStorage.setItem('soilpilot_language', 'en');
    `
  });

  // 1. Reports Page (with matching card and cadre frame)
  console.log('Capturing Reports page (Gat 63)...');
  await send('Page.navigate', { url: 'http://localhost:3000/reports?gat=63' });
  await new Promise(r => setTimeout(r, 5000));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'website_reports_page.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved website_reports_page.png');

  // 2. Market & Crop Planner (APMC rates)
  console.log('Capturing Market & Crop Planner...');
  await send('Page.navigate', { url: 'http://localhost:3000/market-intelligence' });
  await new Promise(r => setTimeout(r, 6000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'website_market_planner.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved website_market_planner.png');

  // 3. Crop Suitability
  console.log('Capturing Crop Suitability...');
  await send('Page.navigate', { url: 'http://localhost:3000/field-suitability' });
  await new Promise(r => setTimeout(r, 6000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'website_crop_suitability.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved website_crop_suitability.png');

  // 4. My Farm (Cadastral Boundary Map)
  console.log('Capturing My Farm...');
  await send('Page.navigate', { url: 'http://localhost:3000/my-farm?gat=63' });
  await new Promise(r => setTimeout(r, 6000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'website_my_farm.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved website_my_farm.png');

  // 5. Soil Health Card
  console.log('Capturing Soil Health Card...');
  await send('Page.navigate', { url: 'http://localhost:3000/soil-health-card?gat=63' });
  await new Promise(r => setTimeout(r, 5000));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'website_soil_health_card.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved website_soil_health_card.png');

  ws.close();
  try { chrome.kill(); } catch (e) {}
  console.log('All live captures complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
