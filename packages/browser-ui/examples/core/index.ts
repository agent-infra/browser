import { CanvasBrowser } from '../../src/core/browser';
import type { TabMeta } from '../../src/types/tabs';

const canvasEle = document.getElementById('browserCanvas') as HTMLCanvasElement;
const tabsContainer = document.getElementById('tabsContainer') as HTMLDivElement;
const newTabBtn = document.getElementById('newTabBtn') as HTMLButtonElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const forwardBtn = document.getElementById('forwardBtn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const urlBar = document.getElementById('urlBar') as HTMLInputElement;
const loadingIndicator = document.getElementById('loadingIndicator') as HTMLDivElement;

const ws =
  'ws://127.0.0.1:9222/devtools/browser/018e1933-595a-4916-831e-1221f80a25ca';

const canvasBrowser = await CanvasBrowser.create(canvasEle, {
  wsEndpoint: ws,
});

const tabs = canvasBrowser.tabs;

// 初始化：创建第一个 tab
// await tabs.createTab('https://www.google.com');

// 渲染 tabs UI
function renderTabs() {
  const snapshot = tabs.getSnapshot();
  tabsContainer.innerHTML = '';

  console.log('Rendering tabs:', snapshot);

  snapshot.tabs.forEach((tabMeta: TabMeta) => {
    const tabElement = document.createElement('div');
    const isActive = snapshot.activeTabId === tabMeta.id;
    tabElement.className = `tab ${isActive ? 'active' : ''}`;
    tabElement.dataset.tabId = tabMeta.id;

    tabElement.innerHTML = `
      <img class="tab-favicon" src="${tabMeta.favicon}" />
      <span class="tab-title" title="${tabMeta.title}">${tabMeta.title}</span>
      <button class="tab-close" title="Close tab">×</button>
    `;

    // Tab 点击切换
    tabElement.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).classList.contains('tab-close')) {
        return; // 如果点击的是关闭按钮，不切换 tab
      }
      await tabs.activeTab(tabMeta.id);
      updateControls();
    });

    // Tab 关闭
    const closeBtn = tabElement.querySelector('.tab-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await tabs.closeTab(tabMeta.id);
    });

    tabsContainer.appendChild(tabElement);
  });

  updateControls();
}

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
