/**
 * Stats Dashboard — Heatmap, accuracy charts, wrong-answer distribution.
 */
import DataLoader from '../data-loader.js';
import Storage from '../storage.js';
import Heatmap from '../components/heatmap.js';
import ProgressRing from '../components/progress-ring.js';
import Router from '../router.js';

const StatsPage = {
  async mount(container) {
    const { modules } = await DataLoader.init();
    const userData = Storage.load();

    // Overall stats
    let totalAttempts = 0, totalCorrect = 0;
    for (const r of Object.values(userData.questions)) {
      totalAttempts += r.attempts || 0;
      totalCorrect += r.correct || 0;
    }
    const overallPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const totalSessions = userData.sessions?.length || 0;
    const importedCount = Storage.loadImported().length;
    const generatedCount = Storage.loadGenerated().length;

    container.innerHTML = `
      <div class="page-enter stats-page container">
        <div class="page-header">
          <a class="back-link" href="#/">← 返回首页</a>
          <h2>📊 学习统计</h2>
        </div>

        <div class="stats-overview">
          <div class="stats-overview-card">
            <div class="big-num">${totalAttempts}</div>
            <div class="label">总做题数</div>
          </div>
          <div class="stats-overview-card">
            <div class="big-num">${overallPct}%</div>
            <div class="label">总正确率</div>
          </div>
          <div class="stats-overview-card">
            <div class="big-num">${Object.keys(Storage.getActiveWrongBook(userData)).length}</div>
            <div class="label">错题待复习</div>
          </div>
          <div class="stats-overview-card">
            <div class="big-num">${totalSessions}</div>
            <div class="label">练习轮次</div>
          </div>
          <div class="stats-overview-card">
            <div class="big-num">${userData.streak?.longest || 0}</div>
            <div class="label">最长连胜</div>
          </div>
          <div class="stats-overview-card">
            <div class="big-num">${importedCount + generatedCount}+</div>
            <div class="label">扩展题目</div>
          </div>
        </div>

        <div class="heatmap-container">
          <h3 style="margin-bottom:16px">🔥 各模块正确率热力图</h3>
          <div id="heatmap-modules"></div>
        </div>

        <div class="heatmap-container" style="margin-top:16px">
          <h3 style="margin-bottom:16px">📈 模块完成情况</h3>
          <div id="module-progress-list"></div>
        </div>

        <div class="heatmap-container" style="margin-top:16px">
          <h3 style="margin-bottom:16px">📝 最近练习</h3>
          <div id="recent-sessions"></div>
        </div>
      </div>`;

    // Render heatmap
    const heatmapCells = modules.map(m => {
      const stats = DataLoader.getModuleStats(m.id, userData);
      return { name: m.name, percent: stats.accuracy, attempts: stats.attempted };
    });
    const heatmapEl = container.querySelector('#heatmap-modules');
    Heatmap.render(heatmapEl, { cells: heatmapCells, onClick: (name) => {
      const m = modules.find(m => m.name === name);
      if (m) Router.go(`#/module/${m.id}`);
    }});

    // Render module progress list
    const progEl = container.querySelector('#module-progress-list');
    progEl.innerHTML = modules.map(m => {
      const stats = DataLoader.getModuleStats(m.id, userData);
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light);cursor:pointer"
             onclick="location.hash='#/module/${m.id}'">
          <span id="ring-p-${m.id}"></span>
          <div style="flex:1">
            <div style="font-weight:600">${m.name}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${stats.completedSubModules}/${stats.totalSubModules} 子模块 · ${stats.accuracy}% 正确 · ${stats.attempted} 次作答</div>
          </div>
          <span style="color:var(--text-muted);font-size:0.85rem">${stats.total} 题</span>
        </div>`;
    }).join('');

    // Render progress rings for each module
    for (const m of modules) {
      const ringEl = container.querySelector(`#ring-p-${m.id}`);
      if (ringEl) {
        const stats = DataLoader.getModuleStats(m.id, userData);
        ProgressRing.render(ringEl, { percent: stats.accuracy, size: 40, strokeWidth: 5 });
      }
    }

    // Render recent sessions
    const sessEl = container.querySelector('#recent-sessions');
    const recentSessions = (userData.sessions || []).slice(-10).reverse();
    if (recentSessions.length === 0) {
      sessEl.innerHTML = '<p style="color:var(--text-muted)">暂无练习记录，开始做题后这里会显示最近练习</p>';
    } else {
      sessEl.innerHTML = recentSessions.map(s => {
        const sm = this._findSMName(modules, s.sub_module_id);
        const dt = s.at ? new Date(s.at).toLocaleString('zh-CN') : '';
        const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light)">
            <div>
              <span style="font-weight:600">${sm}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px">${s.mode || 'all'}</span>
            </div>
            <div style="text-align:right">
              <span style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'};font-weight:600">${s.score}/${s.total} (${pct}%)</span>
              <div style="font-size:0.7rem;color:var(--text-muted)">${dt}</div>
            </div>
          </div>`;
      }).join('');
    }
  },

  _findSMName(modules, smId) {
    for (const m of modules) {
      const sm = m.sub_modules?.find(s => s.id === smId);
      if (sm) return sm.name;
    }
    return smId || '未知';
  },

  unmount() {}
};

export default StatsPage;
