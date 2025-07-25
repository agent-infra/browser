import { isMacOS } from '../utils/os';

import type { KeyInput } from 'puppeteer-core';

// 模型主动给出 hotkey 组合时，才会默认走 ControlOrMeta 的适配逻辑
// 如果是用户主动输入的修饰符（特征为 keyboard event 在时间上一个一个的触发），则不做主动的适配，防止适配出问题
// ctrl: 'Control',
const ControlOrMeta: KeyInput = isMacOS() ? 'Meta' : 'Control';


/**
 * control: 'Control',
 * ctrl: 'Control',
 * cmd: 'Meta',
 * command: 'Meta',
 * meta: 'Meta',
 */

/**
 * Only adapt for a few common shortcuts.
 *
 * Mac shortcuts list: https://support.apple.com/zh-cn/102650
 * CDP: https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchKeyEvent
 * Commands: https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/commands/editor_command_names.h
 */
const ShortcutsMap = new Map<string, { key: KeyInput; commands: string }>([
  ['ControlOrMeta+KeyA', { key: 'KeyA', commands: 'SelectAll' }],
  ['ControlOrMeta+KeyX', { key: 'KeyX', commands: 'Cut' }],
  ['ControlOrMeta+KeyC', { key: 'KeyC', commands: 'Copy' }],
  ['ControlOrMeta+KeyV', { key: 'KeyV', commands: 'Paste' }],
  ['ControlOrMeta+KeyZ', { key: 'KeyZ', commands: 'Undo' }],
  ['ControlOrMeta+KeyY', { key: 'KeyY', commands: 'Redo' }],
  ['ControlOrMeta+Shift+KeyZ', { key: 'KeyZ', commands: 'Redo' }],
  ['Shift+ControlOrMeta+KeyZ', { key: 'KeyZ', commands: 'Redo' }],
]);
