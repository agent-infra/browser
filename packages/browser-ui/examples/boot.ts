/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs/promises';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

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
      '--mute-audio',
      '--no-default-browser-check',
      '--window-size=900,990',
      '--remote-allow-origins=http://127.0.0.1:3000',
      'https://www.bytedance.com/en/',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const wsEndpoint = browser.wsEndpoint();

  console.log('✅ launched successfully!');
  console.log('📡 CDP WebSocket:', wsEndpoint);

  let outPath: string;
  try {
    outPath = path.join(__dirname, '.env');
    await fs.writeFile(
      outPath,
      `WSEndpoint=${JSON.stringify(wsEndpoint)}`,
      'utf-8',
    );
  } catch (err) {
    outPath = '';
    console.error('⚠️ Failed to write .env', err);
  }

  console.log('🔄 start web dev server...');
  const child: ChildProcess = spawn(
    'rsbuild',
    ['dev', '--env-dir', __dirname],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  const cleanup = async () => {
    try {
      console.log('\n🛑 closing child process and browser...');
      if (child && !child.killed) {
        try {
          child.kill();
        } catch (e) {
          /* ignore */
        }
      }
      if (browser) {
        await browser.close();
      }
    } catch (e) {
      // ignore
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('exit', async (code) => {
    console.log(`demo:core exited with code ${code}`);
    try {
      await browser.close();
    } catch (e) {
      // ignore
    } finally {
      process.exit(code ?? 0);
    }
  });

  console.log('🔄 Ctrl+C to exit...\n');
}

main().catch(console.error);
