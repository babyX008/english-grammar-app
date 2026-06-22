/**
 * Home Page — Module grid with progress rings + search.
 */
import DataLoader from '../data-loader.js';
import Storage from '../storage.js';
import ProgressRing from '../components/progress-ring.js';
import Router from '../router.js';

const ICONS = ['📦', '👤', '🔢', '📌', '🎨', '⚡', '📍', '🔗', '🏃', '🚫', '🔑', '⏰', '🗣️'];

const HomePage = {
  async mount(container) {
    const userData = Storage.load();

    let totalAttempts = 0, totalCorrect = 0;
    for (const r of Object.values(userData.questions)) {
      totalAttempts += r.attempts || 0;
      totalCorrect += r.correct || 0;
    }
    const overallPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const wrongBookCount = Object.keys(Storage.getActiveWrongBook(userData)).length;
    const weakTopicsCount = Object.keys(Storage.getWeakTopics(userData)).filter(k => userData.weak_topics[k].proficiency !== 'ok').length;

    container.innerHTML = `
      <div class="page-enter">
        <div class="container" style="margin-bottom:28px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <h2 style="font-size:1.6rem;font-weight:700">英语语法练习</h2>
              <p style="color:var(--text-muted);font-size:0.9rem">总正确率 ${overallPct}% · ${wrongBookCount > 0 ? `<a href="#/wrongbook" style="color:var(--danger)">${wrongBookCount} 道错题待复习</a>` : '暂无错题 ✨'}</p>
            </div>
            <div style="display:flex;gap:8px">
              <a href="grammar.html" download class="btn btn-primary btn-sm" style="text-decoration:none">⬇️ 下载离线版</a>
              <button class="btn btn-outline btn-sm" id="btn-import">📥 导入</button>
              <button class="btn btn-outline btn-sm" id="btn-stats">📊 统计</button>
            </div>
          </div>
          ${weakTopicsCount > 0 ? `<div style="margin-top:10px;padding:10px 14px;background:var(--surface);border-radius:8px;border-left:3px solid var(--warning);font-size:0.85rem"><a href="#/wrongbook" style="color:var(--warning);text-decoration:none">⚠️ ${weakTopicsCount} 个薄弱知识点需要巩固 →</a></div>` : ''}
          <div class="search-bar" style="margin-top:16px">
            <input type="text" id="search-input" placeholder="🔍 搜索题目... (输入关键词筛选)" autocomplete="off">
          </div>
          <div class="search-results" id="search-results" style="display:none"></div>
        </div>
        <div class="module-grid container" id="module-grid">
          ${this._renderSkeletons(17)}
        </div>
      </div>`;

    container.querySelector('#btn-import').addEventListener('click', () => Router.go('#/import'));
    container.querySelector('#btn-stats').addEventListener('click', () => Router.go('#/stats'));

    const { modules } = await DataLoader.init();
    if (modules.length) {
      const grid = container.querySelector('#module-grid');
      grid.innerHTML = modules.map((m, i) => {
        const stats = DataLoader.getModuleStats(m.id, userData);
        const icon = m.icon || ICONS[i] || '📝';
        return `
          <div class="module-card" data-id="${m.id}">
            <div class="icon">${icon}</div>
            <div class="name">${m.name}</div>
            <div class="count">${m.sub_modules?.length || 0} 个子模块 · ${stats.total} 题</div>
            <div class="progress-info">
              <span id="ring-${m.id}"></span>
              <span>${stats.accuracy}% · ${stats.completedSubModules}/${stats.totalSubModules}</span>
            </div>
          </div>`;
      }).join('');

      for (const m of modules) {
        const stats = DataLoader.getModuleStats(m.id, userData);
        const ringEl = container.querySelector(`#ring-${m.id}`);
        if (ringEl) ProgressRing.render(ringEl, { percent: stats.accuracy, size: 36, strokeWidth: 4 });
      }

      grid.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => Router.go(`#/module/${card.dataset.id}`));
      });

      // Search
      const searchInput = container.querySelector('#search-input');
      const searchResults = container.querySelector('#search-results');
      const modGrid = container.querySelector('#module-grid');
      const allQuestions = DataLoader.getAll();

      if (searchInput && searchResults) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim().toLowerCase();
          if (q.length < 2) { searchResults.style.display = 'none'; modGrid.style.display = ''; return; }
          const matches = allQuestions.filter(item =>
            item.question.toLowerCase().includes(q) ||
            (item.options||[]).some(o => o.toLowerCase().includes(q))
          ).slice(0, 30);
          if (matches.length === 0) {
            searchResults.style.display = 'block'; modGrid.style.display = 'none';
            searchResults.innerHTML = '<div class="search-empty">未找到匹配题目</div>';
          } else {
            searchResults.style.display = 'block'; modGrid.style.display = 'none';
            searchResults.innerHTML = matches.map(item => {
              const ans = (item.options||[])[item.answer] || '';
              const modName = (modules.find(m => m.id === (item.sub_module_id||'').split('-')[0]) || {}).name || '';
              return `<div class="search-result-item" data-sub="${item.sub_module_id}" data-qid="${item.id}">
                <div class="sr-module">${modName}</div>
                <div class="sr-question">${item.question.replace(/___/g,'<u>　</u>')}</div>
                <div class="sr-answer">✓ ${ans}</div>
              </div>`;
            }).join('');
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                const subId = item.dataset.sub;
                const modId = subId.split('-')[0];
                Router.go(`#/module/${modId}/sub/${subId}/quiz`);
              });
            });
          }
        });
      }
    }
  },

  _renderSkeletons(n) {
    return Array(n).fill('<div class="module-card skeleton" style="height:140px"></div>').join('');
  },

  unmount() {}
};

export default HomePage;
