# Zen Bookmarks — Design Spec

**Date:** 2026-05-06  
**Source:** BlackCursive/obsidianBookmarks (Obsidian plugin v1.3.0)  
**Target:** Firefox WebExtension (Manifest V3) for Zen Browser

---

## Overview

Port the Obsidian Bookmarks Panel plugin to a Firefox WebExtension sidebar panel for Zen Browser. All functionality preserved: grouped collapsible color-coded bookmark sections, full CRUD, per-bookmark custom icons, favicon fallback. Markdown import replaced by live sync with the browser's native bookmarks API. Markdown export retained.

---

## Architecture

```
manifest.json (MV3)
├── background/
│   └── background.ts        — service worker; listens to browser.bookmarks events
├── sidebar/
│   ├── sidebar.html          — panel entry point
│   ├── sidebar.ts            — mounts BookmarkView, wires BookmarkStore
│   └── sidebar.css           — all panel styles
├── options/
│   ├── options.html          — extension settings page
│   └── options.ts            — shortcut display, metadata reset, markdown export
└── src/
    ├── types.ts              — unchanged from original
    ├── BookmarkStore.ts      — adapted: browser.bookmarks + browser.storage.local
    ├── BookmarkView.ts       — rewritten: plain DOM, no Obsidian deps
    ├── ColorPickerModal.ts   — rewritten as <dialog>
    ├── IconPickerModal.ts    — rewritten as <dialog>
    └── MarkdownParser.ts     — unchanged (used for export only)
```

---

## Data Model

Two sources composed at render time:

**Bookmark tree** — authoritative source, live from `browser.bookmarks.getTree()`.  
Folders map to groups. Bookmarks map to bookmark items. All CRUD writes through to `browser.bookmarks.*` API immediately.

**Metadata store** — `browser.storage.local`, key `"metadata"`.  
Shape: `Record<string, { color?: string; icon?: string }>` keyed by bookmark/folder node ID.  
Stores group colors and per-bookmark custom Lucide icon overrides. Favicons used when no icon override set.  
Orphan cleanup: on every load, delete any metadata key with no matching node ID in the current tree.

---

## Components

### BookmarkStore
- `load()` — fetches bookmark tree + metadata in parallel
- `onChange(cb)` — subscribe; called when background sends `BOOKMARKS_CHANGED` message
- All mutations: call `browser.bookmarks.*` then update metadata store and notify subscribers
- Methods preserved: `addBookmark`, `renameBookmark`, `deleteBookmark`, `setBookmarkIcon`, `addGroup` (create folder), `renameGroup`, `deleteGroup`, `setGroupColor`, `setGroupCollapsed`, `moveBookmark`
- Collapsed state stored in metadata store (same key namespace)

### BookmarkView
- Same render logic as original
- DOM: `document.createElement` replaces Obsidian `createDiv/createEl`
- Icons: bundled Lucide SVG subset (~20 icons) as static JSON map; `setIcon(el, name)` replaced by inline SVG injection
- Context menus: custom `<ul>` positioned at mouse coords, dismissed on outside click
- Modals: native `<dialog>` element with `.showModal()` / `.close()`
- Favicon: `https://www.google.com/s2/favicons?domain={hostname}&sz=16`, `onerror` falls back to `link` icon

### Background Service Worker
- Listens to `browser.bookmarks.onCreated`, `onRemoved`, `onChanged`, `onMoved`
- On any event: sends `{ type: "BOOKMARKS_CHANGED" }` to sidebar via `browser.runtime.sendMessage`
- Sidebar re-renders on receipt; checks `browser.runtime.lastError` and does full re-fetch on failure

### Options Page
- Displays current keyboard shortcut (read from `browser.commands.getAll()`)
- Link to `about:addons` for shortcut customization (Firefox requires user to set shortcuts in browser UI)
- "Reset all colors & icons" — clears `browser.storage.local`
- "Export as Markdown" — fetches live bookmark tree, maps to `PluginData` shape, calls `MarkdownParser.serializeToMarkdown`, triggers file download

---

## Keyboard Shortcut

`manifest.json` declares command `_execute_sidebar_action` with suggested key `Alt+B`.  
User can override in `about:addons` → Extensions → Zen Bookmarks → Keyboard Shortcuts.  
Options page displays the current binding and links to the override UI.

---

## Error Handling

- All `browser.bookmarks.*` and `browser.storage.*` calls wrapped in try/catch
- Failures render inline error text in panel — no silent drops
- Metadata orphan cleanup on every load
- Favicon `onerror` falls back to Lucide `link` icon
- Background message failure: sidebar catches `lastError` and re-fetches full tree

---

## Build System

Existing `esbuild.config.mjs` extended with three entry points:
- `sidebar/sidebar.ts`
- `background/background.ts`
- `options/options.ts`

Output to `dist/`. `manifest.json` references `dist/` paths. Lucide icon subset bundled as static JSON (no runtime dependency). No new npm dependencies.

---

## Installation (Zen Browser)

**Development:**
1. `npm run build`
2. `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `dist/manifest.json`

**Permanent (unsigned):**
- Set `xpinstall.signatures.required = false` in `about:config`
- Package `dist/` as `.xpi` and install via drag-and-drop

**Distribution:**
- Submit to addons.mozilla.org for signed distribution (works in Zen Browser as Firefox derivative)

---

## Out of Scope

- Obsidian vault sync (replaced by native browser bookmarks)
- Surfing plugin integration
- Mobile support
- Zen CSS mod layer (can be added later as optional theming on top)
