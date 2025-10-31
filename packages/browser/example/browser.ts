/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Browser } from "../src/index.node";

async function main() {
  const browser = await Browser.create({
    headless: false,
  })

  const tab = browser.getActiveTab();

  await tab!.goto('https://bot-detector.rebrowser.net/');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const data = await tab!.screenshot({ path: './example/bot-detector.png', fullPage: true });

  // @ts-ignore
  delete data.data;

  console.log('Screenshot data:', data);

  await browser.close();
}

main();