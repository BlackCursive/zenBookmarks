export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  groupId: string | null;
  order: number;
}

export interface BookmarkGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface PluginData {
  groups: BookmarkGroup[];
  bookmarks: Bookmark[];
}

export const DEFAULT_DATA: PluginData = {
  groups: [],
  bookmarks: [],
};
