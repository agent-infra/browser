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

// Dialog elements
const dialogContainer = document.getElementById('dialogContainer') as HTMLDivElement;
const dialogTitle = document.getElementById('dialogTitle') as HTMLSpanElement;
const dialogMessage = document.getElementById('dialogMessage') as HTMLParagraphElement;
const dialogInput = document.getElementById('dialogInput') as HTMLInputElement;
const dialogAccept = document.getElementById('dialogAccept') as HTMLButtonElement;
const dialogDismiss = document.getElementById('dialogDismiss') as HTMLButtonElement;

const canvasBrowser = await UIBrowser.create(canvasEle, {
  // @ts-ignore
  browserWSEndpoint: import.meta.WSEndpoint,
  defaultViewport: {
    width: 900,
    height: 900,
  },
});

const tabs = canvasBrowser.tabs;

// Dialog state
let currentDialogTabId: string | null = null;

// Dialog functions
function showDialog(tabId: string, dialogMeta: any) {
  currentDialogTabId = tabId;

  // Set dialog title based on type
  const titles = {
    alert: 'Alert',
    confirm: 'Confirm',
    prompt: 'Prompt',
    beforeunload: 'Confirm Leave'
  };

  // @ts-ignore
  dialogTitle.textContent = titles[dialogMeta.type] || 'Dialog';
  dialogMessage.textContent = dialogMeta.message;

  // Show/hide input based on dialog type
  if (dialogMeta.type === 'prompt') {
    dialogInput.style.display = 'block';
    dialogInput.value = dialogMeta.defaultValue || '';
    dialogInput.focus();
  } else {
    dialogInput.style.display = 'none';
  }

  dialogContainer.style.display = 'flex';
}

function hideDialog() {
  dialogContainer.style.display = 'none';
  currentDialogTabId = null;
  dialogInput.value = '';
}

async function handleDialogAccept() {
  const activeTab = tabs.getActiveTab();
  if (!activeTab || !activeTab.dialog.isOpen) return;

  const promptText = dialogInput.style.display !== 'none' ? dialogInput.value : undefined;
  const success = await activeTab.dialog.accept(promptText);

  if (success) {
    hideDialog();
  }
}

async function handleDialogDismiss() {
  const activeTab = tabs.getActiveTab();
  if (!activeTab || !activeTab.dialog.isOpen) return;

  const success = await activeTab.dialog.dismiss();

  if (success) {
    hideDialog();
  }
}

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
  updateDialog();
});

// 更新对话框显示
function updateDialog() {
  const snapshot = tabs.getSnapshot();
  const activeTabId = snapshot.activeTabId;

  if (!activeTabId) {
    hideDialog();
    return;
  }

  const activeTab = snapshot.tabs.get(activeTabId);
  if (!activeTab) {
    hideDialog();
    return;
  }

  if (activeTab.dialog) {
    showDialog(activeTabId, activeTab.dialog);
  } else {
    hideDialog();
  }
}

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

// Dialog 事件监听
dialogAccept.addEventListener('click', handleDialogAccept);
dialogDismiss.addEventListener('click', handleDialogDismiss);

// 支持 Enter 键确认对话框
dialogInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleDialogAccept();
  }
});

// 支持 Escape 键取消对话框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dialogContainer.style.display !== 'none') {
    handleDialogDismiss();
  }
});

// 初始渲染
renderTabs();

// 清理资源
window.addEventListener('beforeunload', async () => {
  // await canvasBrowser.destroy();
});
