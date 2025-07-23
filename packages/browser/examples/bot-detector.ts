/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LocalBrowser } from '../src';

async function main() {
  const browser = new LocalBrowser();
  await browser.launch({ headless: false });
  const page = await browser.createPage();
  await page.goto('https://bot-detector.rebrowser.net/', {
    waitUntil: 'networkidle2',
  });
  await page.screenshot({ path: 'bot-detector.png' });
  await page.close();
  await browser.close();
}

main();
