import type { Protocol } from "puppeteer-core";

export interface UserAgentInfo {
  userAgent?: string;
  userAgentMetadata?: Protocol.Emulation.UserAgentMetadata;
  platform?: string;
}