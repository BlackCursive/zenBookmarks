# Zen Bookmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the obsidianBookmarks Obsidian plugin to a Firefox WebExtension sidebar panel for Zen Browser, syncing with the browser's native bookmarks API instead of importing from markdown.

**Architecture:** Firefox MV3 WebExtension with a persistent sidebar panel (`browser.sidebarAction`). Bookmark data lives in `browser.bookmarks` (Firefox native); colors, icons, and collapsed state are stored in `browser.storage.local`. The sidebar listens to `browser.bookmarks` events directly — no background script needed. `BookmarkStore`, `ColorPickerModal`, `IconPickerModal`, and `BookmarkView` are rewritten without Obsidian dependencies; `types.ts` and `MarkdownParser.ts` are copied unchanged.

**Tech Stack:** TypeScript, esbuild, Vitest, `lucide` (icon subset), `@types/webextension-polyfill` (types only), Firefox WebExtension APIs (`browser.bookmarks`, `browser.storage.local`, `browser.commands`, `browser.sidebarAction`)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `manifest.json` | Create | MV3 extension manifest |
| `package.json` | Modify | Remove obsidian dep, add lucide + WE types |
| `tsconfig.json` | Modify | Add new dirs, WE global types |
| `esbuild.config.mjs` | Modify | Multiple entry points → dist/ |
| `src/globals.d.ts` | Create | Declare `browser` global |
| `src/types.ts` | Copy (unchanged) | Data types |
| `src/MarkdownParser.ts` | Copy (unchanged) | Parse/serialize markdown |
| `src/bookmarkTree.ts` | Create | Convert Firefox bookmark tree → PluginData |
| `src/icons.ts` | Create | Lucide icon injection wrapper |
| `src/BookmarkStore.ts` | Rewrite | Async store over browser.bookmarks + storage |
| `src/ColorPickerModal.ts` | Rewrite | `<dialog>` color picker, no Obsidian deps |
| `src/IconPickerModal.ts` | Rewrite | `<dialog>` icon picker, uses icons.ts |
| `src/BookmarkView.ts` | Rewrite | Vanilla DOM render, no Obsidian deps |
| `sidebar/sidebar.html` | Create | Sidebar entry point HTML |
| `sidebar/sidebar.ts` | Create | Mount view, wire store, listen to bookmark events |
| `sidebar/sidebar.css` | Create | Panel styles (port from styles.css + new vars) |
| `options/options.html` | Create | Settings page HTML |
| `options/options.ts` | Create | Shortcut display, reset, markdown export |
| `tests/MarkdownParser.test.ts` | Copy (unchanged) | Existing parser tests |
| `tests/bookmarkTree.test.ts` | Create | Pure conversion function tests |
| `tests/BookmarkStore.test.ts` | Rewrite | Async store tests with mocked browser API |
| `icons/icon-48.svg` | Create | Extension icon |

> **Spec deviation:** The design spec described a background service worker relaying bookmark events to the sidebar. This plan removes it — the sidebar panel has direct access to `browser.bookmarks` events and can reload itself without a relay. Simpler and fewer moving parts.

---

## Task 1: Project Scaffold

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `esbuild.config.mjs`
- Create: `manifest.json`
- Create: `src/globals.d.ts`
- Create: `icons/icon-48.svg`

- [ ] **Step 1: Update package.json**

Replace the file content with:

```json
{
  "name": "zen-bookmarks",
  "version": "1.0.0",
  "description": "Sidebar bookmark panel for Zen Browser",
  "type": "module",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "MIT",
  "devDependencies": {
    "@eslint/js": "9.30.1",
    "@types/node": "^20.0.0",
    "@types/webextension-polyfill": "^0.10.7",
    "esbuild": "0.25.5",
    "globals": "14.0.0",
    "jiti": "2.6.1",
    "tslib": "2.4.0",
    "typescript": "^5.8.3",
    "typescript-eslint": "8.35.1",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "lucide": "^0.525.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `node_modules/lucide` and `node_modules/@types/webextension-polyfill` present.

- [ ] **Step 3: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2020",
    "allowJs": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "strictBindCallApply": true,
    "allowSyntheticDefaultImports": true,
    "useUnknownInCatchVariables": true,
    "lib": ["DOM", "ES2020"],
    "types": ["@types/webextension-polyfill"]
  },
  "include": [
    "src/**/*.ts",
    "sidebar/**/*.ts",
    "options/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

- [ ] **Step 4: Update esbuild.config.mjs**

```javascript
import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

const ctx = await esbuild.context({
  entryPoints: [
    'sidebar/sidebar.ts',
    'options/options.ts',
  ],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  outdir: 'dist',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  minify: prod,
});

if (prod) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
}
```

- [ ] **Step 5: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Zen Bookmarks",
  "version": "1.0.0",
  "description": "Sidebar bookmark panel with grouped, color-coded, collapsible sections",
  "permissions": ["bookmarks", "storage"],
  "sidebar_action": {
    "default_panel": "sidebar/sidebar.html",
    "default_title": "Zen Bookmarks",
    "default_icon": {
      "48": "icons/icon-48.svg"
    }
  },
  "commands": {
    "_execute_sidebar_action": {
      "suggested_key": {
        "default": "Alt+B"
      },
      "description": "Toggle Zen Bookmarks sidebar"
    }
  },
  "options_ui": {
    "page": "options/options.html",
    "browser_style": false
  }
}
```

- [ ] **Step 6: Create src/globals.d.ts**

```typescript
import type { Browser } from 'webextension-polyfill';

declare global {
  const browser: Browser;
}
```

- [ ] **Step 7: Create icons/icon-48.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="#7aa2f7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 6h28a2 2 0 0 1 2 2v32l-16-8-16 8V8a2 2 0 0 1 2-2z"/>
</svg>
```

- [ ] **Step 8: Verify tsc runs without errors**

Run: `npx tsc -noEmit -skipLibCheck`

Expected: no errors (some files don't exist yet — that's fine at this stage; just ensure the config itself is valid by checking `tsconfig.json` is parseable).

- [ ] **Step 9: Commit**

```bash
git add manifest.json package.json package-lock.json tsconfig.json esbuild.config.mjs src/globals.d.ts icons/icon-48.svg
git commit -m "chore: scaffold Firefox WebExtension project"
```

---

## Task 2: Copy Unchanged Source Files

**Files:**
- Create: `src/types.ts` (copy from obsidianBookmarks)
- Create: `src/MarkdownParser.ts` (copy from obsidianBookmarks)
- Create: `tests/MarkdownParser.test.ts` (copy from obsidianBookmarks)

- [ ] **Step 1: Copy types.ts**

Create `src/types.ts`:

```typescript
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
  groupId: string | null;
  order: number;
}

export interface BookmarkGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface PluginData {
  groups: BookmarkGroup[];
  bookmarks: Bookmark[];
}

export const DEFAULT_DATA: PluginData = {
  groups: [],
  bookmarks: [],
};
```

- [ ] **Step 2: Copy MarkdownParser.ts**

Create `src/MarkdownParser.ts` with full content from the obsidianBookmarks source (copy verbatim — it has zero Obsidian dependencies):

```typescript
import type { PluginData, Bookmark, BookmarkGroup } from './types';

const HEADING_RE = /^###\s+(.+)$/;
const LINK_RE = /^-\s+\[([^\]]+)\]\((.+)\)$/;

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)));
}

function uuid(): string {
  return crypto.randomUUID();
}

export function parseMarkdown(content: string): PluginData {
  const groups: BookmarkGroup[] = [];
  const bookmarks: Bookmark[] = [];

  let currentGroupId: string | null = null;
  let groupOrder = 0;
  const groupCounters = new Map<string | null, number>();

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      const name = decodeEntities(headingMatch[1]?.trim() ?? '');
      const id = uuid();
      groups.push({ id, name, color: '#7aa2f7', collapsed: false, order: groupOrder++ });
      currentGroupId = id;
      groupCounters.set(id, 0);
      continue;
    }

    const linkMatch = LINK_RE.exec(line);
    if (linkMatch) {
      const title = decodeEntities(linkMatch[1] ?? '');
      const url = decodeEntities(linkMatch[2] ?? '');
      const counter = groupCounters.get(currentGroupId) ?? 0;
      bookmarks.push({ id: uuid(), title, url, icon: 'link', groupId: currentGroupId, order: counter });
      groupCounters.set(currentGroupId, counter + 1);
    }
  }

  return { groups, bookmarks };
}

export function serializeToMarkdown(data: PluginData): string {
  const lines: string[] = [];

  const ungrouped = data.bookmarks
    .filter(b => b.groupId === null)
    .sort((a, b) => a.order - b.order);

  for (const bm of ungrouped) {
    lines.push(`- [${bm.title}](${bm.url})`);
  }

  const groups = [...data.groups].sort((a, b) => a.order - b.order);

  for (const group of groups) {
    if (lines.length > 0) lines.push('');
    lines.push(`### ${group.name}`);
    const members = data.bookmarks
      .filter(b => b.groupId === group.id)
      .sort((a, b) => a.order - b.order);
    for (const bm of members) {
      lines.push(`- [${bm.title}](${bm.url})`);
    }
  }

  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}
```

- [ ] **Step 3: Copy MarkdownParser.test.ts**

Create `tests/MarkdownParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/MarkdownParser';

describe('parseMarkdown', () => {
  it('parses grouped bookmarks under ### headings', () => {
    const md = `### AI\n- [Graphify](https://github.com/graphify)\n- [NoteGPT](https://notegpt.io)`;
    const result = parseMarkdown(md);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.name).toBe('AI');
    expect(result.bookmarks).toHaveLength(2);
    expect(result.bookmarks[0]?.title).toBe('Graphify');
    expect(result.bookmarks[0]?.url).toBe('https://github.com/graphify');
    expect(result.bookmarks[0]?.groupId).toBe(result.groups[0]?.id);
  });

  it('places bookmarks before first heading as ungrouped', () => {
    const md = `- [FlowTunes](https://flowtunes.app)\n### AI\n- [NoteGPT](https://notegpt.io)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks[0]?.groupId).toBeNull();
    expect(result.bookmarks[0]?.title).toBe('FlowTunes');
    expect(result.bookmarks[1]?.groupId).toBe(result.groups[0]?.id);
  });

  it('decodes HTML entities in URLs', () => {
    const md = `- [Samples](https://youtube.com?v=abc&amp;list=xyz)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks[0]?.url).toBe('https://youtube.com?v=abc&list=xyz');
  });

  it('decodes &#39; entity in titles', () => {
    const md = `- [Don&#39;t Miss](https://example.com)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks[0]?.title).toBe("Don't Miss");
  });

  it('assigns sequential order within each group', () => {
    const md = `### AI\n- [A](https://a.com)\n- [B](https://b.com)\n- [C](https://c.com)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks[0]?.order).toBe(0);
    expect(result.bookmarks[1]?.order).toBe(1);
    expect(result.bookmarks[2]?.order).toBe(2);
  });

  it('assigns sequential order to groups', () => {
    const md = `### AI\n- [A](https://a.com)\n### Biz\n- [B](https://b.com)`;
    const result = parseMarkdown(md);
    expect(result.groups[0]?.order).toBe(0);
    expect(result.groups[1]?.order).toBe(1);
  });

  it('silently skips lines that do not match either pattern', () => {
    const md = `### AI\nsome random text\n- [A](https://a.com)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks).toHaveLength(1);
  });

  it('returns empty data for empty input', () => {
    const result = parseMarkdown('');
    expect(result.groups).toHaveLength(0);
    expect(result.bookmarks).toHaveLength(0);
  });

  it('sets default icon to "link" for all bookmarks', () => {
    const md = `- [Test](https://test.com)`;
    const result = parseMarkdown(md);
    expect(result.bookmarks[0]?.icon).toBe('link');
  });
});
```

- [ ] **Step 4: Run parser tests**

Run: `npm test`

Expected: all MarkdownParser tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/MarkdownParser.ts tests/MarkdownParser.test.ts
git commit -m "feat: add types, MarkdownParser, and parser tests"
```

---

## Task 3: bookmarkTree.ts — Pure Tree Conversion

**Files:**
- Create: `src/bookmarkTree.ts`
- Create: `tests/bookmarkTree.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/bookmarkTree.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm all tests fail**

Run: `npm test -- bookmarkTree`

Expected: FAIL — `src/bookmarkTree.ts` does not exist.

- [ ] **Step 3: Implement bookmarkTree.ts**

Create `src/bookmarkTree.ts`:

```typescript
import type { PluginData, BookmarkGroup, Bookmark } from './types';
import type { MetadataStore } from './BookmarkStore';

type TreeNode = browser.bookmarks.BookmarkTreeNode;

export function treeToPluginData(rootNodes: TreeNode[], metadata: MetadataStore): PluginData {
  const groups: BookmarkGroup[] = [];
  const bookmarks: Bookmark[] = [];

  const root = rootNodes[0];
  if (!root?.children) return { groups, bookmarks };

  let groupOrder = 0;
  let ungroupedOrder = 0;

  for (const container of root.children) {
    if (!container.children) continue;

    for (const node of container.children) {
      if (node.type === 'separator') continue;

      if (node.url === undefined && node.children !== undefined) {
        const meta = metadata[node.id] ?? {};
        groups.push({
          id: node.id,
          name: node.title,
          color: meta.color ?? '#7aa2f7',
          collapsed: meta.collapsed ?? false,
          order: groupOrder++,
        });

        let bookmarkOrder = 0;
        for (const child of node.children) {
          if (!child.url || child.type === 'separator') continue;
          const childMeta = metadata[child.id] ?? {};
          bookmarks.push({
            id: child.id,
            title: child.title,
            url: child.url,
            icon: childMeta.icon ?? 'link',
            groupId: node.id,
            order: bookmarkOrder++,
          });
        }
      } else if (node.url) {
        const meta = metadata[node.id] ?? {};
        bookmarks.push({
          id: node.id,
          title: node.title,
          url: node.url,
          icon: meta.icon ?? 'link',
          groupId: null,
          order: ungroupedOrder++,
        });
      }
    }
  }

  return { groups, bookmarks };
}
```

> **Note on import cycle:** `bookmarkTree.ts` imports `MetadataStore` from `BookmarkStore.ts`. `BookmarkStore.ts` imports `treeToPluginData` from `bookmarkTree.ts`. This is a circular type-only dependency. Resolve it by moving the `MetadataStore` type to `types.ts` if the TypeScript compiler complains. At that point, update both files to import from `./types`.

- [ ] **Step 4: Run tests**

Run: `npm test -- bookmarkTree`

Expected: all 12 bookmarkTree tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/bookmarkTree.ts tests/bookmarkTree.test.ts
git commit -m "feat: add bookmarkTree treeToPluginData conversion"
```

---

## Task 4: icons.ts — Lucide Icon Wrapper

**Files:**
- Create: `src/icons.ts`

No unit tests needed — this is a thin wrapper over a third-party library. Verified visually during sidebar testing (Task 10).

- [ ] **Step 1: Create src/icons.ts**

```typescript
import { createElement } from 'lucide';
import {
  Link, Globe, Bookmark, Star, Heart, Home, Folder, File,
  Code, Code2, Terminal, Brain, Cpu, Database, Server, Cloud,
  Music, Video, Image, Camera, Mail, MessageCircle, Phone,
  Map, MapPin, Navigation, ShoppingCart, CreditCard, DollarSign,
  TrendingUp, BarChart, PieChart, Activity, Zap, Newspaper,
  Book, BookOpen, GraduationCap, Pencil, Edit, Wrench, Settings,
  Search, Eye, Lock, Key, Shield, Flag, Tag, Calendar,
  Clock, Timer, Bell, Rss, Wifi, Download, Upload, Share2,
  ExternalLink, Play, Youtube, Github, Twitter, Linkedin,
  Instagram, Reddit, Slack, Figma, Layers, Layout, Monitor,
  Smartphone, Tablet, Headphones, Mic, Speaker, Sun, Moon,
  CloudRain, Wind, Coffee, Pizza, Car, Plane, Ship, Bike,
  ChevronRight, ChevronDown, Plus, Trash2, Minus, RefreshCw,
} from 'lucide';

type IconNode = readonly (readonly [string, Record<string, string | number>])[];

const ICONS: Record<string, IconNode> = {
  'link': Link, 'globe': Globe, 'bookmark': Bookmark, 'star': Star,
  'heart': Heart, 'home': Home, 'folder': Folder, 'file': File,
  'code': Code, 'code-2': Code2, 'terminal': Terminal, 'brain': Brain,
  'cpu': Cpu, 'database': Database, 'server': Server, 'cloud': Cloud,
  'music': Music, 'video': Video, 'image': Image, 'camera': Camera,
  'mail': Mail, 'message-circle': MessageCircle, 'phone': Phone,
  'map': Map, 'map-pin': MapPin, 'navigation': Navigation,
  'shopping-cart': ShoppingCart, 'credit-card': CreditCard,
  'dollar-sign': DollarSign, 'trending-up': TrendingUp,
  'bar-chart': BarChart, 'pie-chart': PieChart, 'activity': Activity,
  'zap': Zap, 'newspaper': Newspaper, 'book': Book, 'book-open': BookOpen,
  'graduation-cap': GraduationCap, 'pencil': Pencil, 'edit': Edit,
  'tool': Wrench, 'settings': Settings, 'search': Search, 'eye': Eye,
  'lock': Lock, 'key': Key, 'shield': Shield, 'flag': Flag, 'tag': Tag,
  'calendar': Calendar, 'clock': Clock, 'timer': Timer, 'bell': Bell,
  'rss': Rss, 'wifi': Wifi, 'download': Download, 'upload': Upload,
  'share': Share2, 'external-link': ExternalLink, 'play': Play,
  'youtube': Youtube, 'github': Github, 'twitter': Twitter,
  'linkedin': Linkedin, 'instagram': Instagram, 'reddit': Reddit,
  'slack': Slack, 'figma': Figma, 'layers': Layers, 'layout': Layout,
  'monitor': Monitor, 'smartphone': Smartphone, 'tablet': Tablet,
  'headphones': Headphones, 'mic': Mic, 'speaker': Speaker,
  'sun': Sun, 'moon': Moon, 'cloud-rain': CloudRain, 'wind': Wind,
  'coffee': Coffee, 'pizza': Pizza, 'car': Car, 'plane': Plane,
  'ship': Ship, 'bike': Bike, 'chevron-right': ChevronRight,
  'chevron-down': ChevronDown, 'plus': Plus, 'trash': Trash2,
  'minus': Minus, 'refresh-cw': RefreshCw,
};

export const ICON_NAMES = Object.keys(ICONS).filter(
  k => !['chevron-right', 'chevron-down', 'plus', 'trash', 'minus', 'refresh-cw'].includes(k)
);

export function injectIcon(el: HTMLElement, name: string, size = 14): void {
  const data = ICONS[name] ?? ICONS['link']!;
  el.innerHTML = '';
  const svg = createElement(data as any, {
    width: size,
    height: size,
    'stroke-width': 2,
  });
  el.appendChild(svg);
}
```

> **If lucide export names conflict:** Some lucide exports may differ from what's listed above (e.g., `Tool` may be `Wrench`, `Share` may be `Share2`). Check the installed lucide version's exports with `node -e "import('lucide').then(m => console.log(Object.keys(m).filter(k => k[0] === k[0].toUpperCase()).join(',')))"` and adjust the import names accordingly. The icon names in the `ICONS` map (the keys) must stay as-is — only the import names on the left side of the map entries may change.

- [ ] **Step 2: Verify lucide builds without type errors**

Run: `npx tsc -noEmit -skipLibCheck`

Expected: no errors from `src/icons.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/icons.ts
git commit -m "feat: add Lucide icon injection wrapper"
```

---

## Task 5: BookmarkStore.ts — Async Browser API Store

**Files:**
- Create: `src/BookmarkStore.ts`
- Create: `tests/BookmarkStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/BookmarkStore.test.ts`:

```typescript
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
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
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
    mockBookmarks.remove.mockResolvedValue(undefined);
    mockBookmarks.getTree.mockResolvedValue(mockTree([]));
    const store = await makeStore([
      { id: 'f1', title: 'Dev', children: [{ id: 'b1', title: 'GitHub', url: 'https://github.com' }] },
    ]);
    await store.deleteGroup('f1');
    expect(mockBookmarks.move).toHaveBeenCalledWith('b1', { parentId: UNFILED });
    expect(mockBookmarks.remove).toHaveBeenCalledWith('f1');
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
```

- [ ] **Step 2: Run to confirm tests fail**

Run: `npm test -- BookmarkStore`

Expected: FAIL — `src/BookmarkStore.ts` does not exist.

- [ ] **Step 3: Implement BookmarkStore.ts**

Create `src/BookmarkStore.ts`:

```typescript
import type { PluginData, Bookmark, BookmarkGroup } from './types';
import { treeToPluginData } from './bookmarkTree';

export interface NodeMetadata {
  color?: string;
  icon?: string;
  collapsed?: boolean;
}

export type MetadataStore = Record<string, NodeMetadata>;

const METADATA_KEY = 'zen_bookmarks_metadata';
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
    this.cache = treeToPluginData(tree, this.metadata);
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

  private cleanOrphanMetadata(root: browser.bookmarks.BookmarkTreeNode): void {
    const allIds = new Set<string>();
    const walk = (node: browser.bookmarks.BookmarkTreeNode) => {
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
    await browser.bookmarks.remove(id);
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
```

- [ ] **Step 4: Run BookmarkStore tests**

Run: `npm test -- BookmarkStore`

Expected: all BookmarkStore tests pass.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/BookmarkStore.ts tests/BookmarkStore.test.ts
git commit -m "feat: add async BookmarkStore over browser.bookmarks API"
```

---

## Task 6: ColorPickerModal.ts — dialog Rewrite

**Files:**
- Create: `src/ColorPickerModal.ts`

- [ ] **Step 1: Create src/ColorPickerModal.ts**

```typescript
const COLORS = [
  { hex: '#7aa2f7', label: 'Blue' },
  { hex: '#f7768e', label: 'Red' },
  { hex: '#9ece6a', label: 'Green' },
  { hex: '#ff9e64', label: 'Orange' },
  { hex: '#bb9af7', label: 'Purple' },
  { hex: '#73daca', label: 'Teal' },
  { hex: '#e0af68', label: 'Yellow' },
  { hex: '#2ac3de', label: 'Cyan' },
  { hex: '#1abc9c', label: 'Emerald' },
  { hex: '#c0caf5', label: 'Lavender' },
  { hex: '#000000', label: 'Black' },
  { hex: '#2a2a2a', label: 'Dark Gray' },
  { hex: '#5a5a5a', label: 'Medium Gray' },
  { hex: '#a0a0a0', label: 'Light Gray' },
];

export function openColorPicker(onChoose: (hex: string) => void): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'zb-dialog ob-color-picker';

  const h4 = document.createElement('h4');
  h4.textContent = 'Choose group color';
  dialog.appendChild(h4);

  const grid = document.createElement('div');
  grid.className = 'ob-color-grid';

  for (const { hex, label } of COLORS) {
    const swatch = document.createElement('div');
    swatch.className = 'ob-color-swatch';
    swatch.style.backgroundColor = hex;
    swatch.setAttribute('aria-label', `${label} (${hex})`);
    swatch.setAttribute('role', 'button');
    swatch.setAttribute('tabindex', '0');

    const select = () => { onChoose(hex); dialog.close(); dialog.remove(); };
    swatch.addEventListener('click', select);
    swatch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
    grid.appendChild(swatch);
  }

  dialog.appendChild(grid);
  document.body.appendChild(dialog);
  dialog.showModal();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ColorPickerModal.ts
git commit -m "feat: add ColorPickerModal as native dialog"
```

---

## Task 7: IconPickerModal.ts — dialog Rewrite

**Files:**
- Create: `src/IconPickerModal.ts`

- [ ] **Step 1: Create src/IconPickerModal.ts**

```typescript
import { injectIcon, ICON_NAMES } from './icons';

export function openIconPicker(onChoose: (icon: string) => void): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'zb-dialog ob-icon-picker';

  const h4 = document.createElement('h4');
  h4.textContent = 'Choose icon';
  dialog.appendChild(h4);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search icons...';
  input.className = 'ob-icon-search';
  dialog.appendChild(input);

  const grid = document.createElement('div');
  grid.className = 'ob-icon-grid';
  dialog.appendChild(grid);

  let query = '';

  const renderGrid = () => {
    grid.innerHTML = '';
    const filtered = ICON_NAMES.filter(name => name.includes(query));
    for (const name of filtered) {
      const btn = document.createElement('div');
      btn.className = 'ob-icon-btn';
      btn.setAttribute('aria-label', name);
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      injectIcon(btn, name);

      const select = () => { onChoose(name); dialog.close(); dialog.remove(); };
      btn.addEventListener('click', select);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
      grid.appendChild(btn);
    }
  };

  input.addEventListener('input', () => {
    query = input.value.toLowerCase().trim();
    renderGrid();
  });

  renderGrid();
  document.body.appendChild(dialog);
  dialog.showModal();
  input.focus();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/IconPickerModal.ts
git commit -m "feat: add IconPickerModal as native dialog"
```

---

## Task 8: BookmarkView.ts — Vanilla DOM Rewrite

**Files:**
- Create: `src/BookmarkView.ts`

- [ ] **Step 1: Create src/BookmarkView.ts**

```typescript
import type { BookmarkStore } from './BookmarkStore';
import type { BookmarkGroup, Bookmark } from './types';
import { injectIcon } from './icons';
import { openColorPicker } from './ColorPickerModal';
import { openIconPicker } from './IconPickerModal';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function showContextMenu(
  event: MouseEvent,
  items: Array<{ label: string; icon: string; onClick: () => void } | 'separator'>
): void {
  document.getElementById('zb-context-menu')?.remove();

  const menu = el('ul', 'zb-context-menu');
  menu.id = 'zb-context-menu';

  for (const item of items) {
    if (item === 'separator') {
      menu.appendChild(el('li', 'zb-menu-sep'));
      continue;
    }
    const li = el('li', 'zb-menu-item');
    const iconEl = el('span', 'zb-menu-icon');
    injectIcon(iconEl, item.icon);
    li.appendChild(iconEl);
    li.appendChild(document.createTextNode(item.label));
    li.addEventListener('click', () => { menu.remove(); item.onClick(); });
    menu.appendChild(li);
  }

  document.body.appendChild(menu);
  menu.style.left = `${Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8)}px`;

  setTimeout(() => {
    const dismiss = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.remove();
        document.removeEventListener('click', dismiss, true);
      }
    };
    document.addEventListener('click', dismiss, true);
  }, 0);
}

function openTextPrompt(title: string, initial: string, onConfirm: (val: string) => void): void {
  const dialog = el('dialog', 'zb-dialog');
  const h4 = el('h4', undefined, title);
  const input = el('input', 'ob-rename-input');
  input.type = 'text';
  input.value = initial;
  const btn = el('button', 'mod-cta', 'Confirm');

  const confirm = () => {
    const val = input.value.trim();
    if (val) { onConfirm(val); dialog.close(); dialog.remove(); }
  };
  btn.addEventListener('click', confirm);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') confirm();
    if (ev.key === 'Escape') { dialog.close(); dialog.remove(); }
  });

  dialog.append(h4, input, btn);
  document.body.appendChild(dialog);
  dialog.showModal();
  input.select();
  input.focus();
}

function openAddBookmarkPrompt(store: BookmarkStore, groupId: string | null): void {
  const dialog = el('dialog', 'zb-dialog');
  const h4 = el('h4', undefined, 'Add bookmark');
  const urlInput = el('input', 'ob-rename-input');
  urlInput.type = 'text';
  urlInput.placeholder = 'URL (https://...)';
  const titleInput = el('input', 'ob-rename-input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Title';
  const btn = el('button', 'mod-cta', 'Add');

  btn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    const title = titleInput.value.trim() || url;
    if (url) { void store.addBookmark(title, url, groupId); dialog.close(); dialog.remove(); }
  });
  urlInput.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { dialog.close(); dialog.remove(); } });

  dialog.append(h4, urlInput, titleInput, btn);
  document.body.appendChild(dialog);
  dialog.showModal();
  urlInput.focus();
}

function openConfirmPrompt(title: string, desc: string, onConfirm: () => void): void {
  const dialog = el('dialog', 'zb-dialog');
  const h4 = el('h4', undefined, title);
  const p = el('p', undefined, desc);
  const row = el('div', 'ob-confirm-row');
  const cancel = el('button', undefined, 'Cancel');
  const del = el('button', 'mod-warning', 'Delete');

  cancel.addEventListener('click', () => { dialog.close(); dialog.remove(); });
  del.addEventListener('click', () => { onConfirm(); dialog.close(); dialog.remove(); });

  row.append(cancel, del);
  dialog.append(h4, p, row);
  document.body.appendChild(dialog);
  dialog.showModal();
}

export class BookmarkView {
  private container: HTMLElement;
  private store: BookmarkStore;
  private unsubscribe: () => void;

  constructor(container: HTMLElement, store: BookmarkStore) {
    this.container = container;
    this.store = store;
    this.unsubscribe = store.onChange(() => this.render());
    this.render();
  }

  destroy(): void {
    this.unsubscribe();
  }

  render(): void {
    this.container.innerHTML = '';
    this.container.className = 'ob-bookmark-view';

    const toolbar = el('div', 'zb-toolbar');
    const addGroupBtn = el('button', 'zb-toolbar-btn', '+ Group');
    addGroupBtn.title = 'Add group';
    addGroupBtn.addEventListener('click', () => {
      openTextPrompt('New group name', '', (name) => {
        void this.store.addGroup(name, '#7aa2f7');
      });
    });
    toolbar.appendChild(addGroupBtn);
    this.container.appendChild(toolbar);

    const { groups, bookmarks } = this.store.getData();
    const sorted = [...groups].sort((a, b) => a.order - b.order);

    for (const group of sorted) {
      this.renderGroup(group, bookmarks);
    }

    const ungrouped = bookmarks
      .filter(b => b.groupId === null)
      .sort((a, b) => a.order - b.order);

    const divider = el('div', 'ob-ungrouped-divider');
    divider.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, [
        { label: 'Add bookmark', icon: 'plus', onClick: () => openAddBookmarkPrompt(this.store, null) },
      ]);
    });
    this.container.appendChild(divider);

    for (const b of ungrouped) {
      this.container.appendChild(this.makeBookmarkRow(b, null));
    }
  }

  private renderGroup(group: BookmarkGroup, allBookmarks: Bookmark[]): void {
    const groupEl = el('div', 'ob-group');

    const header = el('div', 'ob-group-header');
    header.style.setProperty('--group-color', group.color);

    const chevron = el('div', 'ob-chevron');
    injectIcon(chevron, group.collapsed ? 'chevron-right' : 'chevron-down');

    const dot = el('div', 'ob-group-dot');
    dot.style.backgroundColor = group.color;

    const name = el('div', 'ob-group-name', group.name);
    const members = allBookmarks.filter(b => b.groupId === group.id).sort((a, b) => a.order - b.order);
    const count = el('div', 'ob-group-count', String(members.length));

    header.append(chevron, dot, name, count);
    header.addEventListener('click', () => void this.store.setGroupCollapsed(group.id, !group.collapsed));
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, [
        { label: 'Rename', icon: 'pencil', onClick: () => openTextPrompt('Rename group', group.name, (val) => void this.store.renameGroup(group.id, val)) },
        { label: 'Change color', icon: 'palette', onClick: () => openColorPicker((hex) => void this.store.setGroupColor(group.id, hex)) },
        { label: 'Add bookmark', icon: 'plus', onClick: () => openAddBookmarkPrompt(this.store, group.id) },
        'separator',
        { label: 'Delete group', icon: 'trash', onClick: () => openConfirmPrompt(`Delete group "${group.name}"?`, 'Bookmarks will become ungrouped.', () => void this.store.deleteGroup(group.id)) },
      ]);
    });

    groupEl.appendChild(header);

    if (!group.collapsed) {
      const list = el('div', 'ob-bookmark-list');
      for (const b of members) {
        list.appendChild(this.makeBookmarkRow(b, group.color));
      }
      groupEl.appendChild(list);
    }

    this.container.appendChild(groupEl);
  }

  private makeBookmarkRow(bookmark: Bookmark, groupColor: string | null): HTMLElement {
    const row = el('div', 'ob-bookmark-item');

    const iconEl = el('div', 'ob-bookmark-icon');
    if (bookmark.icon !== 'link') {
      if (groupColor) iconEl.style.color = groupColor;
      injectIcon(iconEl, bookmark.icon);
    } else {
      try {
        const domain = new URL(bookmark.url).hostname;
        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        img.width = 14;
        img.height = 14;
        img.addEventListener('error', () => {
          img.remove();
          if (groupColor) iconEl.style.color = groupColor;
          injectIcon(iconEl, 'link');
        });
        iconEl.appendChild(img);
      } catch {
        if (groupColor) iconEl.style.color = groupColor;
        injectIcon(iconEl, 'link');
      }
    }

    const title = el('div', 'ob-bookmark-title', bookmark.title);
    row.append(iconEl, title);
    row.addEventListener('click', () => window.open(bookmark.url, '_blank'));
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showBookmarkContextMenu(e, bookmark);
    });

    return row;
  }

  private showBookmarkContextMenu(e: MouseEvent, bookmark: Bookmark): void {
    const { groups } = this.store.getData();

    showContextMenu(e, [
      { label: 'Rename', icon: 'pencil', onClick: () => openTextPrompt('Rename bookmark', bookmark.title, (val) => void this.store.renameBookmark(bookmark.id, val)) },
      { label: 'Change icon', icon: 'image', onClick: () => openIconPicker((icon) => void this.store.setBookmarkIcon(bookmark.id, icon)) },
      ...(bookmark.icon !== 'link' ? [{ label: 'Reset to favicon', icon: 'refresh-cw', onClick: () => void this.store.setBookmarkIcon(bookmark.id, 'link') }] : []),
      { label: 'Move to group', icon: 'folder', onClick: () => this.showMoveMenu(e, bookmark, groups) },
      'separator' as const,
      { label: 'Delete', icon: 'trash', onClick: () => void this.store.deleteBookmark(bookmark.id) },
    ]);
  }

  private showMoveMenu(e: MouseEvent, bookmark: Bookmark, groups: BookmarkGroup[]): void {
    showContextMenu(e, [
      { label: 'Ungrouped', icon: 'minus', onClick: () => void this.store.moveBookmark(bookmark.id, null) },
      ...groups.sort((a, b) => a.order - b.order).map(g => ({
        label: g.name,
        icon: 'folder',
        onClick: () => void this.store.moveBookmark(bookmark.id, g.id),
      })),
    ]);
  }
}
```

> **Note on `palette` icon:** `palette` may not exist in the Lucide subset defined in `icons.ts`. If injectIcon falls back to `link`, add `Palette` to the import list in `src/icons.ts` and add `'palette': Palette` to the ICONS map.

- [ ] **Step 2: Commit**

```bash
git add src/BookmarkView.ts src/ColorPickerModal.ts src/IconPickerModal.ts
git commit -m "feat: rewrite BookmarkView, ColorPickerModal, IconPickerModal with vanilla DOM"
```

---

## Task 9: Sidebar Files

**Files:**
- Create: `sidebar/sidebar.html`
- Create: `sidebar/sidebar.ts`
- Create: `sidebar/sidebar.css`

- [ ] **Step 1: Create sidebar/sidebar.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zen Bookmarks</title>
  <link rel="stylesheet" href="sidebar.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../dist/sidebar.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create sidebar/sidebar.ts**

```typescript
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
```

- [ ] **Step 3: Create sidebar/sidebar.css**

```css
:root {
  --text-normal: #c0caf5;
  --text-muted: #9aa5ce;
  --text-faint: #565f89;
  --background-modifier-hover: rgba(255, 255, 255, 0.06);
  --background-modifier-border: rgba(255, 255, 255, 0.1);
  --background-primary: #1a1b26;
  --background-surface: #24283b;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background: var(--background-primary);
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--text-normal);
  font-size: 13px;
  overflow-y: auto;
}

/* Toolbar */
.zb-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.zb-toolbar-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 11.5px;
  padding: 3px 8px;
}

.zb-toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-normal);
}

/* Bookmark view */
.ob-bookmark-view { padding: 4px 0; }

/* Group */
.ob-group { margin-bottom: 2px; }

.ob-group-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  cursor: pointer;
  user-select: none;
  background-color: color-mix(in srgb, var(--group-color) 10%, transparent);
  width: 100%;
}

.ob-group-header:hover {
  background-color: color-mix(in srgb, var(--group-color) 18%, transparent);
}

.ob-chevron {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.ob-group-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ob-group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-normal);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ob-group-count { font-size: 10px; color: var(--text-faint); }

/* Bookmark list */
.ob-bookmark-list { padding: 2px 0 4px 0; }

.ob-bookmark-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 30px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-muted);
  width: 100%;
}

.ob-bookmark-item:hover {
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
}

.ob-bookmark-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  opacity: 0.75;
}

.ob-bookmark-icon img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  border-radius: 2px;
  filter: grayscale(1) opacity(0.55);
}

.ob-bookmark-item:hover .ob-bookmark-icon img { filter: grayscale(0.2) opacity(0.9); }
.ob-bookmark-item:hover .ob-bookmark-icon { opacity: 1; }

.ob-bookmark-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Ungrouped section */
.ob-ungrouped-divider {
  border-top: 1px solid var(--background-modifier-border);
  margin: 6px 0 4px;
  padding-top: 4px;
  min-height: 8px;
}

/* Context menu */
.zb-context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--background-surface);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 4px 0;
  list-style: none;
  margin: 0;
  min-width: 160px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.zb-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-normal);
}

.zb-menu-item:hover { background: var(--background-modifier-hover); }

.zb-menu-sep {
  height: 1px;
  background: var(--background-modifier-border);
  margin: 4px 0;
}

.zb-menu-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
}

/* Dialogs */
.zb-dialog {
  background: var(--background-surface);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  padding: 20px;
  color: var(--text-normal);
  min-width: 280px;
  max-width: 360px;
}

.zb-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }

.zb-dialog h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.ob-rename-input {
  width: 100%;
  margin-bottom: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 13px;
  display: block;
}

.zb-dialog button {
  padding: 6px 14px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  cursor: pointer;
  font-size: 12.5px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-normal);
}

button.mod-cta {
  background: #7aa2f7;
  color: #1a1b26;
  border-color: transparent;
  font-weight: 600;
}

button.mod-warning {
  background: #f7768e;
  color: #1a1b26;
  border-color: transparent;
  font-weight: 600;
}

.ob-confirm-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}

/* Color picker */
.ob-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 8px 0;
}

.ob-color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s, border-color 0.1s;
}

.ob-color-swatch:hover {
  transform: scale(1.15);
  border-color: var(--text-normal);
}

/* Icon picker */
.ob-icon-search {
  width: 100%;
  margin-bottom: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 13px;
  display: block;
}

.ob-icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
}

.ob-icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
}

.ob-icon-btn:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.ob-icon-btn svg, .ob-color-swatch svg { pointer-events: none; }

/* SVG icons */
svg { display: block; }
```

- [ ] **Step 4: Commit**

```bash
git add sidebar/
git commit -m "feat: add sidebar HTML, TypeScript entry, and CSS"
```

---

## Task 10: Options Page

**Files:**
- Create: `options/options.html`
- Create: `options/options.ts`

- [ ] **Step 1: Create options/options.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Zen Bookmarks Settings</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1b26;
      color: #c0caf5;
      padding: 32px;
      max-width: 520px;
    }
    h1 { font-size: 20px; margin-bottom: 24px; }
    h2 { font-size: 14px; color: #9aa5ce; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    p { font-size: 13px; color: #9aa5ce; margin: 0 0 12px; }
    .shortcut-value {
      display: inline-block;
      background: #24283b;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 13px;
      font-family: monospace;
    }
    a { color: #7aa2f7; font-size: 13px; }
    button {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      color: #c0caf5;
      cursor: pointer;
      font-size: 13px;
      padding: 6px 14px;
      margin-right: 8px;
    }
    button:hover { background: rgba(255,255,255,0.1); }
    #status { font-size: 12px; color: #9ece6a; margin-top: 8px; min-height: 18px; }
  </style>
</head>
<body>
  <h1>Zen Bookmarks</h1>

  <h2>Keyboard Shortcut</h2>
  <p>Current shortcut: <span class="shortcut-value" id="shortcut">Loading…</span></p>
  <p><a href="about:addons" id="addons-link">Change in Add-ons Manager →</a></p>

  <h2>Data</h2>
  <p>Colors and custom icons are stored separately from your browser bookmarks.</p>
  <button id="export-btn">Export as Markdown</button>
  <button id="reset-btn">Reset all colors & icons</button>
  <div id="status"></div>

  <script type="module" src="../dist/options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create options/options.ts**

```typescript
import { treeToPluginData } from '../src/bookmarkTree';
import { serializeToMarkdown } from '../src/MarkdownParser';
import type { MetadataStore } from '../src/BookmarkStore';

const METADATA_KEY = 'zen_bookmarks_metadata';

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
```

> **Note:** The options page uses `browser.tabs.create` to open `about:addons`. Add `"tabs"` to the `permissions` array in `manifest.json` for this to work. If you prefer not to add the tabs permission, replace the link with plain text instructions ("Open about:addons in the address bar").

- [ ] **Step 3: Add tabs permission to manifest.json**

Edit `manifest.json` — change:
```json
"permissions": ["bookmarks", "storage"],
```
to:
```json
"permissions": ["bookmarks", "storage", "tabs"],
```

- [ ] **Step 4: Commit**

```bash
git add options/ manifest.json
git commit -m "feat: add options page with shortcut display, export, and metadata reset"
```

---

## Task 11: Build and Install

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: `dist/sidebar.js` and `dist/options.js` created with no errors.

- [ ] **Step 2: Run all tests one final time**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Open Zen Browser and load the extension**

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json` from the project root

Expected: "Zen Bookmarks" appears in the extension list with no errors.

- [ ] **Step 4: Verify sidebar opens**

1. Press `Alt+B` (or use the sidebar toggle button)
2. Confirm the sidebar opens showing your browser's existing bookmarks
3. Right-click a group header and verify the context menu appears with Rename / Change color / Add bookmark / Delete group
4. Right-click a bookmark and verify Rename / Change icon / Move to group / Delete
5. Click the "+ Group" toolbar button, enter a name — confirm a new folder appears in the sidebar AND in Firefox's native bookmarks

- [ ] **Step 5: Verify options page**

1. Go to `about:addons` → Zen Bookmarks → Options
2. Confirm the keyboard shortcut displayed matches what was set
3. Click "Export as Markdown" — confirm a `.md` file downloads
4. Click "Reset all colors & icons" — confirm colors revert to default blue in the sidebar

- [ ] **Step 6: Final commit**

```bash
git add dist/
git commit -m "build: add compiled extension output"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sidebar panel (`browser.sidebarAction`)
- ✅ Grouped collapsible color-coded sections
- ✅ Full CRUD (add/rename/delete groups and bookmarks)
- ✅ Per-bookmark custom icons + favicon fallback
- ✅ Colors + icons stored in `browser.storage.local`
- ✅ Metadata orphan cleanup on load
- ✅ Keyboard shortcut (`_execute_sidebar_action`, suggested `Alt+B`)
- ✅ Options page with shortcut display and "change in about:addons" link
- ✅ Metadata reset button
- ✅ Markdown export
- ✅ `browser.bookmarks` events trigger sidebar reload
- ✅ Inline error text on load failure (Task 9, sidebar.ts catch block)
- ✅ Favicon `onerror` fallback (Task 8, BookmarkView.ts)

**Spec deviations:**
- Background service worker removed — sidebar handles events directly
- `"add group"` toolbar button added to sidebar (spec didn't specify UI for creating groups, but it's required for a usable product)

**Type consistency check:**
- `MetadataStore` imported from `BookmarkStore.ts` in `bookmarkTree.ts` — circular type-only import. If TypeScript rejects this, move `MetadataStore` and `NodeMetadata` to `src/types.ts` and update both files.
- `treeToPluginData` signature uses `browser.bookmarks.BookmarkTreeNode[]` — requires the `globals.d.ts` browser declaration to be present before compiling `bookmarkTree.ts`.
- `BookmarkView` calls `void this.store.addGroup(...)` etc. — all store methods are async; `void` discards the promise intentionally. This is correct.
- `openColorPicker` and `openIconPicker` are functions, not classes — `BookmarkView.ts` calls them correctly as functions.
