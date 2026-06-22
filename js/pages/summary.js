/**
 * Grammar Summary Page — Shows rules + examples before quiz.
 */
import DataLoader from '../data-loader.js';
import Router from '../router.js';

const SummaryPage = {
  async mount(container, params) {
    const { id, subId } = params;
    const { modules } = await DataLoader.init();
    const module = modules.find(m => m.id === id);
    const sm = module?.sub_modules?.find(s => s.id === subId);

    if (!sm) { container.innerHTML = '<div class="error-state"><h2>404</h2><p>子模块未找到</p></div>'; return; }

    const gs = sm.grammar_summary || {};
    const rules = gs.rules || '暂无语法总结';
    const examples = gs.examples || [];
    const mistakes = gs.common_mistakes || '';
    const questionCount = DataLoader.getBySubModule(subId).length;

    container.innerHTML = `
      <div class="page-enter summary-page">
        <div class="page-header">
          <a class="back-link" href="#/module/${id}">← ${module.name}</a>
          <h2>📖 ${sm.name}</h2>
          <p class="subtitle">开始做题前，先复习一下语法规则</p>
        </div>

        <div class="summary-card" style="padding:12px;background:var(--bg);cursor:pointer" id="mindmap-card">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h3 style="margin:0">🧠 思维导图</h3>
            <span style="font-size:0.8rem;color:var(--text-muted)" id="mindmap-toggle">点击展开 ▼</span>
          </div>
          <div id="mindmap-content" style="display:none;margin-top:10px;text-align:center">
            <img id="mindmap-img" src="" style="max-width:100%;border-radius:8px;cursor:zoom-in" alt="思维导图（点击放大）" title="点击图片放大查看" onerror="this.parentElement.innerHTML='<p style=color:var(--text-muted)>思维导图加载失败</p>'">
            <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">💡 点击图片可放大查看</p>
          </div>
        </div>

        <div class="summary-card">
          <h3>📋 语法规则</h3>
          <div class="rule-text">${rules}</div>
        </div>

        ${examples.length ? `
        <div class="summary-card">
          <h3>💡 例句</h3>
          ${examples.map(ex => `
            <div class="example">
              <div class="ex-text">${typeof ex === 'string' ? ex : ex.text || ''}</div>
              ${typeof ex === 'object' && ex.note ? `<div class="ex-note">${ex.note}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}

        ${mistakes ? `
        <div class="summary-card" style="border-color:var(--warning)">
          <h3>⚠️ 常见错误</h3>
          <div class="rule-text">${mistakes}</div>
        </div>` : ''}

        <div class="summary-card" style="border-color:var(--accent);margin-top:20px">
          <h3>🤖 AI 语法答疑</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:10px">对上面的语法规则有疑问？输入你的问题，AI 帮你解答</p>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <input type="text" id="ai-question" placeholder="例如：可数名词和不可数名词怎么区分？" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text)">
            <button class="btn btn-outline btn-sm" id="btn-voice" title="语音输入">🎤</button>
            <button class="btn btn-primary btn-sm" id="btn-ask">提问</button>
          </div>
          <div id="ai-answer" style="display:none;padding:12px;background:var(--bg);border-radius:6px;font-size:0.9rem;line-height:1.6;max-height:300px;overflow-y:auto"></div>
          <div id="ai-loading" style="display:none;text-align:center;padding:10px;color:var(--text-muted)">🤔 AI 思考中...</div>
        </div>

        <div style="text-align:center;margin-top:24px">
          <p style="color:var(--text-muted);margin-bottom:12px">本模块共 ${questionCount} 道练习题</p>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-primary btn-lg" id="btn-start">开始练习</button>
            <button class="btn btn-secondary btn-lg" id="btn-back">返回</button>
          </div>
        </div>
      </div>`;

    // Mind map toggle + zoom
    const mindmapCard = container.querySelector('#mindmap-card');
    const mindmapContent = container.querySelector('#mindmap-content');
    const mindmapImg = container.querySelector('#mindmap-img');
    const mindmapToggle = container.querySelector('#mindmap-toggle');
    // Mindmap lookup: try sub-module prefix first, then module ID
    const subPrefix = (subId || '').split('-')[0];
    const candidates = [`mindmaps/${subPrefix}.webp`, `mindmaps/${id}.webp`];
    let mindmapUrl = candidates[0];

    function tryMindmap(idx) {
      if (idx >= candidates.length) { mindmapCard.style.display = 'none'; return; }
      mindmapUrl = candidates[idx];
      // Use embedded base64 when available (offline standalone mode)
      if (typeof __EMBEDDED_MINDMAPS !== 'undefined' && __EMBEDDED_MINDMAPS[mindmapUrl]) {
        mindmapImg.src = __EMBEDDED_MINDMAPS[mindmapUrl];
        return;
      }
      mindmapImg.src = mindmapUrl;
    }
    mindmapImg.onload = () => { mindmapCard.style.display = ''; };
    mindmapImg.onerror = () => tryMindmap(candidates.indexOf(mindmapUrl) + 1);
    tryMindmap(0);

    mindmapCard.addEventListener('click', (e) => {
      if (e.target === mindmapImg) {
        // Fullscreen zoom with pinch/wheel support
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:9999;overflow:hidden;touch-action:none';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1);transform-origin:0 0;transition:transform 0.1s';

        const img = document.createElement('img');
        img.src = mindmapUrl;
        img.style.cssText = 'max-width:90vw;max-height:90vh;pointer-events:none;user-select:none;-webkit-user-drag:none';
        img.draggable = false;

        wrapper.appendChild(img);
        overlay.appendChild(wrapper);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,0.3);color:#fff;font-size:20px;cursor:pointer';
        closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); overlay.remove(); });
        overlay.appendChild(closeBtn);

        let scale = 1;
        let startDist = 0;
        let lastScale = 1;
        let panX = 0, panY = 0;
        let dragging = false;
        let lastX = 0, lastY = 0;

        function updateTransform() {
          wrapper.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
        }

        // Mouse wheel zoom
        overlay.addEventListener('wheel', (ev) => {
          ev.preventDefault();
          scale *= ev.deltaY < 0 ? 1.1 : 0.9;
          scale = Math.min(Math.max(scale, 0.5), 5);
          updateTransform();
        }, { passive: false });

        // Mouse drag pan
        overlay.addEventListener('mousedown', (ev) => {
          if (ev.target === closeBtn) return;
          dragging = true;
          lastX = ev.clientX;
          lastY = ev.clientY;
          wrapper.style.transition = 'none';
        });
        window.addEventListener('mousemove', (ev) => {
          if (!dragging) return;
          panX += ev.clientX - lastX;
          panY += ev.clientY - lastY;
          lastX = ev.clientX;
          lastY = ev.clientY;
          updateTransform();
        });
        window.addEventListener('mouseup', () => {
          dragging = false;
          wrapper.style.transition = 'transform 0.1s';
        });

        // Touch drag + pinch
        overlay.addEventListener('touchstart', (ev) => {
          if (ev.touches.length === 1) {
            dragging = true;
            lastX = ev.touches[0].clientX;
            lastY = ev.touches[0].clientY;
            wrapper.style.transition = 'none';
          } else if (ev.touches.length === 2) {
            dragging = false;
            startDist = Math.hypot(
              ev.touches[0].clientX - ev.touches[1].clientX,
              ev.touches[0].clientY - ev.touches[1].clientY
            );
            lastScale = scale;
          }
        });
        overlay.addEventListener('touchmove', (ev) => {
          if (ev.touches.length === 1 && dragging) {
            panX += ev.touches[0].clientX - lastX;
            panY += ev.touches[0].clientY - lastY;
            lastX = ev.touches[0].clientX;
            lastY = ev.touches[0].clientY;
            updateTransform();
          } else if (ev.touches.length === 2) {
            ev.preventDefault();
            const dist = Math.hypot(
              ev.touches[0].clientX - ev.touches[1].clientX,
              ev.touches[0].clientY - ev.touches[1].clientY
            );
            scale = Math.min(Math.max(lastScale * (dist / startDist), 0.5), 5);
            updateTransform();
          }
        }, { passive: false });
        overlay.addEventListener('touchend', () => {
          dragging = false;
          wrapper.style.transition = 'transform 0.1s';
        });

        // Double click to reset
        overlay.addEventListener('dblclick', () => {
          scale = 1; panX = 0; panY = 0;
          updateTransform();
        });

        // Close
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
        return;
      }
      const isVisible = mindmapContent.style.display !== 'none';
      mindmapContent.style.display = isVisible ? 'none' : 'block';
      mindmapToggle.textContent = isVisible ? '点击展开 ▼' : '点击收起 ▲';
    });

    container.querySelector('#btn-start').addEventListener('click', () => {
      Router.go(`#/module/${id}/sub/${subId}/quiz`);
    });
    container.querySelector('#btn-back').addEventListener('click', () => {
      Router.go(`#/module/${id}`);
    });

    // AI Q&A
    const aiInput = container.querySelector('#ai-question');
    const aiAnswer = container.querySelector('#ai-answer');
    const aiLoading = container.querySelector('#ai-loading');
    const btnAsk = container.querySelector('#btn-ask');

    const grammarContext = `你是一个英语语法老师。学生正在学习"${sm.name}"这个语法点。以下是相关语法规则：${Array.isArray(rules)?rules.join('；'):rules}。请用中文回答学生的问题，要简洁易懂，最好举一个例句。`;

    btnAsk.addEventListener('click', async () => {
      const q = aiInput.value.trim();
      if (!q) return;
      aiLoading.style.display = 'block';
      aiAnswer.style.display = 'none';
      btnAsk.disabled = true;
      try {
        const resp = await fetch('/api/generate', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            api_key: (JSON.parse(localStorage.getItem('grammar_settings')||'{}')).api_key || '',
            model: (JSON.parse(localStorage.getItem('grammar_settings')||'{}')).llm_model || 'deepseek-chat',
            prompt: `${grammarContext}\n\n学生提问：${q}\n\n请用中文回答：`
          })
        });
        const data = await resp.json();
        aiAnswer.style.display = 'block';
        aiAnswer.innerHTML = data.error
          ? `<span style="color:var(--danger)">❌ ${data.error}。请在设置中配置 API Key。</span>`
          : data.text.replace(/\n/g, '<br>');
      } catch(e) {
        aiAnswer.style.display = 'block';
        aiAnswer.innerHTML = '<span style="color:var(--danger)">请求失败，请检查网络或 API Key 配置</span>';
      }
      aiLoading.style.display = 'none';
      btnAsk.disabled = false;
    });

    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAsk.click();
    });

    // Voice input
    const btnVoice = container.querySelector('#btn-voice');
    let recognition = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (e) => {
        aiInput.value = e.results[0][0].transcript;
        btnVoice.textContent = '🎤';
        btnVoice.classList.remove('recording');
      };
      recognition.onerror = () => {
        btnVoice.textContent = '🎤';
        btnVoice.classList.remove('recording');
      };
      recognition.onend = () => {
        btnVoice.textContent = '🎤';
        btnVoice.classList.remove('recording');
      };
    }

    btnVoice.addEventListener('click', () => {
      if (!recognition) { alert('您的浏览器不支持语音输入，请使用 Chrome 浏览器'); return; }
      if (btnVoice.classList.contains('recording')) {
        recognition.stop();
      } else {
        recognition.start();
        btnVoice.textContent = '🔴';
        btnVoice.classList.add('recording');
      }
    });
  },

  unmount() {}
};

export default SummaryPage;
