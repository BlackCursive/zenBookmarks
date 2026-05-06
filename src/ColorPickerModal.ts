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
