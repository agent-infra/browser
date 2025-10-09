/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import morphdom from 'morphdom';

import { UIBrowser } from '../../src';

const canvasEle = document.getElementById('browserCanvas') as HTMLCanvasElement;
const tabsContainer = document.getElementById(
  'tabsContainer',
) as HTMLDivElement;
const newTabBtn = document.getElementById('newTabBtn') as HTMLButtonElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const forwardBtn = document.getElementById('forwardBtn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const urlBar = document.getElementById('urlBar') as HTMLInputElement;
const loadingIndicator = document.getElementById(
  'loadingIndicator',
) as HTMLDivElement;

const canvasBrowser = await UIBrowser.create(canvasEle, {
  // @ts-ignore
  browserWSEndpoint: import.meta.WSEndpoint,
  defaultViewport: {
    width: 900,
    height: 900,
  },
});

const tabs = canvasBrowser.tabs;

// 初始化：创建第一个 tab
function createTabElement(tabMeta: any, isActive: boolean): HTMLDivElement {
  // console.log('tabMeta', tabMeta);

  const tabElement = document.createElement('div');
  tabElement.className = `tab ${isActive ? 'active' : ''}`;
  tabElement.dataset.tabId = tabMeta.id;

  // 根据加载状态决定显示的图标
  const iconHtml = tabMeta.isLoading
    ? `<div class="tab-loading-icon" data-tab-id="ico-${tabMeta.id}">⟳</div>`
    : `<img class="tab-favicon" data-tab-id="ico-${tabMeta.id}" src="${tabMeta.favicon}" />`;

  tabElement.innerHTML = `
    ${iconHtml}
    <span class="tab-title" data-tab-id="title-${tabMeta.id}">${tabMeta.title}</span>
    <button class="tab-close" data-tab-id="close-${tabMeta.id}">X</button>
  `;

  return tabElement;
}

function renderTabs() {
  const snapshot = tabs.getSnapshot();

  // console.log('Rendering tabs:', snapshot);

  const targetContainer = document.createElement('div');
  targetContainer.className = tabsContainer.className;
  targetContainer.id = tabsContainer.id;

  snapshot.tabs.forEach((tabMeta, tabId: string) => {
    const isActive = snapshot.activeTabId === tabMeta.id;
    const tabElement = createTabElement(tabMeta, isActive);
    targetContainer.appendChild(tabElement);
  });

  morphdom(tabsContainer, targetContainer, {
    childrenOnly: true, // the targetContainer element will be skipped
    onBeforeElUpdated: function (fromEl, toEl) {
      // fast diff: https://github.com/patrick-steele-idem/morphdom/?tab=readme-ov-file#can-i-make-morphdom-blaze-through-the-dom-tree-even-faster-yes
      if (fromEl.isEqualNode(toEl)) {
        return false;
      }
      return true;
    },
    getNodeKey: (node) => {
      if (node.nodeType === 1 && (node as Element).classList.contains('tab')) {
        return (node as Element).getAttribute('data-tab-id');
      }

      if (node) {
        return (
          (node as Element).getAttribute && (node as Element).getAttribute('id')
        );
      }
    },
  });

  updateControls();
}

tabsContainer.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const tabElement = target.closest('.tab') as HTMLDivElement;

  if (!tabElement) return;

  const tabId = tabElement.dataset.tabId;
  if (!tabId) return;

  if (target.classList.contains('tab-close')) {
    // 关闭 tab
    e.stopPropagation();
    await tabs.closeTab(tabId);
  } else {
    // 切换 tab
    await tabs.activeTab(tabId);
    updateControls();
  }
});

// 更新控制按钮状态
function updateControls() {
  const currentUrl = tabs.getCurrentUrl();
  urlBar.value = currentUrl;

  // 这里可以根据实际情况更新前进后退按钮的状态
  // backBtn.disabled = !canGoBack;
  // forwardBtn.disabled = !canGoForward;
}

// 订阅 tabs 状态变化
tabs.subscribe(() => {
  renderTabs();
});

// 新建 tab
newTabBtn.addEventListener('click', async () => {
  await tabs.createTab();
});

// 后退
backBtn.addEventListener('click', async () => {
  await tabs.goBack();
});

// 前进
forwardBtn.addEventListener('click', async () => {
  await tabs.goForward();
});

// 刷新
refreshBtn.addEventListener('click', async () => {
  await tabs.reload();
});

// URL 输入框回车导航
urlBar.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const url = urlBar.value.trim();
    if (url) {
      // 简单的 URL 处理
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          finalUrl = `https://${url}`;
        } else {
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
      }
      await tabs.navigate(finalUrl);
    }
  }
});

// 初始渲染
renderTabs();

// 清理资源
window.addEventListener('beforeunload', async () => {
  // await canvasBrowser.destroy();
});
