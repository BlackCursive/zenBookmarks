import { treeToPluginData } from '../src/bookmarkTree';
import { serializeToMarkdown } from '../src/MarkdownParser';
import type { MetadataStore } from '../src/BookmarkStore';
import { METADATA_KEY } from '../src/BookmarkStore';

async function init(): Promise<void> {
  const shortcutEl = document.getElementById('shortcut')!;
  const statusEl = document.getElementById('status')!;

  const commands = await browser.commands.getAll();
  const cmd = commands.find(c => c.name === '_execute_sidebar_action');
  shortcutEl.textContent = cmd?.shortcut ?? 'Not set';

  document.getElementById('addons-link')!.addEventListener('click', (e) => {
    e.preventDefault();
    void browser.tabs.create({ url: 'about:addons' });
  });

  document.getElementById('export-btn')!.addEventListener('click', async () => {
    try {
      const [tree, stored] = await Promise.all([
        browser.bookmarks.getTree(),
        browser.storage.local.get(METADATA_KEY),
      ]);
      const metadata = (stored[METADATA_KEY] as MetadataStore | undefined) ?? {};
      const data = treeToPluginData(tree, metadata);
      const md = serializeToMarkdown(data);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookmarks.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      statusEl.textContent = 'Exported.';
    } catch (err) {
      statusEl.textContent = `Export failed: ${String(err)}`;
    }
  });

  document.getElementById('reset-btn')!.addEventListener('click', async () => {
    await browser.storage.local.remove(METADATA_KEY);
    statusEl.textContent = 'Colors and icons reset.';
  });
}

init().catch((err: unknown) => {
  console.error('Options init failed:', err);
});
