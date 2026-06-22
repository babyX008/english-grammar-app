/**
 * Module Page — Sub-module list, grammar summary entry, practice options.
 */
import DataLoader from '../data-loader.js';
import Storage from '../storage.js';
import ProgressRing from '../components/progress-ring.js';
import Router from '../router.js';

const ModulePage = {
  async mount(container, params) {
    const { id } = params;
    const { modules } = await DataLoader.init();
    const userData = Storage.load();
    const module = modules.find(m => m.id === id);
    if (!module) { container.innerHTML = '<div class="error-state"><h2>404</h2><p>模块未找到</p></div>'; return; }

    const smList = module.sub_modules || [];
    container.innerHTML = `
      <div class="page-enter container">
        <div class="page-header">
          <a class="back-link" href="#/">← 返回首页</a>
          <h2>${module.icon || ''} ${module.name}</h2>
          <p class="subtitle">${smList.length} 个子模块</p>
        </div>
        <div class="submodule-list" id="sm-list">
          ${this._renderSMList(smList, userData)}
        </div>
      </div>`;

    // Wire clicks
    container.querySelectorAll('.submodule-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't navigate if clicking action buttons
        if (e.target.closest('.btn')) return;
        const smId = item.dataset.smid;
        Router.go(`#/module/${id}/sub/${smId}/summary`);
      });
    });

    container.querySelectorAll('.btn-practice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const smId = btn.dataset.smid;
        Router.go(`#/module/${id}/sub/${smId}/quiz`);
      });
    });

    container.querySelectorAll('.btn-wrong').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const smId = btn.dataset.smid;
        Router.go(`#/module/${id}/sub/${smId}/quiz?mode=wrong`);
      });
    });

    container.querySelectorAll('.btn-summary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const smId = btn.dataset.smid;
        Router.go(`#/module/${id}/sub/${smId}/summary`);
      });
    });
  },

  _renderSMList(smList, userData) {
    return smList.map(sm => {
      const qs = DataLoader.getBySubModule(sm.id);
      const total = qs.length;
      let correct = 0, attempts = 0;
      for (const q of qs) {
        const r = userData.questions[q.id];
        if (r) { attempts += r.attempts || 0; correct += r.correct || 0; }
      }
      const wrongBook = Storage.getActiveWrongBook(userData);
      const wrongCount = qs.filter(q => wrongBook[q.id]).length;
      const pct = total > 0 ? Math.round((correct / Math.max(attempts, 1)) * 100) : 0;

      return `
        <div class="submodule-item" data-smid="${sm.id}">
          <span id="ring-sm-${sm.id}" style="flex-shrink:0"></span>
          <div class="info" style="margin-left:12px">
            <div class="sm-name">${sm.name}</div>
            <div class="sm-meta">
              <span>${total} 题</span>
              <span>正确率 ${pct}%</span>
              ${wrongCount > 0 ? `<span style="color:var(--danger)">${wrongCount} 道错题</span>` : ''}
            </div>
            <div class="tag-list" style="margin-top:6px">${(sm.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          </div>
          <div class="actions">
            <button class="btn btn-sm btn-outline btn-summary" data-smid="${sm.id}">📖 语法</button>
            ${wrongCount > 0 ? `<button class="btn btn-sm btn-danger btn-wrong" data-smid="${sm.id}">🔄 错题</button>` : ''}
            <button class="btn btn-sm btn-primary btn-practice" data-smid="${sm.id}">▶ 练习</button>
          </div>
        </div>`;
    }).join('');
  },

  unmount() {}
};

export default ModulePage;
