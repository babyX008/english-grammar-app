/**
 * Toast notification component.
 * Usage: Toast.show('message', 'success' | 'error' | 'info')
 */
const Toast = {
  _container: null,

  _ensureContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = 'info', duration = 3000) {
    const container = this._ensureContainer();
    const icons = { success: '✓', error: '✗', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(60px)';
      el.style.transition = 'all 0.2s ease';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }
};

export default Toast;
