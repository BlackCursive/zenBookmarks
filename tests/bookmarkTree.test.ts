import { describe, it, expect } from 'vitest';
import { treeToPluginData } from '../src/bookmarkTree';
import type { MetadataStore } from '../src/BookmarkStore';

type Node = {
  id: string;
  title: string;
  url?: string;
  type?: 'bookmark' | 'folder' | 'separator';
  children?: Node[];
};

function makeTree(containers: Node[]): Node[] {
  return [{ id: 'root________', title: '', children: containers }];
}

const BASIC_TREE = makeTree([
  {
    id: 'unfiled_____',
    title: 'Other Bookmarks',
    children: [
      {
        id: 'folder1',
        title: 'Dev Tools',
        children: [
          { id: 'bm1', title: 'GitHub', url: 'https://github.com', type: 'bookmark' },
          { id: 'bm2', title: 'MDN', url: 'https://developer.mozilla.org', type: 'bookmark' },
        ],
      },
      { id: 'bm3', title: 'News', url: 'https://news.ycombinator.com', type: 'bookmark' },
    ],
  },
]);

describe('treeToPluginData', () => {
  it('converts folders to groups', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.id).toBe('folder1');
    expect(result.groups[0]?.name).toBe('Dev Tools');
  });

  it('uses default color #7aa2f7 when no metadata', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    expect(result.groups[0]?.color).toBe('#7aa2f7');
  });

  it('uses color from metadata when present', () => {
    const meta: MetadataStore = { folder1: { color: '#f7768e' } };
    const result = treeToPluginData(BASIC_TREE as any, meta);
    expect(result.groups[0]?.color).toBe('#f7768e');
  });

  it('uses collapsed from metadata when present', () => {
    const meta: MetadataStore = { folder1: { collapsed: true } };
    const result = treeToPluginData(BASIC_TREE as any, meta);
    expect(result.groups[0]?.collapsed).toBe(true);
  });

  it('defaults collapsed to false when no metadata', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    expect(result.groups[0]?.collapsed).toBe(false);
  });

  it('maps bookmarks inside folder to that group', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    const grouped = result.bookmarks.filter(b => b.groupId === 'folder1');
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.title).toBe('GitHub');
    expect(grouped[1]?.title).toBe('MDN');
  });

  it('maps direct container bookmarks to ungrouped (groupId null)', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    const ungrouped = result.bookmarks.filter(b => b.groupId === null);
    expect(ungrouped).toHaveLength(1);
    expect(ungrouped[0]?.title).toBe('News');
  });

  it('uses icon from metadata when present', () => {
    const meta: MetadataStore = { bm1: { icon: 'code' } };
    const result = treeToPluginData(BASIC_TREE as any, meta);
    const bm = result.bookmarks.find(b => b.id === 'bm1');
    expect(bm?.icon).toBe('code');
  });

  it('defaults icon to "link" when no metadata', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    expect(result.bookmarks.every(b => b.icon === 'link')).toBe(true);
  });

  it('assigns sequential order to groups across containers', () => {
    const tree = makeTree([
      {
        id: 'toolbar_____',
        title: 'Bookmarks Toolbar',
        children: [
          { id: 'fA', title: 'A', children: [] },
        ],
      },
      {
        id: 'unfiled_____',
        title: 'Other Bookmarks',
        children: [
          { id: 'fB', title: 'B', children: [] },
        ],
      },
    ]);
    const result = treeToPluginData(tree as any, {});
    expect(result.groups[0]?.order).toBe(0);
    expect(result.groups[1]?.order).toBe(1);
  });

  it('assigns sequential order to bookmarks within each group', () => {
    const result = treeToPluginData(BASIC_TREE as any, {});
    const grouped = result.bookmarks.filter(b => b.groupId === 'folder1').sort((a, b) => a.order - b.order);
    expect(grouped[0]?.order).toBe(0);
    expect(grouped[1]?.order).toBe(1);
  });

  it('skips separator nodes', () => {
    const tree = makeTree([
      {
        id: 'unfiled_____',
        title: 'Other Bookmarks',
        children: [
          { id: 'sep1', title: '', type: 'separator' },
          { id: 'bm1', title: 'GitHub', url: 'https://github.com', type: 'bookmark' },
        ],
      },
    ]);
    const result = treeToPluginData(tree as any, {});
    expect(result.bookmarks).toHaveLength(1);
    expect(result.bookmarks[0]?.id).toBe('bm1');
  });

  it('returns empty data when root has no children', () => {
    const result = treeToPluginData([{ id: 'root________', title: '' }] as any, {});
    expect(result.groups).toHaveLength(0);
    expect(result.bookmarks).toHaveLength(0);
  });
});
