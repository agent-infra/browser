import type { KeyInput, KeyboardTypeOptions } from 'puppeteer-core';
import type { DialogMetaInfo } from './dialog';

export interface KeyboardOptions extends KeyboardTypeOptions {}

export type KeyOrHotKeyInput = KeyInput | string & {};

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Success response for browser actions (keyboard, mouse, etc.)
 */
export interface ActionSuccessResponse {
  success: true;
}

/**
 * Error response for browser actions when dialog is open
 */
export interface ActionErrorResponse {
  success: false;
  message: string;
  detail: DialogMetaInfo;
}

/**
 * Union type for browser action responses
 * Returns only success property when successful, or includes message and detail when failed
 */
export type ActionResponse = ActionSuccessResponse | ActionErrorResponse;
