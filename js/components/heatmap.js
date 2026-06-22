/**
 * Heatmap component — CSS Grid of colored cells.
 * Usage: Heatmap.render(container, { cells: [{name, percent, attempts}], onClick })
 */
const Heatmap = {
  render(container, opts = {}) {
    const { cells = [], title = '', onClick = null } = opts;
    if (cells.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="empty-desc">暂无数据，开始做题后这里会显示错题分布热力图</p></div>';
      return;
    }

    let html = '';
    if (title) html += `<h3 style="margin-bottom:12px">${title}</h3>`;
    html += '<div class="heatmap-grid">';

    for (const cell of cells) {
      const pct = cell.percent || 0;
      const attempts = cell.attempts || 0;
      let cls = 'cell-none';
      if (attempts === 0) cls = 'cell-none';
      else if (pct < 60) cls = 'cell-hot';
      else if (pct < 80) cls = 'cell-warm';
      else cls = 'cell-cool';

      html += `
        <div class="heatmap-cell ${cls}" data-name="${cell.name}" style="cursor:${onClick ? 'pointer' : 'default'}">
          <div class="cell-name">${cell.name}</div>
          <div class="cell-pct">${attempts > 0 ? pct + '%' : '—'}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${attempts}次</div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    if (onClick) {
      container.querySelectorAll('.heatmap-cell').forEach(el => {
        el.addEventListener('click', () => onClick(el.dataset.name));
      });
    }
  }
};

export default Heatmap;
