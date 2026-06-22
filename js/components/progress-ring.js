/**
 * SVG Circular Progress Ring component.
 * Usage: ProgressRing.render(container, { percent: 67, size: 80, strokeWidth: 6 })
 */
const ProgressRing = {
  render(container, opts = {}) {
    const { percent = 0, size = 80, strokeWidth = 6, color = null, label = '' } = opts;
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
    const strokeColor = color || 'var(--accent)';

    container.innerHTML = `
      <svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="bg-circle" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${strokeWidth}"/>
        <circle class="fg-circle" cx="${size/2}" cy="${size/2}" r="${r}"
          stroke-width="${strokeWidth}" stroke="${strokeColor}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          transform="rotate(-90 ${size/2} ${size/2})"/>
        <text class="ring-text" x="${size/2}" y="${size/2}" text-anchor="middle" dy="0.35em">
          ${label || percent + '%'}
        </text>
      </svg>`;
  }
};

export default ProgressRing;
