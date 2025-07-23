/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/actions/schemas.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { z } from 'zod';

export interface ActionSchema<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: T;
}

export const doneActionSchema = {
  name: 'done',
  description: 'Complete task',
  schema: z.object({
    text: z.string(),
  }),
} as const satisfies ActionSchema;

// Basic Navigation Actions
export const searchGoogleActionSchema = {
  name: 'search_google',
  description: 'Search Google in the current tab',
  schema: z.object({
    query: z.string(),
  }),
} as const satisfies ActionSchema;

export const goToUrlActionSchema = {
  name: 'go_to_url',
  description: 'Navigate to URL in the current tab',
  schema: z.object({
    url: z.string(),
  }),
} as const satisfies ActionSchema;

export const goBackActionSchema = {
  name: 'go_back',
  description: 'Go back to the previous page',
  schema: z.object({}),
} as const satisfies ActionSchema;

export const clickElementActionSchema = {
  name: 'click_element',
  description: 'Click element',
  schema: z.object({
    desc: z.string().optional(), // some small LLM can not generate a description, so let it be optional (but it's still makred as required in json schema)
    index: z.number(),
    xpath: z.string().optional(),
  }),
} as const satisfies ActionSchema;

export const inputTextActionSchema = {
  name: 'input_text',
  description: 'Input text into an interactive input element',
  schema: z.object({
    desc: z.string().optional(),
    index: z.number(),
    text: z.string(),
    xpath: z.string().optional(),
  }),
} as const satisfies ActionSchema;

// Tab Management Actions
export const switchTabActionSchema = {
  name: 'switch_tab',
  description: 'Switch to tab by id',
  schema: z.object({
    tab_id: z.string(),
  }),
} as const satisfies ActionSchema;

export const openTabActionSchema = {
  name: 'open_tab',
  description: 'Open URL in new tab',
  schema: z.object({
    url: z.string(),
  }),
} as const satisfies ActionSchema;

// Content Actions
export const extractContentActionSchema = {
  name: 'extract_content',
  description:
    'Extract page content to retrieve specific information from the page, e.g. all company names, a specifc description, all information about, links with companies in structured format or simply links',
  schema: z.object({
    goal: z.string(),
  }),
} as const satisfies ActionSchema;

// Cache Actions
export const cacheContentActionSchema = {
  name: 'cache_content',
  description: 'Cache the extracted content of the page',
  schema: z.object({
    content: z.string(),
  }),
} as const satisfies ActionSchema;

export const scrollDownActionSchema = {
  name: 'scroll_down',
  description:
    'Scroll down the page by pixel amount - if no amount is specified, scroll down one page',
  schema: z.object({
    desc: z.string().optional(),
    amount: z.number().optional(),
  }),
} as const satisfies ActionSchema;

export const scrollUpActionSchema = {
  name: 'scroll_up',
  description:
    'Scroll up the page by pixel amount - if no amount is specified, scroll up one page',
  schema: z.object({
    desc: z.string().optional(),
    amount: z.number().optional(),
  }),
} as const satisfies ActionSchema;

export const sendKeysActionSchema = {
  name: 'send_keys',
  description:
    'Send strings of special keys like Backspace, Insert, PageDown, Delete, Enter. Shortcuts such as `Control+o`, `Control+Shift+T` are supported as well. This gets used in keyboard press. Be aware of different operating systems and their shortcuts',
  schema: z.object({
    desc: z.string().optional(),
    keys: z.string(),
  }),
} as const satisfies ActionSchema;

export const scrollToTextActionSchema = {
  name: 'scroll_to_text',
  description:
    'If you dont find something which you want to interact with, scroll to it',
  schema: z.object({
    desc: z.string().optional(),
    text: z.string(),
  }),
} as const satisfies ActionSchema;

export const getDropdownOptionsActionSchema = {
  name: 'get_dropdown_options',
  description: 'Get all options from a native dropdown',
  schema: z.object({
    index: z.number(),
  }),
} as const satisfies ActionSchema;

export const selectDropdownOptionActionSchema = {
  name: 'select_dropdown_option',
  description:
    'Select dropdown option for interactive element index by the text of the option you want to select',
  schema: z.object({
    index: z.number(),
    text: z.string(),
  }),
} as const satisfies ActionSchema;
