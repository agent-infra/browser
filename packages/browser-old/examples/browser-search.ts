/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { LocalBrowser } from '../src';

function getSearchUrl(query: string) {
  const searchParams = new URLSearchParams({
    q: query,
    num: '10',
    udm: '14',
  });
  return `https://www.google.com/search?${searchParams.toString()}`;
}

async function main() {
  const url = getSearchUrl('ui-tars');
  const browser = new LocalBrowser();

  try {
    // 1. Launch browser
    await browser.launch({ headless: false });

    // 2. Get search links
    const links = await browser.evaluateOnNewPage({
      url,
      pageFunction: () => {
        const results = Array.from(document.querySelectorAll('a'));
        return results
          .map((link) => ({
            href: link.href,
            text: link.textContent?.trim() || '',
          }))
          .filter(
            (item) =>
              item.href &&
              !item.href.includes('google') &&
              !item.href.startsWith('javascript:'),
          );
      },
      pageFunctionParams: [],
    });

    if (!links?.length) {
      console.log('No search results found');
      return;
    }

    console.log('Found links:', links);

    // 3. Visit first link and extract content
    const firstLink = links[0];

    console.log('Navigate to:', firstLink.href);

    // 4. Extract content
    const result = await browser.evaluateOnNewPage({
      url: firstLink.href,
      pageFunction: (window, readabilityScript) => {
        const Readability = new Function(
          'module',
          `${readabilityScript}\nreturn module.exports`,
        )({});

        // Clean up page
        const document = window.document;
        document
          .querySelectorAll(
            'script,noscript,style,link,svg,img,video,iframe,canvas,.reflist',
          )
          .forEach((el) => el.remove());

        // Parse content
        const article = new Readability(document).parse();
        const content = article?.content || '';
        const title = document.title;
        return { content, title: article?.title || title };
      },
      pageFunctionParams: [READABILITY_SCRIPT],
    });

    console.log('Result:', toMarkdown(result?.content));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
