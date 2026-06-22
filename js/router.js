/**
 * Hash-based SPA router.
 * Each page exports { mount(container, params), unmount() }.
 * Routes are defined with patterns that extract params from the hash.
 */

const Router = {
  _routes: [],
  _current: null,
  _container: null,

  /** Register a route pattern */
  on(pattern, handler) {
    // Convert :param patterns to regex
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }).replace(/\//g, '\\/');
    const regex = new RegExp('^' + regexStr + '(?:\\?(.*))?$');
    this._routes.push({ pattern, regex, paramNames, handler });
  },

  /** Parse query string from hash */
  _parseQuery(qs) {
    const params = {};
    if (qs) {
      qs.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return params;
  },

  /** Navigate to a hash route */
  go(hash) {
    window.location.hash = hash;
  },

  /** Called on hash change or initial load */
  async _resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryString] = hash.split('?');
    const query = this._parseQuery(queryString);

    for (const route of this._routes) {
      const match = path.match(route.regex);
      if (match) {
        // Build params object from named groups
        const params = { ...query };
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });

        // Unmount current page
        if (this._current && this._current.unmount) {
          this._current.unmount();
        }

        // Mount new page
        try {
          this._current = await route.handler(this._container, params);
        } catch (e) {
          console.error('[Router] Page mount error:', e);
          this._container.innerHTML = `<div class="error-state"><p>Page load failed</p><button onclick="location.reload()">Retry</button></div>`;
        }
        return;
      }
    }

    // 404 fallback
    this._container.innerHTML = `<div class="error-state"><h2>404</h2><p>Page not found</p><a href="#/">Go Home</a></div>`;
  },

  /** Initialize router */
  init(container) {
    this._container = container;
    window.addEventListener('hashchange', () => this._resolve());
    // Initial load
    return this._resolve();
  }
};

export default Router;
