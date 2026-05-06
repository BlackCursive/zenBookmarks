import type { PluginData, BookmarkGroup, Bookmark } from './types';
import type { MetadataStore } from './BookmarkStore';

interface TreeNode {
  id: string;
  title: string;
  url?: string;
  type?: string;
  children?: TreeNode[];
}

export function treeToPluginData(rootNodes: TreeNode[], metadata: MetadataStore): PluginData {
  const groups: BookmarkGroup[] = [];
  const bookmarks: Bookmark[] = [];

  const root = rootNodes[0];
  if (!root?.children) return { groups, bookmarks };

  let groupOrder = 0;
  let ungroupedOrder = 0;

  for (const container of root.children) {
    if (!container.children) continue;

    for (const node of container.children) {
      if (node.type === 'separator') continue;

      if (node.url === undefined && node.children !== undefined) {
        const meta = metadata[node.id] ?? {};
        groups.push({
          id: node.id,
          name: node.title,
          color: meta.color ?? '#7aa2f7',
          collapsed: meta.collapsed ?? false,
          order: groupOrder++,
        });

        let bookmarkOrder = 0;
        for (const child of node.children) {
          if (!child.url || child.type === 'separator') continue;
          const childMeta = metadata[child.id] ?? {};
          bookmarks.push({
            id: child.id,
            title: child.title,
            url: child.url,
            icon: childMeta.icon ?? 'link',
            groupId: node.id,
            order: bookmarkOrder++,
          });
        }
      } else if (node.url) {
        const meta = metadata[node.id] ?? {};
        bookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          icon: meta.icon ?? 'link',
          groupId: null,
          order: ungroupedOrder++,
        });
      }
    }
  }

  return { groups, bookmarks };
}
