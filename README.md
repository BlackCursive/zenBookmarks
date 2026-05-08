# Zen Bookmarks

A Firefox WebExtension sidebar panel for [Zen Browser](https://zen-browser.app) that brings grouped, collapsible, drag-and-drop bookmark management to your browser's native bookmark system.

Ported from the [obsidianBookmarks](https://github.com/BlackCursive/obsidianBookmarks) Obsidian plugin.

---

## Features

- **Grouped bookmarks** — organize bookmarks into collapsible sections (folders in Firefox's native store)
- **Drag and drop** — reorder groups, move bookmarks between groups, or drop bookmarks into the ungrouped section
- **Full CRUD** — add, rename, delete bookmarks and groups via right-click context menus
- **Custom icons** — override any bookmark's icon from a searchable Lucide icon library (~90 icons)
- **Favicon fallback** — shows site favicons when no custom icon is set
- **Live sync** — reads and writes directly to Firefox's native bookmark API; changes from elsewhere appear automatically
- **Markdown export** — export your bookmarks as a `.md` file from the settings page
- **Keyboard shortcut** — `Cmd+B` on Mac, `Alt+B` elsewhere (customizable)
- **Square-UI aesthetic** — square corners, thin borders, JetBrains Mono font, hidden scrollbars; respects Zen's accent color and follows system light/dark mode

---

## Installation

### Prerequisites

- [Zen Browser](https://zen-browser.app) (or any Firefox-based browser)
- [Node.js](https://nodejs.org) v18+ and npm (only required for Option B)

### Option A: Load Prebuilt (Development Mode)

The `dist/` folder is committed to the repo, so no build step is required.

```bash
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
```

Then load it in the browser:

1. Open Zen Browser and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Navigate to the cloned `zenBookmarks/` folder and select `manifest.json`
4. The **Zen Bookmarks** entry will appear in the left sidebar's panel list

> **Note:** Temporary add-ons are removed when the browser restarts. For a persistent install, see Option C or D.

### Option B: Build from Source

For development, or to make changes before loading:

```bash
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
npm install
npm run build
```

Then load `manifest.json` via `about:debugging` (steps 1–4 from Option A).

**Watch mode** (rebuilds on save):

```bash
npm run dev
```

### Option C: Permanent Installation (Sign Your Own XPI)

> ## ⚠️ REQUIRED — Permanent install needs a Mozilla developer account + JWT credentials
>
> **There is no `xpinstall.signatures.required` workaround.** Standard Firefox / Zen hard-enforces extension signing. Without signing, the only install path is the Temporary Add-on (Option A), which disappears every browser restart.
>
> To install permanently you **must**:
> 1. Sign up for a free Mozilla developer account
> 2. Generate JWT credentials
> 3. Use those credentials with `web-ext sign` to produce a signed `.xpi`
>
> No public listing is created. Self-distributed (unlisted) channel keeps the extension private.

#### Step 1 — Create a Mozilla developer account

Sign up here (free, takes 1 minute): **[addons.mozilla.org/en-US/developers/](https://addons.mozilla.org/en-US/developers/)**

#### Step 2 — Generate JWT credentials

Go to **[addons.mozilla.org/en-US/developers/addon/api/key/](https://addons.mozilla.org/en-US/developers/addon/api/key/)** and click **Generate new credentials**.

You will get **two** values on the same page:

| Mozilla calls it | `web-ext` flag | Looks like |
|---|---|---|
| **JWT issuer** | `--api-key` | `user:12345678:90` |
| **JWT secret** | `--api-secret` | long hex string |

Save both — the secret is shown only once. The "issuer" field IS your api-key — they are the same value with different names.

#### Step 3 — Clone, build, sign

```bash
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
npm install
npm run build

# Replace YOUR_JWT_ISSUER and YOUR_JWT_SECRET with the values from Step 2
npx web-ext sign \
  --api-key=YOUR_JWT_ISSUER \
  --api-secret=YOUR_JWT_SECRET \
  --channel=unlisted \
  --source-dir=. \
  --ignore-files=node_modules tests src/*.ts esbuild.config.mjs tsconfig.json package*.json docs README.md .gitignore
```

The signed `.xpi` will appear in `web-ext-artifacts/`. Mozilla's signing service usually returns within 30 seconds.

#### Step 4 — Install in Zen

1. Go to `about:addons`
2. Click the gear icon → **Install Add-on From File…**
3. Select the signed `.xpi` from `web-ext-artifacts/`

The extension is now permanent. It survives browser restarts and updates only when you re-sign a new build.

### Option D: Install the Pre-Signed XPI (BlackCursive personal build)

> **This is a personal signed build.** The `zenBookmarks.xpi` file at the repo root was signed by the project author (BlackCursive) using their own Mozilla developer account. It is provided as-is for convenience — no warranty, no support guarantees. If you want to sign your own copy under your own identity, use Option C instead.

```bash
git clone https://github.com/BlackCursive/zenBookmarks.git
cd zenBookmarks
```

Then in Zen:

1. Go to `about:addons`
2. Click the gear icon → **Install Add-on From File…**
3. Select `zenBookmarks.xpi` from the cloned repo

Or download `zenBookmarks.xpi` directly from the [GitHub repo](https://github.com/BlackCursive/zenBookmarks/blob/main/zenBookmarks.xpi) without cloning.

The extension is permanent and survives browser restarts.

### Updating

```bash
cd zenBookmarks
git pull

# Rebuild only if you used Option B
npm install
npm run build
```

Reload the extension via `about:debugging` → **Reload** next to Zen Bookmarks.

### Uninstalling

**Temporary install (Option A or B):**

1. Go to `about:debugging#/runtime/this-firefox`
2. Find **Zen Bookmarks**
3. Click **Remove**

Or simply restart the browser.

**Permanent install (Option C or D):**

1. Go to `about:addons`
2. Find **Zen Bookmarks**
3. Click the `…` menu → **Remove**

**Clean up stored metadata** (optional — custom icons, collapsed states):

Before removing, open the options page and click **Reset all colors & icons**. Otherwise the metadata stays in `browser.storage.local` until cleared. Browser bookmarks themselves are untouched by uninstalling — they live in Firefox's native bookmark store.

**Delete the cloned repo:**

```bash
rm -rf zenBookmarks
```

---

## Usage

### Opening the Sidebar

- Press `Cmd+B` (Mac) or `Alt+B` (other platforms) to toggle
- Or click the sidebar icon in Zen's left strip and select **Zen Bookmarks**

### Managing Groups

- Click **+ Group** in the toolbar to create a new group
- Click a group header to collapse / expand it
- **Drag a group header** onto another group's top or bottom edge to reorder
- **Right-click a group header** for:
  - **Rename**
  - **Add bookmark** — adds directly into that group
  - **Delete group** — removes the folder; bookmarks become ungrouped

### Managing Bookmarks

- Click a bookmark to open it in a new tab
- **Drag a bookmark** onto a group header to move it into that group
- **Drag a bookmark** onto the ungrouped divider to remove it from its group
- **Right-click a bookmark** for:
  - **Open in new tab**
  - **Rename**
  - **Change icon** — searchable Lucide icon picker
  - **Reset to favicon** — only shown when a custom icon is set
  - **Move to group** — submenu with all groups + Ungrouped
  - **Delete**

### Settings Page

Access via `about:addons` → Zen Bookmarks → **Preferences**.

- **Keyboard Shortcut** — shows the current shortcut; click the link to customize it in the Add-ons Manager
- **Export as Markdown** — downloads your bookmarks as a `.md` file
- **Reset all colors & icons** — clears stored metadata; your actual bookmarks are unaffected

### Customizing the Keyboard Shortcut

1. Go to `about:addons`
2. Click the gear icon → **Manage Extension Shortcuts**
3. Find **Zen Bookmarks** and set your preferred key combination

> Firefox-reserved Mac shortcuts (e.g. `Cmd+T`, `Cmd+W`, `Cmd+P`) cannot be reassigned. Manifest commands accept at most 2 modifiers + key (3 with Shift).

### Hover-to-Expand Sidebar

To make Zen's sidebar collapse and reveal on hover, enable Zen's built-in **Compact Mode**: `about:preferences#zenLooksFeel` → Sidebar → **Compact Mode**. This is a browser feature, not extension-controlled.

---

## Project Structure

```
zenBookmarks/
├── manifest.json              # MV3 extension manifest
├── icons/
│   └── icon-48.svg            # Extension icon
├── fonts/                     # Bundled JetBrains Mono (woff2)
├── sidebar/
│   ├── sidebar.html           # Sidebar entry point
│   ├── sidebar.ts             # Mounts BookmarkView, listens to bookmark events
│   └── sidebar.css            # All panel styles
├── options/
│   ├── options.html           # Settings page (inline styles)
│   └── options.ts             # Shortcut display, export, reset
├── src/
│   ├── types.ts               # Bookmark, BookmarkGroup, PluginData interfaces
│   ├── BookmarkStore.ts       # Async store over browser.bookmarks + storage APIs
│   ├── BookmarkView.ts        # Vanilla DOM rendering, drag/drop, context menus
│   ├── bookmarkTree.ts        # Converts Firefox bookmark tree to PluginData
│   ├── icons.ts               # Lucide icon injection wrapper
│   ├── IconPickerModal.ts     # Native <dialog> icon picker with search
│   ├── MarkdownParser.ts      # Parse/serialize markdown (used for export)
│   └── globals.d.ts           # TypeScript browser global declaration
├── tests/
│   ├── BookmarkStore.test.ts
│   ├── bookmarkTree.test.ts
│   └── MarkdownParser.test.ts
└── dist/                      # Compiled output (committed)
    ├── sidebar.js
    └── options.js
```

---

## Data Storage

Bookmark data (titles, URLs, folder structure, ordering) lives entirely in **Firefox's native bookmarks**. Creating a group creates a real bookmark folder; deleting a bookmark removes it from the browser too.

Custom icons and collapsed states are stored separately in `browser.storage.local` under the key `zen_bookmarks_metadata`. This metadata is automatically pruned when the corresponding bookmark or folder is deleted.

---

## Development

```bash
npm test              # Run vitest suite (42 tests)
npm run test:watch    # Watch mode
npx tsc -noEmit       # Type check only
npm run build         # Production build (tsc check + esbuild bundle)
npm run dev           # esbuild watch mode
```

**Tech stack:** TypeScript, esbuild, Vitest, Lucide icons, JetBrains Mono, Firefox WebExtension APIs (MV3)

---

## License

MIT
