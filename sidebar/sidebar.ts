import { BookmarkStore } from '../src/BookmarkStore';
import { BookmarkView } from '../src/BookmarkView';

const store = new BookmarkStore();
const root = document.getElementById('root')!;

browser.bookmarks.onCreated.addListener(() => void store.reload());
browser.bookmarks.onRemoved.addListener(() => void store.reload());
browser.bookmarks.onChanged.addListener(() => void store.reload());
browser.bookmarks.onMoved.addListener(() => void store.reload());

store.load().then(() => {
  new BookmarkView(root, store);
}).catch((err: unknown) => {
  root.textContent = `Failed to load bookmarks: ${String(err)}`;
});
