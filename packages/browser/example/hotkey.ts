/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import puppeteer from 'puppeteer-core';
import delay from 'delay';

import { Keyboard, type OSType } from '../src/index.node';

async function launchChrome(os: OSType, path: string) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: path,
  });

  const page = await browser.newPage();
  page.goto('https://www.baidu.com');
  // @ts-ignore
  const hotkey = new Keyboard(
    page,
    { isOpen: false },
    {
      osName: os,
      browserName: 'Chrome',
      browserVersion: '1',
    },
  );

  await delay(1000);
  await page.keyboard.type('Hello, world!');
  await delay(1000);

  await hotkey.press('ctrl+a'); // Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+c'); // Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+v'); // Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+v'); // Hello, world!Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+z'); // Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+y'); // Hello, world!Hello, world!
  await delay(1000);
  await hotkey.press('ctrl+a'); // Hello, world!Hello, world!

  await page.keyboard.press('Backspace'); // delete all

  await delay(3000);
  await browser.close();
}

launchChrome(
  'macOS',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
);
