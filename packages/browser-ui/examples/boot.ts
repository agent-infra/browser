/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';

async function main() {
  console.log('🚀 launch ...');

  const browser = await puppeteer.launch({
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    defaultViewport: {
      width: 900,
      height: 900,
      deviceScaleFactor: 0,
    },
    args: [
      '--remote-allow-origins=http://127.0.0.1:3000',
      '--window-size=900,980',
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
