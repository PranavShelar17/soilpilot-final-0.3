import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Rutuja/.gemini/antigravity/brain/e4eb20c6-cc56-4787-b96f-065cc083c7d5';
const htmlPath = path.join(ARTIFACT_DIR, 'SoilPilot_Scientific_Technical_Report.html').replace(/\\/g, '/');
const pdfPath = path.join(ARTIFACT_DIR, 'SoilPilot_Scientific_Technical_Report.pdf');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const userDataDir = 'C:/Users/Rutuja/AppData/Local/Temp/chrome_pdf_' + Date.now();

async function main() {
  console.log('Launching headless Chrome on port 9235...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    'about:blank'
  ], { detached: true, stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9235/json/list');
      const list = await res.json();
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch (e) {}
  }

  if (!target) {
    console.error('Failed to connect to Chrome');
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

  const fileUrl = 'file:///' + htmlPath;
  console.log('Navigating to', fileUrl);
  await send('Page.navigate', { url: fileUrl });

  // Wait for KaTeX and Mermaid to fully execute
  console.log('Waiting for math and diagrams to render...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('Printing to PDF...');
  const printOptions = {
    landscape: false,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8pt; color: #6b7280; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; font-family: sans-serif;">
        <span>SoilPilot Technical Report | Malegaon Khurd DSM</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    printBackground: true,
    paperWidth: 8.27, // A4
    paperHeight: 11.69,
    marginTop: 0.6,
    marginBottom: 0.7,
    marginLeft: 0.6,
    marginRight: 0.6,
    preferCSSPageSize: true
  };

  const pdfResult = await send('Page.printToPDF', printOptions);
  if (pdfResult && pdfResult.data) {
    fs.writeFileSync(pdfPath, Buffer.from(pdfResult.data, 'base64'));
    const stats = fs.statSync(pdfPath);
    console.log(`Successfully generated PDF: ${pdfPath} (${stats.size} bytes)`);
  } else {
    console.error('Page.printToPDF did not return data');
  }

  try { ws.close(); } catch (e) {}
  try { chrome.kill(); } catch (e) {}
  process.exit(0);
}

main().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
