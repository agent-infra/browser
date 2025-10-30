/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardDetail, KeyboardDetail, MouseDetail, WheelDetail } from '../types';
import { UIBrowser } from './browser';
import './ui';
import { BrowserContainer } from './ui';
import { getMacOSHotkey, isPasteHotkey } from './utils';

import type { ConnectOptions, KeyInput } from 'puppeteer-core';

export interface BrowserUIOptions {
  /** Root element to mount the browser UI */
  root: HTMLElement;
  /** Browser connection options */
  browserOptions: ConnectOptions;
}

export { UIBrowser } from './browser';

export class BrowserUI {
  #options: BrowserUIOptions;
  #browserContainer?: BrowserContainer;
  #canvasBrowser?: UIBrowser;
  #currentDialogTabId?: string | null;
  #isInitialized: boolean = false;
  #clipboardContent: string = '';

  constructor(options: BrowserUIOptions) {
    this.#options = options;
  }

  /**
   * Initialize the Browser UI
   */
  async init(): Promise<void> {
    if (this.#isInitialized) {
      throw new Error('BrowserUI is already initialized');
    }

    const { root, browserOptions } = this.#options;

    // Create browser container element
    this.#browserContainer = document.createElement('ai-browser-container') as BrowserContainer;
    this.#browserContainer.defaultViewport = browserOptions.defaultViewport || { width: 1280, height: 1024 };
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
    this.#canvasBrowser.tabs.subscribe(() => {
      this.#updateBrowserContainer();
      this.#updateDialog();
    });

    // Setup keyboard shortcuts
    this.#setupKeyboardShortcuts();

    // Initial update
    this.#updateBrowserContainer();

    this.#isInitialized = true;
  }

  /**
   * Get the underlying UIBrowser instance
   */
  get browser(): UIBrowser {
    if (!this.#canvasBrowser) {
      throw new Error('BrowserUI not initialized');
    }
    return this.#canvasBrowser;
  }

  /**
   * Get the browser container element
   */
  get container(): BrowserContainer {
    if (!this.#browserContainer) {
      throw new Error('BrowserUI not initialized');
    }
    return this.#browserContainer;
  }

  /**
   * Check if the BrowserUI is initialized
   */
  get isInitialized(): boolean {
    return this.#isInitialized;
  }

  /**
   * Destroy the Browser UI and clean up resources
   */
  async destroy(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }

    // Remove event listeners
    this.#removeEventListeners();
    this.#removeKeyboardShortcuts();

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
    return new Promise(resolve => {
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

  #setupEventListeners(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    // Tab events
    this.#browserContainer.addEventListener('tab-activate', this.#handleTabActivate);
    this.#browserContainer.addEventListener('tab-close', this.#handleTabClose);
    this.#browserContainer.addEventListener('new-tab', this.#handleNewTab);

    // Navigation events
    this.#browserContainer.addEventListener('navigate', this.#handleNavigate);
    this.#browserContainer.addEventListener('navigate-action', this.#handleNavigateAction);

    // Dialog events
    this.#browserContainer.addEventListener('dialog-accept', this.#handleDialogAccept);
    this.#browserContainer.addEventListener('dialog-dismiss', this.#handleDialogDismiss);

    // Canvas events
    this.#browserContainer.addEventListener('canvas-mouse-event', this.#handleCanvasMouseEvent);
    this.#browserContainer.addEventListener('canvas-wheel-event', this.#handleCanvasWheelEvent);
    this.#browserContainer.addEventListener('canvas-keyboard-event', this.#handleCanvasKeyboardEvent);

    // Clipboard events
    this.#browserContainer.addEventListener('clipboard-change', this.#handleClipboardChange);
  }

  #removeEventListeners(): void {
    if (!this.#browserContainer) {
      return;
    }

    // Tab events
    this.#browserContainer.removeEventListener('tab-activate', this.#handleTabActivate);
    this.#browserContainer.removeEventListener('tab-close', this.#handleTabClose);
    this.#browserContainer.removeEventListener('new-tab', this.#handleNewTab);

    // Navigation events
    this.#browserContainer.removeEventListener('navigate', this.#handleNavigate);
    this.#browserContainer.removeEventListener('navigate-action', this.#handleNavigateAction);

    // Dialog events
    this.#browserContainer.removeEventListener('dialog-accept', this.#handleDialogAccept);
    this.#browserContainer.removeEventListener('dialog-dismiss', this.#handleDialogDismiss);

    // Canvas events
    this.#browserContainer.removeEventListener('canvas-mouse-event', this.#handleCanvasMouseEvent);
    this.#browserContainer.removeEventListener('canvas-wheel-event', this.#handleCanvasWheelEvent);
    this.#browserContainer.removeEventListener('canvas-keyboard-event', this.#handleCanvasKeyboardEvent);

    // Clipboard events
    this.#browserContainer.removeEventListener('clipboard-change', this.#handleClipboardChange);
  }

  #handleTabActivate = async (e: Event): Promise<void> => {
    const customEvent = e as CustomEvent;
    await this.#canvasBrowser!.tabs.activeTab(customEvent.detail.tabId);
  };

  #handleTabClose = async (e: Event): Promise<void> => {
    const customEvent = e as CustomEvent;
    await this.#canvasBrowser!.tabs.closeTab(customEvent.detail.tabId);
  };

  #handleNewTab = async (): Promise<void> => {
    await this.#canvasBrowser!.tabs.createTab();
  };

  #handleNavigate = async (e: Event): Promise<void> => {
    const customEvent = e as CustomEvent;
    const url = customEvent.detail.url;
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        finalUrl = `https://${url}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }
    await this.#canvasBrowser!.tabs.navigate(finalUrl);
  };

  #handleNavigateAction = async (e: Event): Promise<void> => {
    const customEvent = e as CustomEvent;
    const action = customEvent.detail.action;
    const tabs = this.#canvasBrowser!.tabs;

    switch (action) {
      case 'back':
        await tabs.goBack();
        break;
      case 'forward':
        await tabs.goForward();
        break;
      case 'refresh':
        await tabs.reload();
        break;
    }
  };

  #handleDialogAccept = async (e: Event): Promise<void> => {
    const customEvent = e as CustomEvent;
    const activeTab = this.#canvasBrowser!.tabs.getActiveTab();
    if (!activeTab || !activeTab.dialog.isOpen) return;

    const promptText = customEvent.detail.inputValue;
    const success = await activeTab.dialog.accept(promptText);
    if (success) {
      this.#browserContainer!.hideDialog();
    }
  };

  #handleDialogDismiss = async (): Promise<void> => {
    const activeTab = this.#canvasBrowser!.tabs.getActiveTab();
    if (!activeTab || !activeTab.dialog.isOpen) return;

    const success = await activeTab.dialog.dismiss();
    if (success) {
      this.#browserContainer!.hideDialog();
    }
  };

  #handleCanvasMouseEvent = async (e: Event): Promise<void> => {
    const { type, x, y, button } = (e as CustomEvent<MouseDetail>)
      .detail;

    const activeTab = this.#canvasBrowser!.tabs.getActiveTab();
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
    const { deltaX, deltaY } = (e as CustomEvent<WheelDetail>).detail;

    const activeTab = this.#canvasBrowser!.tabs.getActiveTab();
    if (!activeTab) return;
    
    await activeTab.page.mouse.wheel({ deltaX, deltaY });
  }

  #handleCanvasKeyboardEvent = async (e: Event): Promise<void> => {
    const detail = (e as CustomEvent<KeyboardDetail>).detail;
    const { type, code } = detail;

    const activeTab = this.#canvasBrowser!.tabs.getActiveTab();
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
            await activeTab.page.keyboard.down(hotkey.key, { commands: [hotkey.commands] });
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

  #updateBrowserContainer(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    const tabs = this.#canvasBrowser.tabs;
    const snapshot = tabs.getSnapshot();
    const tabIds = Array.from(snapshot.tabs.keys());
    const tabsData = tabIds.map(tabId => {
      const tabMeta = snapshot.tabs.get(tabId);
      return tabMeta ? {
        id: tabId,
        title: tabMeta.title,
        favicon: tabMeta.favicon || undefined,
        isLoading: tabMeta.isLoading,
      } : null;
    }).filter((tab): tab is NonNullable<typeof tab> => tab !== null);

    const activeTab = snapshot.tabs.get(snapshot.activeTabId || '');
    const currentUrl = tabs.getCurrentUrl();

    this.#browserContainer.updateTabs(tabsData, snapshot.activeTabId || undefined);
    this.#browserContainer.updateNavigation(currentUrl, true, true); // TODO: Get actual navigation state

    if (activeTab?.isLoading) {
      this.#browserContainer.setLoading(true);
    } else {
      this.#browserContainer.setLoading(false);
    }
  }

  #updateDialog(): void {
    if (!this.#browserContainer || !this.#canvasBrowser) {
      return;
    }

    const snapshot = this.#canvasBrowser.tabs.getSnapshot();
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
      this.#currentDialogTabId = activeTabId;
      this.#browserContainer.showDialog(activeTab.dialog);
    } else {
      this.#browserContainer.hideDialog();
    }
  }

  #setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.#handleKeyDown);
  }

  #removeKeyboardShortcuts(): void {
    document.removeEventListener('keydown', this.#handleKeyDown);
  }

  #handleClipboardChange = (e: Event): void => {
    this.#clipboardContent =
      (e as CustomEvent<ClipboardDetail>).detail.content || '';
  };

  #handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.#browserContainer?.dialog) {
      this.#browserContainer.dispatchEvent(new CustomEvent('dialog-dismiss'));
    }
  };
}
