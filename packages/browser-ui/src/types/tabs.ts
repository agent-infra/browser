export const enum TabEvents {
  TabLoadingStateChanged = 'tabLoadingStateChanged',
  TabUrlChanged = 'tabUrlChanged',
  TabVisibilityChanged = 'TabVisibilityChanged',
}
export interface TabEventsMap {
  [TabEvents.TabLoadingStateChanged]: {
    tabId: string;
    isLoading: boolean;
  };
  [TabEvents.TabUrlChanged]: {
    tabId: string;
    oldUrl: string;
    newUrl: string;
  };
  [TabEvents.TabVisibilityChanged]: {
    tabId: string;
    isVisible: boolean;
  };
}

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
  closingTargetIds: Set<string>;
}
