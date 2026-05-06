# Zen Bookmarks

A Firefox WebExtension sidebar panel for [Zen Browser](https://zen-browser.app) that brings grouped, color-coded, collapsible bookmark management to your browser's native bookmark system.

Ported from the [obsidianBookmarks](https://github.com/BlackCursive/obsidianBookmarks) Obsidian plugin.

---

## Features

- **Grouped bookmarks** — organize bookmarks into collapsible, color-coded sections
- **Full CRUD** — add, rename, delete, and move bookmarks and groups via right-click context menus
- **Custom icons** — override any bookmark's icon from a searchable Lucide icon library
- **Favicon fallback** — shows site favicons when no custom icon is set
- **Live sync** — reads and writes directly to Firefox's native bookmark API; no import required
- **Markdown export** — export your bookmarks as a `.md` file from the settings page
- **Keyboard shortcut** — toggle the sidebar with `Alt+B` (customizable)
- **Tokyo Night theme** — dark UI that fits Zen Browser's aesthetic

---

## Installation

### Prerequisites

- [Zen Browser](https://zen-browser.app) (or any Firefox-based browser)
- [Node.js](https://nodejs.org) v18+ and npm (for building from source)

### Option A: Load Prebuilt (Development Mode)

The `dist/` folder is committed to the repo, so no build step is required.

```bash
# Clone the repository
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
```

Then load it in the browser:

1. Open Zen Browser and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Navigate to the cloned `zenBookmarks/` folder and select `manifest.json`
4. The **Zen Bookmarks** panel will appear in your sidebar

> **Note:** Temporary add-ons are removed when the browser restarts. For a persistent install, see Option C below.

### Option B: Build from Source

For development, or to make changes before loading:

```bash
# Clone the repository
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks

# Install dependencies
npm install

# Build the extension
npm run build
```

Then load `manifest.json` via `about:debugging` as described in Option A (steps 1–4).

**Development mode** (watch for changes):

```bash
npm run dev
```

### Option C: Permanent Installation (Unsigned)

Firefox-based browsers require signed extensions for permanent install unless you disable signature enforcement.

```bash
# Clone the repository
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
```

Then:

1. Open `about:config` in Zen Browser
2. Search for `xpinstall.signatures.required` and set it to `false`
3. Package the extension:
   ```bash
   zip -r zen-bookmarks.xpi manifest.json dist/ sidebar/ options/ icons/ src/
   ```
4. Drag and drop `zen-bookmarks.xpi` onto the browser window, or go to `about:addons` → gear icon → **Install Add-on From File**

### Uninstalling

**Temporary install (Option A or B):**

1. Go to `about:debugging#/runtime/this-firefox`
2. Find **Zen Bookmarks** in the list
3. Click **Remove**

Or simply restart the browser — temporary add-ons don't persist.

**Permanent install (Option C):**

1. Go to `about:addons`
2. Find **Zen Bookmarks**
3. Click the `…` menu → **Remove**

**Clean up stored metadata** (optional — colors, custom icons, collapsed states):

Before removing the extension, open its options page and click **Reset all colors & icons**. Otherwise the metadata sits in `browser.storage.local` until cleared. Browser bookmarks themselves are untouched by uninstalling — they live in Firefox's native bookmark store.

**Delete the cloned repo:**

```bash
rm -rf zenBookmarks
```

### Updating

To pull the latest changes after a previous clone:

```bash
cd zenBookmarks
git pull

# Rebuild only if you used Option B
npm install
npm run build
```

Reload the extension via `about:debugging` → **Reload** next to Zen Bookmarks.

---

## Usage

### Opening the Sidebar

- Press `Alt+B` to toggle the sidebar
- Or use Zen Browser's sidebar toggle button

### Managing Groups

- Click **+ Group** in the toolbar to create a new group
- **Right-click a group header** for options:
  - **Rename** — change the group name
  - **Change color** — pick from 14 preset colors
  - **Add bookmark** — add a bookmark directly to this group
  - **Delete group** — removes the folder (bookmarks become ungrouped)
- Click a group header to collapse or expand it

### Managing Bookmarks

- **Right-click a bookmark** for options:
  - **Rename** — change the display title
  - **Change icon** — search and select from ~90 Lucide icons
  - **Reset to favicon** — revert to the site's favicon
  - **Move to group** — reassign to a different group or ungrouped
  - **Delete** — permanently removes the bookmark
- Click a bookmark to open it in a new tab

### Settings Page

Access via `about:addons` → Zen Bookmarks → **Preferences**, or the extension's options button.

- **Keyboard Shortcut** — shows the current shortcut; click the link to customize it in the Add-ons Manager
- **Export as Markdown** — downloads your bookmarks as a `.md` file
- **Reset all colors & icons** — clears stored metadata (colors, custom icons, collapsed states); your actual bookmarks are unaffected

### Customizing the Keyboard Shortcut

1. Go to `about:addons`
2. Click the gear icon → **Manage Extension Shortcuts**
3. Find **Zen Bookmarks** and set your preferred key combination

---

## Project Structure

```
zenBookmarks/
├── manifest.json              # MV3 extension manifest
├── icons/
│   └── icon-48.svg            # Extension icon
├── sidebar/
│   ├── sidebar.html           # Sidebar entry point
│   ├── sidebar.ts             # Mounts BookmarkView, listens to bookmark events
│   └── sidebar.css            # All panel styles
├── options/
│   ├── options.html           # Settings page
│   └── options.ts             # Shortcut display, export, reset
├── src/
│   ├── types.ts               # Bookmark, BookmarkGroup, PluginData interfaces
│   ├── BookmarkStore.ts       # Async store over browser.bookmarks + storage APIs
│   ├── BookmarkView.ts        # Vanilla DOM rendering (groups, bookmarks, menus)
│   ├── bookmarkTree.ts        # Converts Firefox bookmark tree to PluginData
│   ├── icons.ts               # Lucide icon injection wrapper
│   ├── ColorPickerModal.ts    # Native <dialog> color picker
│   ├── IconPickerModal.ts     # Native <dialog> icon picker with search
│   ├── MarkdownParser.ts      # Parse/serialize markdown (for export)
│   └── globals.d.ts           # TypeScript browser global declaration
├── tests/
│   ├── BookmarkStore.test.ts
│   ├── bookmarkTree.test.ts
│   └── MarkdownParser.test.ts
└── dist/                      # Compiled output (committed for convenience)
    ├── sidebar.js
    └── options.js
```

---

## Data Storage

Bookmark data (titles, URLs, folder structure) lives entirely in **Firefox's native bookmarks** — creating a group creates a real bookmark folder, and deleting a bookmark removes it from the browser too.

Colors, custom icons, and collapsed states are stored separately in `browser.storage.local` under the key `zen_bookmarks_metadata`. This metadata is automatically cleaned up when the corresponding bookmark or folder is deleted.

---

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npx tsc -noEmit -skipLibCheck

# Production build
npm run build
```

**Tech stack:** TypeScript, esbuild, Vitest, Lucide icons, Firefox WebExtension APIs (MV3)

---

## License

MIT
