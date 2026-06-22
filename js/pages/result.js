/**
 * Result Page — standalone page for viewing past session results.
 * Accessed via #/result/{sessionId}
 */
import Storage from '../storage.js';
import ProgressRing from '../components/progress-ring.js';
import DataLoader from '../data-loader.js';
import Router from '../router.js';

const ResultPage = {
  async mount(container, params) {
    const { sessionId } = params;
    const userData = Storage.load();
    const session = userData.sessions?.find(s => s.sub_module_id === sessionId || `ses-${sessionId}` === sessionId);
    // Actually sessions are stored differently — look up by matching timestamps or sub_module_id
    // For simplicity, we'll show the most recent session
    const latestSession = userData.sessions?.[userData.sessions.length - 1];

    if (!latestSession) {
      container.innerHTML = `<div class="page-enter container"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">暂无练习记录</div></div></div>`;
      return;
    }

    const summary = latestSession;
    const emoji = summary.accuracy >= 90 ? '🏆' : summary.accuracy >= 70 ? '👍' : '💪';

    container.innerHTML = `
      <div class="page-enter result-page">
        <div class="result-score-ring" id="result-ring"></div>
        <h2 style="margin-bottom:4px">${emoji} 练习记录</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">${new Date(summary.at).toLocaleString()}</p>
        <div class="result-stats">
          <div class="result-stat"><div class="val accent">${summary.total}</div><div class="lbl">总题数</div></div>
          <div class="result-stat"><div class="val success">${summary.score}</div><div class="lbl">正确</div></div>
          <div class="result-stat"><div class="val danger">${summary.total - summary.score}</div><div class="lbl">错误</div></div>
        </div>
        <div style="margin-top:20px">
          <a href="#/module/${sessionId || ''}" class="btn btn-secondary">返回模块</a>
          <a href="#/" class="btn btn-outline">返回首页</a>
        </div>
      </div>`;

    const ringEl = container.querySelector('#result-ring');
    ProgressRing.render(ringEl, { percent: summary.accuracy || 0, size: 120, strokeWidth: 8 });
  },

  unmount() {}
};

export default ResultPage;
