/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

import { TabMeta } from './tab';

@customElement('ai-browser-tab-bar')
export class TabBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      background-color: #e3e3e3;
      user-select: none;
      box-sizing: border-box;
      height: 36px;
      padding: 4px;
    }

    .tabs-container {
      display: flex;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .tab-divider {
      width: 1px;
      height: 14px;
      background-color: #b0b0b0;
      flex-shrink: 0;
      align-self: center;
      transition: background-color 0.15s ease;
    }

    ai-browser-tab.active + .tab-divider {
      background-color: transparent;
    }

    .tab-divider:has(+ ai-browser-tab.active) {
      background: transparent;
    }

    ai-browser-tab:hover + .tab-divider {
      background-color: transparent;
    }

    .tab-divider:has(+ ai-browser-tab:hover) {
      background: transparent;
    }

    .new-tab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      min-width: 28px;
      height: 28px;
      flex-shrink: 0;
      padding: 0;
      border: none;
      border-radius: 14px;
      background-color: transparent;
      margin-left: 5px;
      cursor: pointer;
    }

    .new-tab-btn:hover {
      background-color: #c7c7c7;
    }
  `;

  static properties = {
    tabs: { type: Array },
    activeTabId: { type: String }
  };

  tabs: TabMeta[] = [];
  activeTabId?: string;

  render() {
    return html`
      <div class="tabs-container">
        ${this.tabs.map((tab, index) => [
          html`
            <ai-browser-tab
              .tab=${tab}
              .isActive=${tab.id === this.activeTabId}
              @tab-activate=${this._handleTabActivate}
              @tab-close=${this._handleTabClose}
            ></ai-browser-tab>
          `,
          // Add divider after each tab except the last one
          index < this.tabs.length - 1
            ? html`<div class="tab-divider"></div>`
            : null,
        ])}
      </div>
      <button class="new-tab-btn" @click=${this._handleNewTab}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-tab-bar': TabBar;
  }
}
