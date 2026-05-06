import { BookmarkStore } from '../src/BookmarkStore';
import { BookmarkView } from '../src/BookmarkView';

const store = new BookmarkStore();
const root = document.getElementById('root')!;

let reloadTimer: ReturnType<typeof setTimeout> | undefined;
const debouncedReload = () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => void store.reload(), 150);
};

browser.bookmarks.onCreated.addListener(debouncedReload);
browser.bookmarks.onRemoved.addListener(debouncedReload);
browser.bookmarks.onChanged.addListener(debouncedReload);
browser.bookmarks.onMoved.addListener(debouncedReload);

store.load().then(() => {
  new BookmarkView(root, store);
}).catch((err: unknown) => {
  root.textContent = `Failed to load bookmarks: ${String(err)}`;
});
