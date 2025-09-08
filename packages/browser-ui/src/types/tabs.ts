import type { Target } from 'puppeteer-core';

export interface TabMeta {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isLoading: boolean;
  isActive: boolean;
}

export interface TabsState {
  tabs: Map<string, TabMeta>;
  activeTabId: string | null;
}

export interface TabsOperationTracker {
  creatingTargetIds: Set<string>;
  switchingTargetIds: Set<string>;
  closingTargets: WeakSet<Target>;
}