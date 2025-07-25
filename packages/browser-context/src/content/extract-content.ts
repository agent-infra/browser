/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Page } from 'puppeteer-core';
import { Defuddle, DefuddleOptions } from 'defuddle/node';
import { READABILITY_SCRIPT } from './readability-script.js';
import { toMarkdown } from './to-markdown.js';

export const extractWithReadability = async (
  page: Page,
  options: {
    markdown?: boolean;
  } = {},
): Promise<{ title: string; content: string }> => {
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
    };
  }, READABILITY_SCRIPT);

  return options?.markdown
    ? {
        title: extractionResult.title,
        content: toMarkdown(extractionResult.content),
      }
    : extractionResult;
};

export const extractWithDefuddle = async (
  html: string,
  url: string,
  options: DefuddleOptions,
): Promise<{ title: string; content: string }> => {
  const { title, content } = await Defuddle(html, url, options);

  return {
    title,
    content,
  };
};

/**
 * Extract content from a page using Defuddle or Readability
 * page html -> markdown
 * @param page - The page to extract content from
 * @returns The title and content of the page
 */
export const extractContent = async (
  page: Page,
): Promise<{ title: string; content: string }> => {
  const pageSourceHTML = await page.content();

  try {
    return await extractWithDefuddle(pageSourceHTML, page.url(), {
      markdown: true,
    });
  } catch (e) {
    return await extractWithReadability(page as any, {
      markdown: true,
    });
  }
};
