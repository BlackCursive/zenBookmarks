import type { PluginData, Bookmark, BookmarkGroup } from './types';
import { treeToPluginData } from './bookmarkTree';

export interface NodeMetadata {
  color?: string;
  icon?: string;
  collapsed?: boolean;
}

export type MetadataStore = Record<string, NodeMetadata>;

export const METADATA_KEY = 'zen_bookmarks_metadata';
const DEFAULT_PARENT_ID = 'unfiled_____';

export class BookmarkStore {
  private cache: PluginData = { groups: [], bookmarks: [] };
  private metadata: MetadataStore = {};
  private changeCallbacks: Array<() => void> = [];

  async load(): Promise<void> {
    const [tree, stored] = await Promise.all([
      browser.bookmarks.getTree(),
      browser.storage.local.get(METADATA_KEY),
    ]);
    this.metadata = (stored[METADATA_KEY] as MetadataStore | undefined) ?? {};
    this.cleanOrphanMetadata(tree[0]!);
    this.cache = treeToPluginData(tree as any, this.metadata);
  }

  getData(): PluginData {
    return { groups: [...this.cache.groups], bookmarks: [...this.cache.bookmarks] };
  }

  onChange(cb: () => void): () => void {
    this.changeCallbacks.push(cb);
    return () => { this.changeCallbacks = this.changeCallbacks.filter(x => x !== cb); };
  }

  async reload(): Promise<void> {
    await this.load();
    this.notify();
  }

  private notify(): void {
    this.changeCallbacks.forEach(cb => cb());
  }

  private async saveMetadata(): Promise<void> {
    await browser.storage.local.set({ [METADATA_KEY]: this.metadata });
  }

  private cleanOrphanMetadata(root: { id: string; children?: Array<{ id: string; children?: any[] }> }): void {
    const allIds = new Set<string>();
    const walk = (node: { id: string; children?: any[] }) => {
      allIds.add(node.id);
      node.children?.forEach(walk);
    };
    walk(root);
    for (const id of Object.keys(this.metadata)) {
      if (!allIds.has(id)) delete this.metadata[id];
    }
  }

  async addGroup(name: string, color: string): Promise<BookmarkGroup> {
    const node = await browser.bookmarks.create({ type: 'folder', title: name, parentId: DEFAULT_PARENT_ID });
    this.metadata[node.id] = { ...(this.metadata[node.id] ?? {}), color };
    await this.saveMetadata();
    await this.load();
    this.notify();
    return this.cache.groups.find(g => g.id === node.id) ?? { id: node.id, name, color, collapsed: false, order: 0 };
  }

  async renameGroup(id: string, name: string): Promise<void> {
    await browser.bookmarks.update(id, { title: name });
    await this.load();
    this.notify();
  }

  async setGroupColor(id: string, color: string): Promise<void> {
    this.metadata[id] = { ...(this.metadata[id] ?? {}), color };
    await this.saveMetadata();
    await this.load();
    this.notify();
  }

  async setGroupCollapsed(id: string, collapsed: boolean): Promise<void> {
    this.metadata[id] = { ...(this.metadata[id] ?? {}), collapsed };
    await this.saveMetadata();
    await this.load();
    this.notify();
  }

  async deleteGroup(id: string): Promise<void> {
    const children = await browser.bookmarks.getChildren(id);
    await Promise.all(
      children
        .filter(c => !!c.url)
        .map(c => browser.bookmarks.move(c.id, { parentId: DEFAULT_PARENT_ID }))
    );
    await browser.bookmarks.removeTree(id);
    delete this.metadata[id];
    await this.saveMetadata();
    await this.load();
    this.notify();
  }

  async addBookmark(title: string, url: string, groupId: string | null): Promise<Bookmark> {
    const node = await browser.bookmarks.create({ title, url, parentId: groupId ?? DEFAULT_PARENT_ID });
    await this.load();
    this.notify();
    return this.cache.bookmarks.find(b => b.id === node.id) ?? {
      id: node.id, title, url, icon: 'link', groupId, order: 0,
    };
  }

  async renameBookmark(id: string, title: string): Promise<void> {
    await browser.bookmarks.update(id, { title });
    await this.load();
    this.notify();
  }

  async setBookmarkIcon(id: string, icon: string): Promise<void> {
    this.metadata[id] = { ...(this.metadata[id] ?? {}), icon };
    await this.saveMetadata();
    await this.load();
    this.notify();
  }

  async moveBookmark(id: string, groupId: string | null): Promise<void> {
    await browser.bookmarks.move(id, { parentId: groupId ?? DEFAULT_PARENT_ID });
    await this.load();
    this.notify();
  }

  async deleteBookmark(id: string): Promise<void> {
    await browser.bookmarks.remove(id);
    delete this.metadata[id];
    await this.saveMetadata();
    await this.load();
    this.notify();
  }

  getMetadata(): MetadataStore {
    return { ...this.metadata };
  }

  async clearMetadata(): Promise<void> {
    this.metadata = {};
    await browser.storage.local.remove(METADATA_KEY);
    await this.load();
    this.notify();
  }
}
