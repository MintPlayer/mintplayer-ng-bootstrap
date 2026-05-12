export interface RibbonTab {
  id: string;
  label: string;
  content?: string;
}

export interface RibbonTabChangeEvent {
  previousTabId: string;
  activeTabId: string;
}
