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
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  input.focus();
}
