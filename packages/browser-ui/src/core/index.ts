/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { UIBrowser } from './model/browser';
import './view';
import { BrowserContainer } from './view';
import { getMacOSHotkey, isPasteHotkey } from './utils';

import type { ConnectOptions, KeyInput } from 'puppeteer-core';
import type {
  ClipboardDetail,
  KeyboardDetail,
  MouseDetail,
  WheelDetail,
  TabEventDetail,
  NavigationEventDetail,
  NavigationActionEventDetail,
  DialogAcceptEventDetail,
} from '../types';

export interface BrowserUIOptions {
  /** Root element to mount the browser UI */
  root: HTMLElement;
  /** Browser connection options */
  browserOptions: ConnectOptions;
}

export class BrowserUI {

  static async create(options: BrowserUIOptions): Promise<BrowserUI> {
    const browserUI =  new BrowserUI(options);
    await browserUI.#init();

    return browserUI;
  }

  #options: BrowserUIOptions;
  #browserContainer?: BrowserContainer;
  #canvasBrowser?: UIBrowser;
  #isInitialized: boolean = false;
  #clipboardContent: string = '';

  constructor(options: BrowserUIOptions) {
    this.#options = options;
  }

  async #init() {
    if (this.#isInitialized) {
      throw new Error('BrowserUI is already initialized');
    }

    const { root, browserOptions } = this.#options;

    // Create browser container element
    this.#browserContainer = document.createElement(
      'ai-browser-container',
    ) as BrowserContainer;
    this.#browserContainer.defaultViewport = browserOptions.defaultViewport || {
      width: 1280,
      height: 1024,
    };
    this.#browserContainer.style.width = `${this.#browserContainer.defaultViewport.width}px`;

    // Clear root and append container
    root.innerHTML = '';
    root.appendChild(this.#browserContainer);

    // Wait for the component to be ready and get the canvas element
    await this.#waitForCanvas();

    const canvasEle = this.#getCanvas();

    // Create canvas browser
    this.#canvasBrowser = await UIBrowser.create(canvasEle, browserOptions);

    // Setup event listeners
    this.#setupEventListeners();

    // Subscribe to tabs state changes
    this.#canvasBrowser.subscribeTabChange(() => {
      this.#updateBrowserContainer();
      this.#updateDialog();
    });

    // Initial update
    this.#updateBrowserContainer();

    this.#isInitialized = true;
  }

  // #region instance getters

  get browser(): UIBrowser {
    if (!this.#canvasBrowser) {
      throw new Error('BrowserUI not initialized');
    }
    return this.#canvasBrowser;
  }

  get container(): BrowserContainer {
    if (!this.#browserContainer) {
      throw new Error('BrowserUI not initialized');
    }
    return this.#browserContainer;
  }

  get isInitialized(): boolean {
    return this.#isInitialized;
  }

  // #endregion

  async destroy(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }

    // Remove event listeners
    this.#removeEventListeners();

    // Disconnect browser
    if (this.#canvasBrowser) {
      await this.#canvasBrowser.disconnect();
    }

    // Clear container
    if (this.#browserContainer && this.#browserContainer.parentNode) {
      this.#browserContainer.parentNode.removeChild(this.#browserContainer);
    }

    this.#isInitialized = false;
  }

  #waitForCanvas(): Promise<void> {
    return new Promise((resolve) => {
      if (this.#browserContainer!.getCanvas()) {
        resolve(void 0);
      } else {
        setTimeout(resolve, 100);
      }
    });
  }

  #getCanvas(): HTMLCanvasElement {
    const canvas = this.#browserContainer!.getCanvas();
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    return canvas;
  }

  // #region event listeners

  #setupEventListeners(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    // Tab events - now bubble up directly from components
    this.#browserContainer.addEventListener(
      'tab-activate',
      this.#handleTabActivate,
    );
    this.#browserContainer.addEventListener('tab-close', this.#handleTabClose);
    this.#browserContainer.addEventListener('new-tab', this.#handleNewTab);

    // Navigation events - now bubble up directly from components
    this.#browserContainer.addEventListener('navigate', this.#handleNavigate);
    this.#browserContainer.addEventListener(
      'navigate-action',
      this.#handleNavigateAction,
    );

    // Dialog events
    this.#browserContainer.addEventListener(
      'dialog-accept',
      this.#handleDialogAccept,
    );
    this.#browserContainer.addEventListener(
      'dialog-dismiss',
      this.#handleDialogDismiss,
    );

    // Canvas events
    this.#browserContainer.addEventListener(
      'canvas-mouse-event',
      this.#handleCanvasMouseEvent,
    );
    this.#browserContainer.addEventListener(
      'canvas-wheel-event',
      this.#handleCanvasWheelEvent,
    );
    this.#browserContainer.addEventListener(
      'canvas-keyboard-event',
      this.#handleCanvasKeyboardEvent,
    );

    // Clipboard events
    this.#browserContainer.addEventListener(
      'clipboard-change',
      this.#handleClipboardChange,
    );
  }

  #removeEventListeners(): void {
    if (!this.#browserContainer) {
      return;
    }

    // Tab events - now bubble up directly from components
    this.#browserContainer.removeEventListener(
      'tab-activate',
      this.#handleTabActivate,
    );
    this.#browserContainer.removeEventListener(
      'tab-close',
      this.#handleTabClose,
    );
    this.#browserContainer.removeEventListener('new-tab', this.#handleNewTab);

    // Navigation events - now bubble up directly from components
    this.#browserContainer.removeEventListener(
      'navigate',
      this.#handleNavigate,
    );
    this.#browserContainer.removeEventListener(
      'navigate-action',
      this.#handleNavigateAction,
    );

    // Dialog events
    this.#browserContainer.removeEventListener(
      'dialog-accept',
      this.#handleDialogAccept,
    );
    this.#browserContainer.removeEventListener(
      'dialog-dismiss',
      this.#handleDialogDismiss,
    );

    // Canvas events
    this.#browserContainer.removeEventListener(
      'canvas-mouse-event',
      this.#handleCanvasMouseEvent,
    );
    this.#browserContainer.removeEventListener(
      'canvas-wheel-event',
      this.#handleCanvasWheelEvent,
    );
    this.#browserContainer.removeEventListener(
      'canvas-keyboard-event',
      this.#handleCanvasKeyboardEvent,
    );

    // Clipboard events
    this.#browserContainer.removeEventListener(
      'clipboard-change',
      this.#handleClipboardChange,
    );
  }

  // #endregion

  // #region tab handlers

  #handleTabActivate = async (e: Event): Promise<void> => {
    e.stopPropagation();

    await this.#canvasBrowser!.activeTab(
      (e as CustomEvent<TabEventDetail>).detail.tabId,
    );
  };

  #handleTabClose = async (e: Event): Promise<void> => {
    e.stopPropagation();

    await this.#canvasBrowser!.closeTab(
      (e as CustomEvent<TabEventDetail>).detail.tabId,
    );
  };

  #handleNewTab = async (e: Event): Promise<void> => {
    e.stopPropagation();

    await this.#canvasBrowser!.createTab();
  };

  // #endregion

  // #region nav handlers

  #handleNavigate = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const url = (e as CustomEvent<NavigationEventDetail>).detail.url;
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        finalUrl = `https://${url}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab) return;
    await activeTab.goto(finalUrl);
  };

  #handleNavigateAction = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab) return;

    const action = (e as CustomEvent<NavigationActionEventDetail>).detail
      .action;
    switch (action) {
      case 'back':
        await activeTab.goBack();
        break;
      case 'forward':
        await activeTab.goForward();
        break;
      case 'refresh':
        await activeTab.reload();
        break;
    }
  };

  // #endregion

  // #region input handlers

  #handleCanvasMouseEvent = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const { type, x, y, button } = (e as CustomEvent<MouseDetail>).detail;

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab) return;

    switch (type) {
      case 'mousemove':
        await activeTab.page.mouse.move(x, y);
        break;
      case 'mousedown':
        await activeTab.page.mouse.down({ button });
        break;
      case 'mouseup':
        await activeTab.page.mouse.up({ button });
        break;
      default:
        break;
    }
  };

  #handleCanvasWheelEvent = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const { deltaX, deltaY } = (e as CustomEvent<WheelDetail>).detail;

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab) return;

    await activeTab.page.mouse.wheel({ deltaX, deltaY });
  };

  #handleCanvasKeyboardEvent = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const detail = (e as CustomEvent<KeyboardDetail>).detail;
    const { type, code } = detail;

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab) return;

    // Handle keyboard events on the page
    switch (type) {
      case 'keydown':
        const os = this.#canvasBrowser!.envInfo.osName;

        // clipboard mock
        if (isPasteHotkey(detail, os) && this.#clipboardContent) {
          await activeTab.page.keyboard.sendCharacter(this.#clipboardContent);
          return;
        }

        // macOS hotkey
        if (os === 'macOS') {
          const hotkey = getMacOSHotkey(detail);
          if (hotkey) {
            await activeTab.page.keyboard.down(hotkey.key, {
              commands: [hotkey.commands],
            });
            return;
          }
        }

        await activeTab.page.keyboard.down(code as KeyInput);
        break;
      case 'keyup':
        await activeTab.page.keyboard.up(code as KeyInput);
        break;
    }
  };

  // #endregion

  // #region widget handlers

  #handleClipboardChange = (e: Event): void => {
    e.stopPropagation();

    this.#clipboardContent =
      (e as CustomEvent<ClipboardDetail>).detail.content || '';
  };

  // #endregion

  // #region dialog handlers

  #handleDialogAccept = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab || !activeTab.dialog.isOpen) return;

    const promptText = (e as CustomEvent<DialogAcceptEventDetail>).detail
      .inputValue;
    const success = await activeTab.dialog.accept(promptText);
    if (success) {
      this.#browserContainer!.hideDialog();
    }
  };

  #handleDialogDismiss = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const activeTab = this.#canvasBrowser!.getActiveTab();
    if (!activeTab || !activeTab.dialog.isOpen) return;

    const success = await activeTab.dialog.dismiss();
    if (success) {
      this.#browserContainer!.hideDialog();
    }
  };

  // #endregion

  // #region update UI

  #updateDialog(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    const snapshot = this.#canvasBrowser.getTabsSnapshot();
    const activeTabId = snapshot.activeTabId;

    if (!activeTabId) {
      this.#browserContainer.hideDialog();
      return;
    }

    const activeTab = snapshot.tabs.get(activeTabId);
    if (!activeTab) {
      this.#browserContainer.hideDialog();
      return;
    }

    if (activeTab.dialog) {
      this.#browserContainer.showDialog(activeTab.dialog);
    } else {
      this.#browserContainer.hideDialog();
    }
  }

  #updateBrowserContainer(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    const snapshot = this.#canvasBrowser.getTabsSnapshot();
    const tabIds = Array.from(snapshot.tabs.keys());
    const tabsData = tabIds
      .map((tabId) => {
        const tabMeta = snapshot.tabs.get(tabId);
        return tabMeta
          ? {
              id: tabId,
              title: tabMeta.title,
              favicon: tabMeta.favicon || undefined,
              isLoading: tabMeta.isLoading,
            }
          : null;
      })
      .filter((tab): tab is NonNullable<typeof tab> => tab !== null);

    const activeTab = snapshot.tabs.get(snapshot.activeTabId || '');
    const currentUrl = activeTab?.url || '';

    this.#browserContainer.updateTabs(
      tabsData,
      snapshot.activeTabId || undefined,
    );
    this.#browserContainer.updateNavigation(currentUrl, true, true); // TODO: Get actual navigation state

    if (activeTab?.isLoading) {
      this.#browserContainer.setLoading(true);
    } else {
      this.#browserContainer.setLoading(false);
    }
  }

  // #endregion
}
