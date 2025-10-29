/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ai-browser-controls-bar')
export class ControlsBar extends LitElement {
  static styles = css`
    :host {
      box-sizing: border-box;
      height: 44px;
      display: flex;
      align-items: center;
      padding: 6px;
      background-color: #ffffff;
      border-bottom: 1px solid #e1e3e1;
      gap: 4px;
    }

    .nav-buttons {
      display: flex;
      gap: 5px;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 16px;
      background-color: transparent;
      cursor: pointer;
    }

    .nav-btn:hover {
      background-color: #f2f2f2;
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .nav-btn:disabled:hover {
      background-color: transparent;
    }

    .url-bar {
      flex: 1;
      height: 32px;
      box-sizing: border-box;
      padding: 8px 12px;
      border: none;
      border-radius: 16px;
      background-color: #efeded;
      font-size: 14px;
      outline: none;
    }

    .url-bar:active {
      background-color: #ffffff;
    }

    .url-bar:focus {
      background-color: #ffffff;
      outline: 1px solid #3265cb;
    }
  `;

  @property({ type: String })
  currentUrl = '';

  @property({ type: Boolean })
  canGoBack = false;

  @property({ type: Boolean })
  canGoForward = false;

  #handleUrlKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const target = event.target as HTMLInputElement;
      const url = target.value.trim();
      if (url) {
        this.dispatchEvent(
          new CustomEvent('navigate', {
            detail: { url },
          }),
        );
      }
    }
  }

  render() {
    return html`
      <div class="nav-buttons">
        <button
          class="nav-btn"
          ?disabled=${!this.canGoBack}
          @click=${() => this.#handleNavigation('back')}
        >
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
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>
        <button
          class="nav-btn"
          ?disabled=${!this.canGoForward}
          @click=${() => this.#handleNavigation('forward')}
        >
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
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <button
          class="nav-btn"
          @click=${() => this.#handleNavigation('refresh')}
        >
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
        </button>
      </div>
      <input
        type="text"
        class="url-bar"
        .value=${this.currentUrl}
        placeholder="Enter URL..."
        @keypress=${this.#handleUrlKeypress}
      />
    `;
  }

  #handleNavigation(action: 'back' | 'forward' | 'refresh') {
    this.dispatchEvent(
      new CustomEvent('navigate-action', {
        detail: { action },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-controls-bar': ControlsBar;
  }
}