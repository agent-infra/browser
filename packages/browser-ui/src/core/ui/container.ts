/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TabMeta } from './tab';
import type { DialogMeta } from './dialog';

@customElement('ai-browser-container')
export class BrowserContainer extends LitElement {
  static styles = css`
    :host {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      max-width: 1200px;
      margin: 0 auto;
    }

    .canvas-container {
      background-color: #fff;
      position: relative;
    }

    .loading-indicator {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
    }

    .loading-indicator.visible {
      display: block;
    }

    canvas {
      display: block;
    }
  `;

  @property({ type: Array })
  tabs: TabMeta[] = [];

  @property({ type: String })
  activeTabId?: string;

  @property({ type: String })
  currentUrl = '';

  @property({ type: Boolean })
  canGoBack = false;

  @property({ type: Boolean })
  canGoForward = false;

  @property({ type: Object })
  dialog?: DialogMeta;

  @property({ type: Boolean })
  isLoading = false;

  @property({ attribute: 'canvas-width', type: Number })
  canvasWidth = 900;

  @property({ attribute: 'canvas-height', type: Number })
  canvasHeight = 900;

  render() {
    return html`
      <ai-browser-tab-bar
        .tabs=${this.tabs}
        .activeTabId=${this.activeTabId}
        .disabled=${!!this.dialog}
        @tab-activate=${this._handleTabActivate}
        @tab-close=${this._handleTabClose}
        @new-tab=${this._handleNewTab}
      ></ai-browser-tab-bar>

      <ai-browser-controls-bar
        .currentUrl=${this.currentUrl}
        .canGoBack=${this.canGoBack}
        .canGoForward=${this.canGoForward}
        @navigate=${this._handleNavigate}
        @navigate-action=${this._handleNavigateAction}
      ></ai-browser-controls-bar>

      <div class="canvas-container">
        <canvas
          width=${this.canvasWidth}
          height=${this.canvasHeight}
        ></canvas>
        <div class="loading-indicator ${this.isLoading ? 'visible' : ''}">
          Loading...
        </div>

        <ai-browser-dialog
          .dialog=${this.dialog}
          .visible=${!!this.dialog}
          @dialog-accept=${this._handleDialogAccept}
          @dialog-dismiss=${this._handleDialogDismiss}
        ></ai-browser-dialog>
      </div>
    `;
  }

  private _handleTabActivate(event: CustomEvent<{ tabId: string }>) {
    this.dispatchEvent(new CustomEvent('tab-activate', {
      detail: { tabId: event.detail.tabId }
    }));
  }

  private _handleTabClose(event: CustomEvent<{ tabId: string }>) {
    this.dispatchEvent(new CustomEvent('tab-close', {
      detail: { tabId: event.detail.tabId }
    }));
  }

  private _handleNewTab() {
    this.dispatchEvent(new CustomEvent('new-tab'));
  }

  private _handleNavigate(event: CustomEvent<{ url: string }>) {
    this.dispatchEvent(new CustomEvent('navigate', {
      detail: { url: event.detail.url }
    }));
  }

  private _handleNavigateAction(event: CustomEvent<{ action: string }>) {
    this.dispatchEvent(new CustomEvent('navigate-action', {
      detail: { action: event.detail.action }
    }));
  }

  private _handleDialogAccept(event: CustomEvent<{ inputValue?: string }>) {
    this.dispatchEvent(new CustomEvent('dialog-accept', {
      detail: { inputValue: event.detail.inputValue }
    }));
  }

  private _handleDialogDismiss() {
    this.dispatchEvent(new CustomEvent('dialog-dismiss'));
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.shadowRoot?.querySelector('canvas') || null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Wait for the component to be fully rendered
    setTimeout(() => {
      this._canvasReady = true;
    }, 0);
  }

  @state()
  private _canvasReady = false;

  /**
   * Set loading state
   */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /**
   * Update tabs data
   */
  updateTabs(tabs: TabMeta[], activeTabId?: string) {
    this.tabs = tabs;
    if (activeTabId) {
      this.activeTabId = activeTabId;
    }
  }

  /**
   * Update navigation state
   */
  updateNavigation(url: string, canGoBack: boolean, canGoForward: boolean) {
    this.currentUrl = url;
    this.canGoBack = canGoBack;
    this.canGoForward = canGoForward;
  }

  /**
   * Show dialog
   */
  showDialog(dialog: DialogMeta) {
    this.dialog = dialog;
  }

  /**
   * Hide dialog
   */
  hideDialog() {
    this.dialog = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-container': BrowserContainer;
  }
}