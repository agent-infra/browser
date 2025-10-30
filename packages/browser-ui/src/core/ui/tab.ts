/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { TabMeta, TabEventDetail } from '../../types';

@customElement('ai-browser-tab')
export class TabComponent extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: flex;
      flex: 1;
      flex-shrink: 0;
      align-items: center;
      box-sizing: border-box;
      height: 28px;
      min-width: 30px;
      max-width: 220px;
      padding: 0 6px;
      border-radius: 8px;
      background-color: #e3e3e3;
      cursor: pointer;
    }

    :host(:hover) {
      background-color: #c7c7c7;
    }

    :host(:hover.active) {
      background-color: #ffffff;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
      cursor: not-allowed;
    }

    :host(.active) {
      background-color: #ffffff;
      border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 0 0 #fff;
    }

    .tab-favicon {
      width: 16px;
      height: 16px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .tab-loading-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      animation: spin 1s linear infinite;
      font-size: 14px;
      text-align: center;
      line-height: 16px;
    }

    .tab-favicon-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #5f6368;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .tab-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }

    .tab-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-left: 8px;
      border: none;
      background: none;
      border-radius: 8px;
      padding: 0;
      cursor: pointer;
    }

    :host(.active) .tab-close:hover {
      background-color: #dbdbdc;
    }

    .tab-close:hover {
      background-color: #acacac;
    }

    .tab-close svg {
      pointer-events: none;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: Object })
  tab!: TabMeta;

  @property({ type: Boolean })
  isActive = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  #renderFavicon() {
    if (this.tab.isLoading) {
      return html`
        <div class="tab-loading-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </div>
      `;
    }

    if (this.tab.favicon) {
      return html` <img class="tab-favicon" src="${this.tab.favicon}" /> `;
    }

    return html`
      <div class="tab-favicon-fallback">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
          />
        </svg>
      </div>
    `;
  }

  render() {
    return html`
      ${this.#renderFavicon()}
      <span class="tab-title">${this.tab.title}</span>
      <button class="tab-close" @click=${this.#handleCloseClick} @click.stop>
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
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    `;
  }

  #handleActivateClick() {
    this.dispatchEvent(
      new CustomEvent<TabEventDetail>('tab-activate', {
        detail: { tabId: this.tab.id },
        bubbles: true,
      }),
    );
  }

  #handleCloseClick(event: Event) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<TabEventDetail>('tab-close', {
        detail: { tabId: this.tab.id },
        bubbles: true,
      }),
    );
  }

  // Handle click on the tab itself (not the close button)
  firstUpdated() {
    this.addEventListener('click', this.#handleActivateClick);
    this.classList.toggle('active', this.isActive);
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('isActive')) {
      this.classList.toggle('active', this.isActive);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-tab': TabComponent;
  }
}
