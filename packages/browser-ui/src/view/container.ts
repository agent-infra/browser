/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { getCdpMouseButton } from '../utils';
import './clipboard';

import type {
  TabMeta,
  DialogMeta,
  MouseEventType,
  KeyboardEventType,
  MouseDetail,
  KeyboardDetail,
  WheelDetail,
  ClipboardDetail,
  DialogAcceptEventDetail,
} from '../types';

@customElement('ai-browser-container')
export class BrowserContainer extends LitElement {
  static styles = css`
    :host {
      position: relative;
      display: block;
      overflow: hidden;
      margin: 0 auto;
      border: 0;
      border-radius: 8px;
    }

    @media (min-resolution: 2dppx) {
      :host {
        border: 0.5px solid #a8a8a8;
      }
    }

    .canvas-container {
      position: relative;
      background-color: #fff;
    }

    canvas {
      display: block;
    }
    canvas:focus {
      outline: none;
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

  @property({ type: Object })
  defaultViewport = { width: 1280, height: 1024 };

  #canvas: HTMLCanvasElement | null = null;

  render() {
    return html`
      <ai-browser-tab-bar
        .tabs=${this.tabs}
        .activeTabId=${this.activeTabId}
        .disabled=${!!this.dialog}
      ></ai-browser-tab-bar>

      <ai-browser-controls-bar
        .currentUrl=${this.currentUrl}
        .canGoBack=${this.canGoBack}
        .canGoForward=${this.canGoForward}
      ></ai-browser-controls-bar>

      <div class="canvas-container">
        <canvas
          tabindex=${99}
          width=${this.defaultViewport.width}
          height=${this.defaultViewport.height}
        ></canvas>
        <ai-browser-dialog
          .dialog=${this.dialog}
          .visible=${!!this.dialog}
          @dialog-accept=${this.#handleDialogAccept}
          @dialog-dismiss=${this.#handleDialogDismiss}
        ></ai-browser-dialog>

        <ai-browser-clipboard
          @clipboard-change=${this.#handleClipboardChange}
        ></ai-browser-clipboard>
      </div>
    `;
  }

  #handleDialogAccept(event: CustomEvent<DialogAcceptEventDetail>) {
    this.dispatchEvent(
      new CustomEvent<DialogAcceptEventDetail>('dialog-accept', {
        detail: { inputValue: event.detail.inputValue },
      }),
    );
  }

  #handleDialogDismiss() {
    this.dispatchEvent(new CustomEvent('dialog-dismiss'));
  }

  #handleClipboardChange(event: CustomEvent<ClipboardDetail>) {
    this.dispatchEvent(
      new CustomEvent<ClipboardDetail>('clipboard-change', {
        detail: { content: event.detail.content },
      }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    // Wait for the component to be fully rendered
    setTimeout(() => {
      this.#canvas = this.shadowRoot?.querySelector('canvas') || null;
      this.#setupCanvasEvents();
    }, 0);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#cleanupCanvasEvents();
    this.#canvas = null;
  }

  getCanvas() {
    return this.#canvas;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  updateTabs(tabs: TabMeta[], activeTabId?: string) {
    this.tabs = tabs;
    if (activeTabId) {
      this.activeTabId = activeTabId;
    }
  }

  updateNavigation(url: string, canGoBack = true, canGoForward = true) {
    this.currentUrl = url;
    this.canGoBack = canGoBack;
    this.canGoForward = canGoForward;
  }

  showDialog(dialog: DialogMeta) {
    this.dialog = dialog;
  }

  hideDialog() {
    this.dialog = undefined;
  }

  #setupCanvasEvents() {
    const canvas = this.#canvas;
    if (!canvas) return;

    canvas.addEventListener('mousemove', this.#handleMouse);
    canvas.addEventListener('mousedown', this.#handleMouse);
    canvas.addEventListener('mouseup', this.#handleMouse);

    // Auto-focus events
    canvas.addEventListener('mouseenter', this.#handleMouseEnter);
    canvas.addEventListener('mouseleave', this.#handleMouseLeave);

    canvas.addEventListener('wheel', this.#handleWheel);

    canvas.addEventListener('keydown', this.#handleKeyboard);
    canvas.addEventListener('keyup', this.#handleKeyboard);
  }

  #cleanupCanvasEvents() {
    const canvas = this.#canvas;
    if (!canvas) return;

    canvas.removeEventListener('mousemove', this.#handleMouse);
    canvas.removeEventListener('mousedown', this.#handleMouse);
    canvas.removeEventListener('mouseup', this.#handleMouse);

    // Auto-focus events
    canvas.removeEventListener('mouseenter', this.#handleMouseEnter);
    canvas.removeEventListener('mouseleave', this.#handleMouseLeave);

    canvas.removeEventListener('wheel', this.#handleWheel);

    canvas.removeEventListener('keydown', this.#handleKeyboard);
    canvas.removeEventListener('keyup', this.#handleKeyboard);
  }

  #handleMouse = (event: MouseEvent) => {
    const canvas = this.#canvas;
    if (!canvas) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.dispatchEvent(
      new CustomEvent<MouseDetail>('canvas-mouse-event', {
        detail: {
          type: event.type as MouseEventType,
          x,
          y,
          button: getCdpMouseButton(event.button),
        },
      }),
    );
  };

  #handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.dispatchEvent(
      new CustomEvent<WheelDetail>('canvas-wheel-event', {
        detail: {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
        },
      }),
    );
  };

  #handleKeyboard = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    this.dispatchEvent(
      new CustomEvent<KeyboardDetail>('canvas-keyboard-event', {
        detail: {
          type: event.type as KeyboardEventType,
          key: event.key,
          code: event.code,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
      }),
    );
  };

  #handleMouseEnter = () => {
    this.#canvas?.focus({ preventScroll: true });
  };

  #handleMouseLeave = () => {
    this.#canvas?.blur();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-container': BrowserContainer;
  }
}
