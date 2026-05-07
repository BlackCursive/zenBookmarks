import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkStore } from '../src/BookmarkStore';

const UNFILED = 'unfiled_____';

function mockTree(children: any[] = []) {
  return [{
    id: 'root________',
    title: '',
    children: [{
      id: UNFILED,
      title: 'Other Bookmarks',
      children,
    }],
  }];
}

const mockBookmarks = {
  getTree: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  removeTree: vi.fn(),
  move: vi.fn(),
  getChildren: vi.fn(),
  onCreated: { addListener: vi.fn() },
  onRemoved: { addListener: vi.fn() },
  onChanged: { addListener: vi.fn() },
  onMoved: { addListener: vi.fn() },
};

const mockStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
};

vi.stubGlobal('browser', { bookmarks: mockBookmarks, storage: mockStorage });

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.local.get.mockResolvedValue({});
});

async function makeStore(treeChildren: any[] = []) {
  mockBookmarks.getTree.mockResolvedValue(mockTree(treeChildren));
  const store = new BookmarkStore();
  await store.load();
  return store;
}

describe('BookmarkStore.load', () => {
  it('calls getTree and storage.local.get', async () => {
    await makeStore();
    expect(mockBookmarks.getTree).toHaveBeenCalledOnce();
    expect(mockStorage.local.get).toHaveBeenCalledWith('zen_bookmarks_metadata');
  });

  it('builds groups from folders', async () => {
    const store = await makeStore([
      { id: 'f1', title: 'Dev', children: [] },
    ]);
    expect(store.getData().groups).toHaveLength(1);
    expect(store.getData().groups[0]?.name).toBe('Dev');
  });

  it('builds bookmarks from child nodes', async () => {
    const store = await makeStore([
      {
        id: 'f1', title: 'Dev', children: [
          { id: 'b1', title: 'GitHub', url: 'https://github.com' },
        ],
      },
    ]);
    expect(store.getData().bookmarks).toHaveLength(1);
    expect(store.getData().bookmarks[0]?.title).toBe('GitHub');
    expect(store.getData().bookmarks[0]?.groupId).toBe('f1');
  });
});

describe('BookmarkStore.addGroup', () => {
  it('calls browser.bookmarks.create with folder type', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'new-folder', title: 'AI' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([
      { id: 'new-folder', title: 'AI', children: [] },
    ]));
    const store = await makeStore();
    await store.addGroup('AI', '#7aa2f7');
    expect(mockBookmarks.create).toHaveBeenCalledWith({
      type: 'folder',
      title: 'AI',
      parentId: UNFILED,
    });
  });

  it('saves color to metadata', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'new-folder', title: 'AI' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([
      { id: 'new-folder', title: 'AI', children: [] },
    ]));
    const store = await makeStore();
    await store.addGroup('AI', '#f7768e');
    expect(mockStorage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        zen_bookmarks_metadata: expect.objectContaining({
          'new-folder': expect.objectContaining({ color: '#f7768e' }),
        }),
      })
    );
  });

  it('fires onChange after addGroup', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'new-folder', title: 'AI' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    const cb = vi.fn();
    store.onChange(cb);
    await store.addGroup('AI', '#7aa2f7');
    expect(cb).toHaveBeenCalledOnce();
  });
});

describe('BookmarkStore.renameGroup', () => {
  it('calls browser.bookmarks.update', async () => {
    mockBookmarks.update.mockResolvedValue({});
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore([{ id: 'f1', title: 'Dev', children: [] }]);
    await store.renameGroup('f1', 'Development');
    expect(mockBookmarks.update).toHaveBeenCalledWith('f1', { title: 'Development' });
  });
});

describe('BookmarkStore.setGroupColor', () => {
  it('updates metadata only (no bookmarks API call)', async () => {
    const store = await makeStore([{ id: 'f1', title: 'Dev', children: [] }]);
    await store.setGroupColor('f1', '#bb9af7');
    expect(mockBookmarks.update).not.toHaveBeenCalled();
    expect(mockStorage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        zen_bookmarks_metadata: expect.objectContaining({
          f1: expect.objectContaining({ color: '#bb9af7' }),
        }),
      })
    );
  });
});

describe('BookmarkStore.deleteGroup', () => {
  it('moves bookmarks out then removes folder', async () => {
    mockBookmarks.getChildren.mockResolvedValue([
      { id: 'b1', url: 'https://github.com', title: 'GitHub' },
    ]);
    mockBookmarks.move.mockResolvedValue({});
    mockBookmarks.removeTree.mockResolvedValue(undefined);
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore([
      { id: 'f1', title: 'Dev', children: [{ id: 'b1', title: 'GitHub', url: 'https://github.com' }] },
    ]);
    await store.deleteGroup('f1');
    expect(mockBookmarks.move).toHaveBeenCalledWith('b1', { parentId: UNFILED });
    expect(mockBookmarks.removeTree).toHaveBeenCalledWith('f1');
  });
});

describe('BookmarkStore.addBookmark', () => {
  it('calls browser.bookmarks.create with url and parentId', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'b1', title: 'GitHub', url: 'https://github.com' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([
      { id: 'b1', title: 'GitHub', url: 'https://github.com' },
    ]));
    const store = await makeStore();
    await store.addBookmark('GitHub', 'https://github.com', null);
    expect(mockBookmarks.create).toHaveBeenCalledWith({
      title: 'GitHub',
      url: 'https://github.com',
      parentId: UNFILED,
    });
  });

  it('uses groupId as parentId when provided', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'b1', title: 'GitHub', url: 'https://github.com' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    await store.addBookmark('GitHub', 'https://github.com', 'f1');
    expect(mockBookmarks.create).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 'f1' })
    );
  });
});

describe('BookmarkStore.deleteBookmark', () => {
  it('calls browser.bookmarks.remove', async () => {
    mockBookmarks.remove.mockResolvedValue(undefined);
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore([
      { id: 'b1', title: 'GitHub', url: 'https://github.com' },
    ]);
    await store.deleteBookmark('b1');
    expect(mockBookmarks.remove).toHaveBeenCalledWith('b1');
  });
});

describe('BookmarkStore.setBookmarkIcon', () => {
  it('saves icon to metadata without calling bookmarks API', async () => {
    const store = await makeStore([
      { id: 'b1', title: 'GitHub', url: 'https://github.com' },
    ]);
    await store.setBookmarkIcon('b1', 'github');
    expect(mockBookmarks.update).not.toHaveBeenCalled();
    expect(mockStorage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        zen_bookmarks_metadata: expect.objectContaining({
          b1: expect.objectContaining({ icon: 'github' }),
        }),
      })
    );
  });
});

describe('BookmarkStore.moveBookmark', () => {
  it('calls browser.bookmarks.move with new parentId', async () => {
    mockBookmarks.move.mockResolvedValue({});
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore([
      { id: 'b1', title: 'GitHub', url: 'https://github.com' },
      { id: 'f1', title: 'Dev', children: [] },
    ]);
    await store.moveBookmark('b1', 'f1');
    expect(mockBookmarks.move).toHaveBeenCalledWith('b1', { parentId: 'f1' });
  });

  it('moves to unfiled when groupId is null', async () => {
    mockBookmarks.move.mockResolvedValue({});
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    await store.moveBookmark('b1', null);
    expect(mockBookmarks.move).toHaveBeenCalledWith('b1', { parentId: UNFILED });
  });
});

describe('BookmarkStore.moveGroup', () => {
  it('moves to target index when position is before', async () => {
    mockBookmarks.get.mockResolvedValue([{ id: 'g2', index: 2, parentId: UNFILED }]);
    mockBookmarks.move.mockResolvedValue({});
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    await store.moveGroup('g1', 'g2', 'before');
    expect(mockBookmarks.move).toHaveBeenCalledWith('g1', { parentId: UNFILED, index: 2 });
  });

  it('moves to target index + 1 when position is after', async () => {
    mockBookmarks.get.mockResolvedValue([{ id: 'g2', index: 2, parentId: UNFILED }]);
    mockBookmarks.move.mockResolvedValue({});
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    await store.moveGroup('g1', 'g2', 'after');
    expect(mockBookmarks.move).toHaveBeenCalledWith('g1', { parentId: UNFILED, index: 3 });
  });

  it('skips move when target is missing', async () => {
    mockBookmarks.get.mockResolvedValue([]);
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    await store.moveGroup('g1', 'missing', 'before');
    expect(mockBookmarks.move).not.toHaveBeenCalled();
  });
});

describe('BookmarkStore.onChange', () => {
  it('returns unsubscribe function', async () => {
    mockBookmarks.create.mockResolvedValue({ id: 'f1', title: 'Dev' });
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore();
    const cb = vi.fn();
    const unsub = store.onChange(cb);
    await store.addGroup('Dev', '#7aa2f7');
    expect(cb).toHaveBeenCalledOnce();
    unsub();
    await store.addGroup('Dev', '#7aa2f7');
    expect(cb).toHaveBeenCalledOnce(); // still only once
  });
});

describe('BookmarkStore.clearMetadata', () => {
  it('calls storage.local.remove and reloads', async () => {
    const store = await makeStore();
    await store.clearMetadata();
    expect(mockStorage.local.remove).toHaveBeenCalledWith('zen_bookmarks_metadata');
    expect(mockBookmarks.getTree).toHaveBeenCalledTimes(2); // load + reload
  });
});
