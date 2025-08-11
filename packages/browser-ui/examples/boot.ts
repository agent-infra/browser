// /examples/simple-cdp-demo.ts
import puppeteer from 'puppeteer-core';

async function main() {
  console.log('🚀 launch ...');

  const browser = await puppeteer.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
      '--disable-web-security', // disable cdp CORS
      '--remote-allow-origins=*',
    ],
  });

  const wsEndpoint = browser.wsEndpoint();

  console.log('✅ launched successfully!');
  console.log('📡 CDP WebSocket:', wsEndpoint);

  console.log('🔄 Ctrl+C to exit...');

  process.on('SIGINT', async () => {
    console.log('\n🛑 close browser...');
    await browser.close();
    process.exit(0);
  });
}

main().catch(console.error);
