/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';

import type { ClipboardDetail } from '../../types';

@customElement('ai-browser-clipboard')
export class ClipboardWidget extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      z-index: 2;
    }

    .widget-container {
      display: flex;
      align-items: center;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      background: white;
      border: 1px solid #a8a8a8;
      border-left: none;
      border-radius: 0 8px 8px 0;
      box-shadow:
        4px 0 6px -1px rgb(0 0 0 / 0.1),
        2px 0 4px -2px rgb(0 0 0 / 0.1);
      transform: translateX(-200px);
    }

    @media (min-resolution: 2dppx) {
      .widget-container {
        border: 0.5px solid #a8a8a8;
        border-left: none;
      }
    }

    .widget-container.expanded {
      transform: translateX(0);
    }

    .widget-container:hover {
      box-shadow:
        10px 0 15px -3px rgb(0 0 0 / 0.1),
        4px 0 6px -4px rgb(0 0 0 / 0.1);
    }

    .widget-content {
      box-sizing: border-box;
      width: 200px;
      height: 80px;
      padding: 4px 0 4px 10px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .widget-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 24px;
      height: 80px;
      border-radius: 0 8px 8px 0;
      cursor: pointer;
    }

    .widget-toggle:hover svg {
      width: 16px;
      height: 16px;
    }

    .widget-toggle svg {
      transition: transform 0.3s ease;
    }

    .widget-toggle.collapsed svg {
      transform: rotate(0deg);
    }

    .widget-toggle.expanded svg {
      transform: rotate(180deg);
    }

    .widget-title {
      font-size: 10px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0px 0 4px 0;
    }

    .clipboard-input {
      box-sizing: border-box;
      width: 100%;
      height: 52px;
      padding: 4px;
      border: 1px solid #e1e3e1;
      border-radius: 6px;
      font-size: 10px;
      resize: none;
      outline: none;
      background-color: #fafafa;
    }

    .clipboard-input:focus {
      border-color: #3265cb;
      background-color: white;
    }
  `;

  @property({ type: Boolean })
  expanded = false;

  @property({ type: String })
  clipboardContent = '';

  #inputRef: HTMLTextAreaElement | null = null;

  render() {
    return html`
      <div class="widget-container ${this.expanded ? 'expanded' : ''}">
        <div class="widget-content">
          <h3 class="widget-title">Clipboard</h3>
          <textarea
            class="clipboard-input"
            .value=${this.clipboardContent}
            @input=${this.#handleInputChange}
            placeholder="Enter text..."
            ${ref(this.#inputRefCallback)}
          ></textarea>
        </div>
        <div
          class="widget-toggle ${this.expanded ? 'expanded' : 'collapsed'}"
          @click=${this.#toggleWidget}
          title="Clipboard Manager"
        >
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
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </div>
    `;
  }

  #inputRefCallback = (el: Element | undefined) => {
    this.#inputRef = el as HTMLTextAreaElement | null;
  };

  #toggleWidget() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      // Focus input when expanded
      setTimeout(() => {
        this.#inputRef?.focus();
      }, 10);
    }
  }

  #handleInputChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.clipboardContent = target.value;

    this.dispatchEvent(
      new CustomEvent<ClipboardDetail>('clipboard-change', {
        detail: { content: this.clipboardContent },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-clipboard': ClipboardWidget;
  }
}
