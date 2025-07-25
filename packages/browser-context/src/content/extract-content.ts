/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page } from 'puppeteer-core';
import { READABILITY_SCRIPT } from './readability-script.js';

export const extractContent = async (page: Page) => {
  // Extract content using Readability algorithm on a document clone to prevent DOM flickering
  const extractionResult = await page.evaluate((readabilityScript) => {
    // Initialize Readability from script
    const Readability = new Function(
      'module',
      `${readabilityScript}\nreturn module.exports`,
    )({});

    // Create a deep clone of the document to avoid modifying the visible DOM
    const documentClone = document.cloneNode(true) as Document;

    // Clean up the cloned document
    documentClone
      .querySelectorAll(
        'script,noscript,style,link,svg,img,video,iframe,canvas,.reflist',
      )
      .forEach((el) => el.remove());

    // Parse content from the clone
    const article = new Readability(documentClone).parse();
    const content = article?.content || '';
    const title = document.title;

    return {
      content,
      title: article?.title || title,
      fullContent: content,
    };
  }, READABILITY_SCRIPT);

  return extractionResult;
};
