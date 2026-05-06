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
