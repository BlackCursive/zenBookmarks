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
