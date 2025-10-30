/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { TabMeta, TabEventDetail } from '../../types';

@customElement('ai-browser-tab-bar')
export class TabBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      height: 36px;
      padding: 4px;
      background-color: #e3e3e3;
      user-select: none;
    }

    .tabs-container {
      display: flex;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .tab-divider {
      flex-shrink: 0;
      align-self: center;
      width: 1px;
      height: 14px;
      background-color: #b0b0b0;
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
      flex-shrink: 0;
      width: 28px;
      min-width: 28px;
      height: 28px;
      padding: 0;
      margin-left: 5px;
      border: none;
      border-radius: 14px;
      background-color: transparent;
      cursor: pointer;
    }

    .new-tab-btn:hover {
      background-color: #c7c7c7;
    }

    :host([disabled]) {
      pointer-events: none;
      opacity: 0.6;
    }
  `;

  static properties = {
    tabs: { type: Array },
    activeTabId: { type: String },
    disabled: { type: Boolean, reflect: true },
  };

  @property({ type: Boolean, reflect: true })
  disabled = false;

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
              .disabled=${this.disabled}
              @tab-activate=${this.#handleTabActivate}
              @tab-close=${this.#handleTabClose}
            ></ai-browser-tab>
            <div class="tab-divider"></div>
          `,
        ])}
      </div>
      <button class="new-tab-btn" @click=${this.#handleNewTab}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
    `;
  }

  #handleTabActivate(event: CustomEvent<TabEventDetail>) {
    this.dispatchEvent(
      new CustomEvent<TabEventDetail>('tab-activate', {
        detail: { tabId: event.detail.tabId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleTabClose(event: CustomEvent<TabEventDetail>) {
    this.dispatchEvent(
      new CustomEvent<TabEventDetail>('tab-close', {
        detail: { tabId: event.detail.tabId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleNewTab() {
    this.dispatchEvent(
      new CustomEvent('new-tab', {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-tab-bar': TabBar;
  }
}
