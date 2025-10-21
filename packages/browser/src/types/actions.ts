import type { KeyInput, KeyboardTypeOptions } from 'puppeteer-core';

export interface KeyboardOptions extends KeyboardTypeOptions {}

export type KeyOrHotKeyInput = KeyInput | string & {};
