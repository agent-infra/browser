/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';

import { getEnvInfo } from '../src';

async function testEnv(path: string) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: path,
    browser: path.toLowerCase().includes('firefox') ? 'firefox' : 'chrome',
  });
  const env = await getEnvInfo(browser);
  console.log(`path:`, path);
  console.log(`envInfo:`, env);
  await browser.close();
}

async function main() {
  testEnv('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  testEnv('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  testEnv('/Applications/Firefox.app/Contents/MacOS/firefox');
}

main();
