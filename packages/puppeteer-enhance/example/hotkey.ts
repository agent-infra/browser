/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';
import delay from 'delay';

import { Hotkey, type OSType } from '../src';

async function launchChrome(os: OSType, path: string) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: path,
  });
  const hotkey = new Hotkey({ osName: os, browserName: 'Chrome' });

  const page = await browser.newPage();
  page.goto('https://www.baidu.com');

  await delay(1000);
  await page.keyboard.type('Hello, world!');
  await delay(1000);

  await hotkey.press(page, 'ctrl+a'); // Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+c'); // Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+v'); // Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+v'); // Hello, world!Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+z'); // Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+y'); // Hello, world!Hello, world!
  await delay(1000);
  await hotkey.press(page, 'ctrl+a'); // Hello, world!Hello, world!

  await page.keyboard.press('Backspace'); // delete all

  await delay(3000);
  await browser.close();
}

launchChrome(
  'macOS',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
);
