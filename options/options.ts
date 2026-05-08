import { treeToPluginData } from '../src/bookmarkTree';
import { serializeToMarkdown } from '../src/MarkdownParser';
import type { MetadataStore } from '../src/BookmarkStore';
import { METADATA_KEY } from '../src/BookmarkStore';

const COMMAND_NAME = '_execute_sidebar_action';
const IS_MAC = navigator.platform.toLowerCase().includes('mac');
const DEFAULT_SHORTCUT = IS_MAC ? 'Command+L' : 'Alt+L';

const FUNCTION_KEYS = new Set(['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);
const NAMED_KEYS: Record<string, string> = {
  ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
  'Insert': 'Insert', 'Delete': 'Delete', 'Home': 'Home', 'End': 'End',
  'PageUp': 'PageUp', 'PageDown': 'PageDown', 'Tab': 'Tab', 'Enter': 'Return',
  ',': 'Comma', '.': 'Period',
};

function eventToShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push(IS_MAC ? 'MacCtrl' : 'Ctrl');
  if (e.metaKey) parts.push('Command');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  const k = e.key;
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(k)) return null;

  let keyPart: string;
  if (FUNCTION_KEYS.has(k)) keyPart = k;
  else if (NAMED_KEYS[k]) keyPart = NAMED_KEYS[k];
  else if (/^[a-zA-Z]$/.test(k)) keyPart = k.toUpperCase();
  else if (/^[0-9]$/.test(k)) keyPart = k;
  else return null;

  const isFnKey = FUNCTION_KEYS.has(keyPart);
  if (parts.length === 0 && !isFnKey) return null;

  parts.push(keyPart);
  return parts.join('+');
}

async function init(): Promise<void> {
  const inputEl = document.getElementById('shortcut-input') as HTMLInputElement;
  const resetBtn = document.getElementById('shortcut-reset')!;
  const defaultLabel = document.getElementById('shortcut-default-label')!;
  const statusEl = document.getElementById('status')!;

  defaultLabel.textContent = DEFAULT_SHORTCUT;

  async function refresh(): Promise<void> {
    const commands = await browser.commands.getAll();
    const cmd = commands.find(c => c.name === COMMAND_NAME);
    inputEl.value = cmd?.shortcut ?? '';
    inputEl.placeholder = cmd?.shortcut ? '' : 'Click here, then press keys';
  }

  await refresh();

  inputEl.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shortcut = eventToShortcut(e);
    if (!shortcut) return;
    void (async () => {
      try {
        await browser.commands.update({ name: COMMAND_NAME, shortcut });
        inputEl.value = shortcut;
        statusEl.textContent = `Shortcut set to ${shortcut}.`;
      } catch (err) {
        statusEl.textContent = `Failed to set shortcut: ${String(err)}`;
      }
    })();
  });

  resetBtn.addEventListener('click', () => {
    void (async () => {
      try {
        if (typeof browser.commands.reset === 'function') {
          await browser.commands.reset(COMMAND_NAME);
        } else {
          await browser.commands.update({ name: COMMAND_NAME, shortcut: DEFAULT_SHORTCUT });
        }
        await refresh();
        statusEl.textContent = `Shortcut reset to ${DEFAULT_SHORTCUT}.`;
      } catch (err) {
        statusEl.textContent = `Reset failed: ${String(err)}`;
      }
    })();
  });

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
