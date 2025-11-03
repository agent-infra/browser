import type { Protocol } from "puppeteer-core";

export interface DialogMetaInfo {
  type: Protocol.Page.DialogType;
  message: string;
  defaultValue: string;
}