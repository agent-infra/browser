/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { URL, fileURLToPath } from 'url';
import { join, dirname } from 'path';

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

  const port = 3000;
  const server = createServer(async (req, res) => {
    try {
      console.log(`Request: ${req.method} ${req.url}`);

      if (req.url === '/' || req.url === '/index.html') {
        const indexPath = new URL('./index.html', import.meta.url).pathname;
        let html = await readFile(indexPath, 'utf-8');

        // Replace the import.meta.WSEndpoint with the actual wsEndpoint
        html = html.replace(
          'import.meta.WSEndpoint',
          JSON.stringify(wsEndpoint),
        );

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else if (req.url?.startsWith('/dist/')) {
        // Handle static files from /dist/ directory
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const staticPath = join(
          __dirname,
          '..',
          '..',
          'dist',
          req.url.replace('/dist/', ''),
        );

        console.log(`Static file request: ${staticPath}`);

        try {
          const fileStat = await stat(staticPath);
          if (fileStat.isFile()) {
            const content = await readFile(staticPath);
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(content);
            return;
          }
        } catch (staticError) {
          console.error('Static file not found:', staticError);
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Static file not found');
      } else {
        console.log('404 for:', req.url);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${(error as Error).message}`);
    }
  });

  server.listen(port, () => {
    console.log(`🌐 Server running at http://localhost:${port}`);
    console.log('🔄 Ctrl+C to exit...\n');
  });

  const cleanup = async () => {
    try {
      console.log('\n🛑 closing server and browser...');
      if (server) {
        server.close();
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
}

main().catch(console.error);
