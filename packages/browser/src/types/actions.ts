import type { KeyInput, KeyboardTypeOptions } from 'puppeteer-core';
import type { DialogMetaInfo } from './dialog';

export interface KeyboardOptions extends KeyboardTypeOptions {}

export type KeyOrHotKeyInput = KeyInput | string & {};

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Success response for keyboard operations
 */
export interface KeyboardSuccessResponse {
  success: true;
}

/**
 * Error response for keyboard operations when dialog is open
 */
export interface KeyboardErrorResponse {
  success: false;
  message: string;
  detail: DialogMetaInfo;
}

/**
 * Union type for keyboard operation responses
 * Returns only success property when successful, or includes message and detail when failed
 */
export type KeyboardResponse = KeyboardSuccessResponse | KeyboardErrorResponse;