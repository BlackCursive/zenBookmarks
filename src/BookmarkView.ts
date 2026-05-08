import type { BookmarkStore } from './BookmarkStore';
import type { BookmarkGroup, Bookmark } from './types';
import { injectIcon } from './icons';
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
  dialog.addEventListener('close', () => dialog.remove());
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
  dialog.addEventListener('close', () => dialog.remove());
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
  dialog.addEventListener('close', () => dialog.remove());
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
    divider.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes('application/x-zb-bookmark')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      divider.classList.add('zb-drop-into');
    });
    divider.addEventListener('dragleave', () => divider.classList.remove('zb-drop-into'));
    divider.addEventListener('drop', (e) => {
      e.preventDefault();
      divider.classList.remove('zb-drop-into');
      const bookmarkId = e.dataTransfer?.getData('application/x-zb-bookmark');
      if (bookmarkId) void this.store.moveBookmark(bookmarkId, null);
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

    const name = el('div', 'ob-group-name', group.name);
    const members = allBookmarks.filter(b => b.groupId === group.id).sort((a, b) => a.order - b.order);
    const count = el('div', 'ob-group-count', String(members.length));

    header.append(chevron, name, count);
    header.addEventListener('click', () => void this.store.setGroupCollapsed(group.id, !group.collapsed));
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, [
        { label: 'Rename', icon: 'pencil', onClick: () => openTextPrompt('Rename group', group.name, (val) => void this.store.renameGroup(group.id, val)) },
        { label: 'Add bookmark', icon: 'plus', onClick: () => openAddBookmarkPrompt(this.store, group.id) },
        'separator',
        { label: 'Delete group', icon: 'trash', onClick: () => openConfirmPrompt(`Delete group "${group.name}"?`, 'Bookmarks will become ungrouped.', () => void this.store.deleteGroup(group.id)) },
      ]);
    });

    header.draggable = true;
    header.dataset['groupId'] = group.id;
    header.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('application/x-zb-group', group.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      header.classList.add('zb-dragging');
    });
    header.addEventListener('dragend', () => header.classList.remove('zb-dragging'));
    header.addEventListener('dragover', (e) => {
      const types = e.dataTransfer?.types ?? [];
      const isGroup = types.includes('application/x-zb-group');
      const isBookmark = types.includes('application/x-zb-bookmark');
      if (!isGroup && !isBookmark) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (isBookmark) {
        header.classList.add('zb-drop-into');
        return;
      }
      const rect = header.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      header.classList.toggle('zb-drop-before', !after);
      header.classList.toggle('zb-drop-after', after);
    });
    header.addEventListener('dragleave', () => {
      header.classList.remove('zb-drop-before', 'zb-drop-after', 'zb-drop-into');
    });
    header.addEventListener('drop', (e) => {
      e.preventDefault();
      header.classList.remove('zb-drop-before', 'zb-drop-after', 'zb-drop-into');
      const bookmarkId = e.dataTransfer?.getData('application/x-zb-bookmark');
      if (bookmarkId) {
        void this.store.moveBookmark(bookmarkId, group.id);
        return;
      }
      const draggedId = e.dataTransfer?.getData('application/x-zb-group');
      if (!draggedId || draggedId === group.id) return;
      const rect = header.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      void this.store.moveGroup(draggedId, group.id, after ? 'after' : 'before');
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
    row.addEventListener('click', () => { void browser.tabs.create({ url: bookmark.url }); });
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showBookmarkContextMenu(e, bookmark);
    });

    row.draggable = true;
    row.dataset['bookmarkId'] = bookmark.id;
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('application/x-zb-bookmark', bookmark.id);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      row.classList.add('zb-dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('zb-dragging'));

    return row;
  }

  private showBookmarkContextMenu(e: MouseEvent, bookmark: Bookmark): void {
    const { groups } = this.store.getData();

    showContextMenu(e, [
      { label: 'Open in new tab', icon: 'external-link', onClick: () => { void browser.tabs.create({ url: bookmark.url }); } },
      'separator' as const,
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
