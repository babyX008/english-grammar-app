/**
 * App Bootstrap — Initialize router, load data, mount shell.
 */
import Router from './router.js';
import HomePage from './pages/home.js';
import ModulePage from './pages/module.js';
import SummaryPage from './pages/summary.js';
import QuizPage from './pages/quiz.js';
import ResultPage from './pages/result.js';
import ImportPage from './pages/import.js';
import SettingsPage from './pages/settings.js';
import StatsPage from './pages/stats.js';
import WrongBookPage from './pages/wrongbook.js';

const App = {
  async init() {
    const main = document.getElementById('app-main');
    if (!main) { console.error('App shell not found'); return; }

    // Register routes
    Router.on('/', () => HomePage.mount(main));
    Router.on('/module/:id', (container, params) => ModulePage.mount(container, params));
    Router.on('/module/:id/sub/:subId/summary', (container, params) => SummaryPage.mount(container, params));
    Router.on('/module/:id/sub/:subId/quiz', (container, params) => QuizPage.mount(container, params));
    Router.on('/result/:sessionId', (container, params) => ResultPage.mount(container, params));
    Router.on('/wrongbook', (container) => WrongBookPage.mount(container));
    Router.on('/import', (container) => ImportPage.mount(container));
    Router.on('/settings', (container) => SettingsPage.mount(container));
    Router.on('/stats', (container) => StatsPage.mount(container));

    // Start router
    await Router.init(main);

    // Track nav link active states
    this._updateNav();
    window.addEventListener('hashchange', () => this._updateNav());
  },

  _updateNav() {
    const hash = window.location.hash.slice(1) || '/';
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', hash.startsWith(href.replace('#', '')) && href !== '#/');
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
