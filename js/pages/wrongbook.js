/**
 * Wrong Book Page — 错题本 + 薄弱知识点
 * Three tabs: 待复习 | 已移除 | 薄弱知识点
 */
import DataLoader from '../data-loader.js';
import Storage from '../storage.js';
import Router from '../router.js';
import QuestionGenerator from '../question-generator.js';

const WrongBookPage = {
  _activeTab: 'pending',
  _generating: false,

  async mount(container) {
    const { modules } = await DataLoader.init();
    const userData = Storage.load();
    const activeWrong = Storage.getActiveWrongBook(userData);
    const removedWrong = Storage.getRemovedWrongBook(userData);
    const weakTopics = Storage.getWeakTopics(userData);

    this._render(container, modules, userData, activeWrong, removedWrong, weakTopics);
    this._bindGenerateButtons(container);
  },

  _render(container, modules, userData, activeWrong, removedWrong, weakTopics) {
    const activeIds = Object.keys(activeWrong);
    const removedIds = Object.keys(removedWrong);
    const weakTopicIds = Object.keys(weakTopics);

    container.innerHTML = `
      <div class="page-enter container">
        <div class="page-header">
          <a class="back-link" href="#/">← 返回首页</a>
          <h2>📖 错题本</h2>
        </div>

        <div class="wb-stats" style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div class="wb-stat-card" style="flex:1;min-width:100px;background:var(--surface);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700;color:var(--danger)">${activeIds.length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">待复习</div>
          </div>
          <div class="wb-stat-card" style="flex:1;min-width:100px;background:var(--surface);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700;color:var(--success)">${removedIds.length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">已掌握</div>
          </div>
          <div class="wb-stat-card" style="flex:1;min-width:100px;background:var(--surface);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700;color:var(--warning)">${weakTopicIds.length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">薄弱知识点</div>
          </div>
          <div class="wb-stat-card" style="flex:1;min-width:100px;background:var(--surface);border-radius:12px;padding:14px;text-align:center">
            <div style="font-size:1.8rem;font-weight:700">${Object.keys(userData.wrong_book || {}).length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">累计错题</div>
          </div>
        </div>

        <div class="wb-tabs" style="display:flex;gap:8px;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:8px">
          <button class="wb-tab ${this._activeTab === 'pending' ? 'active' : ''}" data-tab="pending" style="background:none;border:none;padding:8px 16px;cursor:pointer;font-size:0.95rem;color:${this._activeTab === 'pending' ? 'var(--accent)' : 'var(--text-muted)'};border-bottom:${this._activeTab === 'pending' ? '2px solid var(--accent)' : '2px solid transparent'};margin-bottom:-10px">
            待复习 (${activeIds.length})
          </button>
          <button class="wb-tab ${this._activeTab === 'removed' ? 'active' : ''}" data-tab="removed" style="background:none;border:none;padding:8px 16px;cursor:pointer;font-size:0.95rem;color:${this._activeTab === 'removed' ? 'var(--accent)' : 'var(--text-muted)'};border-bottom:${this._activeTab === 'removed' ? '2px solid var(--accent)' : '2px solid transparent'};margin-bottom:-10px">
            已掌握 (${removedIds.length})
          </button>
          <button class="wb-tab ${this._activeTab === 'weak' ? 'active' : ''}" data-tab="weak" style="background:none;border:none;padding:8px 16px;cursor:pointer;font-size:0.95rem;color:${this._activeTab === 'weak' ? 'var(--accent)' : 'var(--text-muted)'};border-bottom:${this._activeTab === 'weak' ? '2px solid var(--accent)' : '2px solid transparent'};margin-bottom:-10px">
            薄弱知识点 (${weakTopicIds.length})
          </button>
        </div>

        <div class="wb-content" id="wb-content">
          ${this._activeTab === 'pending' ? this._renderPending(modules, activeWrong, userData) : ''}
          ${this._activeTab === 'removed' ? this._renderRemoved(modules, removedWrong, userData) : ''}
          ${this._activeTab === 'weak' ? this._renderWeakTopics(modules, weakTopics, userData) : ''}
        </div>
      </div>`;

    // Wire tabs
    container.querySelectorAll('.wb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this._render(container, modules, userData, activeWrong, removedWrong, weakTopics);
      });
    });
  },

  _renderPending(modules, wrongBook, userData) {
    if (Object.keys(wrongBook).length === 0) {
      return `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">没有待复习的错题</div><div class="empty-desc">继续做题吧，答错的题会自动出现在这里</div></div>`;
    }

    // Group by sub_module_id
    const grouped = {};
    for (const [qid, entry] of Object.entries(wrongBook)) {
      const q = DataLoader.getById(qid);
      const smId = q?.sub_module_id || 'unknown';
      if (!grouped[smId]) grouped[smId] = [];
      grouped[smId].push({ qid, entry, question: q });
    }

    // Find sub-module names from modules
    const smNames = {};
    for (const mod of modules) {
      for (const sm of (mod.sub_modules || [])) {
        smNames[sm.id] = { moduleId: mod.id, moduleName: mod.name, smName: sm.name };
      }
    }

    let html = '';
    for (const [smId, items] of Object.entries(grouped)) {
      const meta = smNames[smId] || { moduleId: '', moduleName: '未知模块', smName: smId };
      // Sort by wrongCount desc
      items.sort((a, b) => (b.entry.wrongCount || 0) - (a.entry.wrongCount || 0));

      html += `
        <div class="wb-group" style="margin-bottom:20px;background:var(--surface);border-radius:12px;overflow:hidden">
          <div class="wb-group-header" style="padding:12px 16px;background:var(--surface-hover);display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="this.nextElementSibling.classList.toggle('collapsed')">
            <div>
              <span style="font-weight:600">${meta.smName}</span>
              <span style="color:var(--text-muted);font-size:0.85rem;margin-left:8px">${meta.moduleName}</span>
            </div>
            <div style="display:flex;gap:12px;align-items:center">
              <span style="color:var(--danger);font-size:0.85rem">${items.length} 题待复习</span>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();location.hash='#/module/${meta.moduleId}/sub/${smId}/quiz?mode=wrong'" style="font-size:0.8rem;padding:4px 12px">练全部</button>
            </div>
          </div>
          <div class="wb-group-body" style="padding:0">
            ${items.map(({ qid, entry, question }) => {
              if (!question) return '';
              const lastWrong = entry.history?.filter(h => !h.correct).pop();
              const lastWrongTime = lastWrong ? new Date(lastWrong.at).toLocaleDateString('zh-CN') : '—';
              return `
              <div class="wb-item" style="padding:12px 16px;border-top:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.9rem;margin-bottom:6px;line-height:1.5">${question.question}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">
                      ${(question.options || []).map((o, i) => `<span style="${i === question.answer ? 'color:var(--success);font-weight:600' : ''}">${String.fromCharCode(65+i)}. ${o}</span>`).join(' &nbsp; ')}
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">
                      做错 <strong style="color:var(--danger)">${entry.wrongCount || 0}</strong> 次 · 连续做对 ${entry.consecutiveCorrect || 0} 次 · 最近: ${lastWrongTime}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline" onclick="location.hash='#/module/${meta.moduleId}/sub/${smId}/quiz'" style="flex-shrink:0;font-size:0.8rem;padding:4px 12px">去练习</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    // "Practice All" button
    html += `
      <div style="text-align:center;margin-top:24px">
        <button class="btn btn-danger" onclick="
          const allIds = ${JSON.stringify(Object.keys(wrongBook))};
          if (allIds.length > 0) {
            const firstQ = DataLoader.getById(allIds[0]);
            if (firstQ) location.hash = '#/module/' + smNames[firstQ.sub_module_id]?.moduleId + '/sub/' + firstQ.sub_module_id + '/quiz?mode=wrong';
          }
        " style="display:none">练全部待复习错题</button>
      </div>`;

    return html;
  },

  _renderRemoved(modules, wrongBook, userData) {
    if (Object.keys(wrongBook).length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">还没有已掌握的错题</div><div class="empty-desc">待复习的错题连续做对2次后会自动移到这里</div></div>`;
    }

    let html = '<div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:16px">连续做对 2 次以上的错题，已自动标记为已掌握 ✅</div>';

    for (const [qid, entry] of Object.entries(wrongBook)) {
      const q = DataLoader.getById(qid);
      if (!q) continue;
      html += `
        <div class="wb-item" style="padding:10px 16px;background:var(--surface);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.85rem;line-height:1.4;color:var(--text-secondary)">${q.question}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">做错 ${entry.wrongCount || 0} 次 · 连续做对 ${entry.consecutiveCorrect || 0} 次</div>
          </div>
          <span style="color:var(--success);flex-shrink:0">✅ 已掌握</span>
        </div>`;
    }

    return html;
  },

  _renderWeakTopics(modules, weakTopics, userData) {
    const smNames = {};
    for (const mod of modules) {
      for (const sm of (mod.sub_modules || [])) {
        smNames[sm.id] = { moduleId: mod.id, moduleName: mod.name, smName: sm.name };
      }
    }

    if (Object.keys(weakTopics).length === 0) {
      return `<div class="empty-state"><div class="empty-icon">💪</div><div class="empty-title">没有薄弱知识点</div><div class="empty-desc">做错的题目涉及的知识点会出现在这里。即使错题已掌握，知识点标记也会保留。</div></div>`;
    }

    // Sort: weak first, then practicing, then ok
    const proficiencyOrder = { 'weak': 0, 'practicing': 1, 'ok': 2 };
    const sorted = Object.entries(weakTopics).sort((a, b) => {
      const pa = proficiencyOrder[a[1].proficiency] ?? 0;
      const pb = proficiencyOrder[b[1].proficiency] ?? 0;
      if (pa !== pb) return pa - pb;
      return (b[1].totalWrong || 0) - (a[1].totalWrong || 0);
    });

    let html = '<div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:16px">⚠️ 知识点标记不会因为错题做对而自动消失，需要专门练习该知识点才能提升熟练度</div>';

    for (const [smId, topic] of sorted) {
      const meta = smNames[smId] || { moduleId: '', moduleName: '未知模块', smName: smId };
      const profLabel = topic.proficiency === 'ok' ? '✅ 熟练' : topic.proficiency === 'practicing' ? '🔄 练习中' : '⚠️ 薄弱';
      const profColor = topic.proficiency === 'ok' ? 'var(--success)' : topic.proficiency === 'practicing' ? 'var(--warning)' : 'var(--danger)';
      const firstWrong = topic.firstWrong ? new Date(topic.firstWrong).toLocaleDateString('zh-CN') : '—';
      const lastWrong = topic.lastWrong ? new Date(topic.lastWrong).toLocaleDateString('zh-CN') : '—';

      html += `
        <div class="wb-item" style="padding:14px 16px;background:var(--surface);border-radius:10px;margin-bottom:10px;border-left:3px solid ${profColor}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;margin-bottom:4px">${meta.smName} <span style="font-size:0.75rem;color:var(--text-muted)">${meta.moduleName}</span></div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:2px">
                累计错题 <strong style="color:var(--danger)">${topic.totalWrong || 0}</strong> 次 · 首次: ${firstWrong} · 最近: ${lastWrong}
              </div>
              <div style="font-size:0.85rem;color:${profColor}">${profLabel}</div>
            </div>
            <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-sm btn-outline" onclick="location.hash='#/module/${meta.moduleId}/sub/${smId}/quiz?mode=wrong'" style="font-size:0.8rem">专门练习</button>
              <button class="btn btn-sm btn-primary btn-gen-ai" data-sm-id="${smId}" data-module-id="${meta.moduleId}" style="font-size:0.8rem;background:var(--accent)">🤖 AI 生题</button>
            </div>
          </div>
        </div>`;
    }

    return html;
  },

  _bindGenerateButtons(container) {
    container.querySelectorAll('.btn-gen-ai').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (this._generating) return;
        const smId = btn.dataset.smId;
        const moduleId = btn.dataset.moduleId;
        await this._generateAI(btn, smId, moduleId);
      });
    });
  },

  async _generateAI(btn, smId, moduleId) {
    const settings = Storage.loadSettings();
    if (!settings.api_key || !settings.use_llm) {
      if (confirm('需要 DeepSeek API Key 才能使用 AI 生题。\n\n免费获取: platform.deepseek.com/api_keys\n\n要去设置页配置吗？')) {
        Router.go('#/settings');
      }
      return;
    }

    this._generating = true;
    btn.disabled = true;
    btn.textContent = '⏳ AI 生成中...';

    try {
      const sampleQs = DataLoader.getBySubModule(smId);
      if (sampleQs.length === 0) {
        alert('该知识点暂无题目，无法生成');
        btn.textContent = '🤖 AI 生题';
        btn.disabled = false;
        this._generating = false;
        return;
      }

      const sample = sampleQs[Math.floor(Math.random() * sampleQs.length)];

      const generated = await QuestionGenerator.generateWithLLM(sample, 5, settings);

      if (generated.length > 0) {
        DataLoader.addGenerated(generated);
        btn.textContent = `✅ 已生成 ${generated.length} 题`;
        setTimeout(() => {
          Router.go(`#/module/${moduleId}/sub/${smId}/quiz?mode=similar&qid=${sample.id}`);
        }, 800);
      } else {
        btn.textContent = '❌ 生成失败，请重试';
      }
    } catch (e) {
      btn.textContent = '❌ 失败';
      alert('AI 生成失败: ' + (e.message || '未知错误'));
    } finally {
      btn.disabled = false;
      this._generating = false;
    }
  },

  unmount() {
    this._activeTab = 'pending';
    this._generating = false;
  }
};

export default WrongBookPage;
