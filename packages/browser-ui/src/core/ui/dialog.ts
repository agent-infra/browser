/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'beforeunload';

export interface DialogMeta {
  type: DialogType;
  message: string;
  defaultValue?: string;
}

@customElement('ai-browser-dialog')
export class DialogComponent extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-box {
      position: relative;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      min-width: 300px;
      max-width: 500px;
      width: 90%;
    }

    .dialog-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      font-weight: 600;
      font-size: 16px;
    }

    .dialog-content {
      padding: 20px;
    }

    .dialog-message {
      margin: 0 0 16px 0;
      color: #333;
      line-height: 1.5;
    }

    .dialog-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .dialog-input:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .dialog-actions {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .dialog-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
      font-size: 14px;
      min-width: 60px;
      cursor: pointer;
    }

    .dialog-btn:hover {
      background-color: #f5f5f5;
    }

    .dialog-btn-accept {
      background-color: #2196f3;
      color: white;
      border-color: #2196f3;
    }

    .dialog-btn-accept:hover {
      background-color: #1976d2;
    }

    .dialog-btn-dismiss {
      background-color: #f5f5f5;
      color: #333;
    }

    .dialog-btn-dismiss:hover {
      background-color: #e0e0e0;
    }
  `;

  @property({ type: Object })
  dialog?: DialogMeta;

  @property({ type: Boolean })
  visible = false;

  @state()
  private _inputValue = '';

  private _getDialogTitle(): string {
    const titles = {
      alert: 'Alert',
      confirm: 'Confirm',
      prompt: 'Prompt',
      beforeunload: 'Confirm Leave'
    };
    return this.dialog ? titles[this.dialog.type] || 'Dialog' : 'Dialog';
  }

  private _handleAccept() {
    const inputValue = this.dialog?.type === 'prompt' ? this._inputValue : undefined;
    this.dispatchEvent(new CustomEvent('dialog-accept', {
      detail: { inputValue }
    }));
  }

  private _handleDismiss() {
    this.dispatchEvent(new CustomEvent('dialog-dismiss'));
  }

  private _handleInputKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this._handleAccept();
    }
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('dialog') && this.dialog?.type === 'prompt') {
      this._inputValue = this.dialog.defaultValue || '';
    }

    if (changedProperties.has('visible') && this.visible) {
      // Focus the input when dialog becomes visible
      setTimeout(() => {
        const input = this.shadowRoot?.querySelector('.dialog-input') as HTMLInputElement;
        if (input && this.dialog?.type === 'prompt') {
          input.focus();
        }
      }, 0);
    }
  }

  render() {
    if (!this.visible || !this.dialog) {
      return html``;
    }

    return html`
      <div class="dialog-overlay">
        <div class="dialog-box" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            ${this._getDialogTitle()}
          </div>
          <div class="dialog-content">
            <p class="dialog-message">${this.dialog.message}</p>
            ${this.dialog.type === 'prompt' ? html`
              <input
                type="text"
                class="dialog-input"
                .value=${this._inputValue}
                @input=${(e: Event) => this._inputValue = (e.target as HTMLInputElement).value}
                @keypress=${this._handleInputKeypress}
                placeholder="Enter value..."
              />
            ` : ''}
          </div>
          <div class="dialog-actions">
            ${this.dialog.type !== 'alert' ? html`
              <button class="dialog-btn dialog-btn-dismiss" @click=${this._handleDismiss}>
                Cancel
              </button>
            ` : ''}
            <button class="dialog-btn dialog-btn-accept" @click=${this._handleAccept}>
              OK
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-browser-dialog': DialogComponent;
  }
}