/**
 * Quiz Page — The main practice engine.
 * Keyboard: 1/2/3/4 select, → next, ← prev, Esc exit.
 * Mobile: swipe left/right.
 */
import DataLoader from '../data-loader.js';
import QuizEngine from '../quiz-engine.js';
import Storage from '../storage.js';
import Router from '../router.js';
import EventBus from '../event-bus.js';
import QuestionGenerator from '../question-generator.js';

const QuizPage = {
  _session: null,
  _timer: null,
  _questionStart: 0,
  _touchStartX: 0,
  _answered: false,
  _moduleId: '',
  _smId: '',

  async mount(container, params) {
    const { id, subId, mode, qid } = params;
    this._moduleId = id;
    this._smId = subId;

    const { modules } = await DataLoader.init();
    const module = modules.find(m => m.id === id);
    const sm = module?.sub_modules?.find(s => s.id === subId);
    const smName = sm?.name || subId;

    const questions = DataLoader.getBySubModule(subId);
    if (questions.length === 0) {
      container.innerHTML = `
        <div class="page-enter container">
          <div class="page-header"><a class="back-link" href="#/module/${id}">← 返回</a></div>
          <div class="empty-state"><div class="empty-icon">📭</div>
            <div class="empty-title">该子模块暂无题目</div>
            <div class="empty-desc">可以导入题目或等待系统生成相似题</div>
            <button class="btn btn-primary" onclick="location.hash='#/import'">📥 导入题目</button>
          </div>
        </div>`;
      return;
    }

    const userData = Storage.load();
    const wrongIds = Storage.getWrongIds(userData);
    const opts = { mode: mode || 'all', wrongIds, count: questions.length, shuffle: true };
    if (mode === 'similar' && qid) {
      // Find generated questions with matching parent_qid
      const genQs = DataLoader.getBySubModule(subId).filter(q => q.source === 'generated' && q.parent_qid === qid);
      if (genQs.length > 0) {
        opts.specificIds = genQs.map(q => q.id);
        opts.count = Math.min(10, opts.specificIds.length);
      } else {
        // Fallback: show ALL generated questions for this submodule
        const allGenQs = DataLoader.getBySubModule(subId).filter(q => q.source === 'generated');
        if (allGenQs.length > 0) {
          opts.specificIds = allGenQs.map(q => q.id);
          opts.count = Math.min(10, opts.specificIds.length);
        } else {
          // Last resort: show the original question
          opts.specificIds = [qid];
          opts.count = 1;
        }
      }
    }

    // Handle empty wrong/similar set
    if (mode === 'wrong' && opts.wrongIds.length === 0) {
      container.innerHTML = `
        <div class="page-enter container">
          <div class="page-header"><a class="back-link" href="#/module/${id}">← 返回</a></div>
          <div class="empty-state"><div class="empty-icon">🎉</div>
            <div class="empty-title">没有错题！</div>
            <div class="empty-desc">当前子模块的所有题目你都做对了</div>
            <button class="btn btn-primary" onclick="location.hash='#/module/${id}'">返回模块</button>
          </div>
        </div>`;
      return;
    }

    if (opts.specificIds && opts.specificIds.length === 0) {
      container.innerHTML = `
        <div class="page-enter container"><div class="page-header"><a class="back-link" href="#/module/${id}">← 返回</a></div>
          <div class="empty-state"><div class="empty-icon">🤔</div><div class="empty-title">暂无相似题</div>
            <div class="empty-desc">请先生成相似题后再来练习</div></div></div>`;
      return;
    }

    this._session = QuizEngine.createSession(subId, questions, opts);
    this._answered = false;
    this._questionStart = Date.now();

    // Check for saved session to resume
    const saved = Storage.loadQuizSession();
    if (saved && saved.subModuleId === subId && saved.queue.length > 0 && saved.currentIndex < saved.queue.length) {
      container.innerHTML = this._renderResumePrompt(smName, saved);
      this._bindResumeEvents(container, saved, questions, opts);
      return;
    }

    // Initial render
    container.innerHTML = this._renderShell(smName);
    this._bindEvents(container);
    this._renderQuestion(container);

    // Save session if user closes tab/window
    this._beforeUnloadHandler = () => { this._saveSession(); };
    window.addEventListener('beforeunload', this._beforeUnloadHandler);
  },

  _renderResumePrompt(smName, saved) {
    const progress = Math.round((saved.currentIndex / saved.queue.length) * 100);
    const answeredCount = saved.answers.length;
    const correctCount = saved.answers.filter(a => a.isCorrect).length;
    const savedTime = new Date(saved.savedAt);
    const timeStr = savedTime.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="page-enter quiz-container">
        <div class="page-header">
          <a class="back-link" href="#/module/${this._moduleId}">← 返回</a>
          <h2>${smName}</h2>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:48px 24px;text-align:center">
          <div style="font-size:3rem">📝</div>
          <h3 style="margin:0">上次练习未完成</h3>
          <div style="color:var(--text-secondary);line-height:1.8">
            <div>🕐 ${timeStr} 退出的</div>
            <div>📊 已答 ${answeredCount} 题 · 正确 ${correctCount} 题</div>
            <div>📈 进度 ${progress}%（第 ${saved.currentIndex + 1}/${saved.queue.length} 题）</div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button class="btn btn-primary" id="btn-resume" style="min-width:140px">▶ 继续上次</button>
            <button class="btn btn-outline" id="btn-restart" style="min-width:140px">🔄 重新开始</button>
          </div>
        </div>
      </div>`;
  },

  _bindResumeEvents(container, saved, questions, opts) {
    container.querySelector('#btn-resume').addEventListener('click', () => {
      // Restore saved session
      this._session = {
        id: saved.id || 'ses-' + Date.now(),
        subModuleId: saved.subModuleId,
        queue: saved.queue,
        currentIndex: saved.currentIndex,
        answers: saved.answers || [],
        startTime: Date.now(),
        mode: saved.mode || 'all'
      };
      this._answered = saved.answers.length > saved.currentIndex; // if answered current
      this._questionStart = Date.now();

      container.innerHTML = this._renderShell(
        questions.length > 0 ? '' : saved.subModuleId
      );
      this._bindEvents(container);
      this._renderQuestion(container);

      this._beforeUnloadHandler = () => { this._saveSession(); };
      window.addEventListener('beforeunload', this._beforeUnloadHandler);

      // If current question was already answered, show feedback
      if (this._answered) {
        const answer = QuizEngine.getAnswer(this._session, this._session.currentIndex);
        if (answer) {
          const result = {
            qid: answer.qid, selected: answer.selected, isCorrect: answer.isCorrect,
            explanation: answer.explanation, commonMistake: answer.commonMistake, question: answer.question,
          };
          this._showFeedback(container, result);
          const nextBtn = container.querySelector('#btn-next');
          if (nextBtn) nextBtn.disabled = false;
        }
      }

      // Update nav
      const prevBtn = container.querySelector('#btn-prev');
      if (prevBtn) prevBtn.disabled = this._session.currentIndex === 0;
    });

    container.querySelector('#btn-restart').addEventListener('click', () => {
      Storage.clearQuizSession();
      this._session = QuizEngine.createSession(this._smId, questions, opts);
      this._answered = false;
      this._questionStart = Date.now();
      container.innerHTML = this._renderShell('');
      this._bindEvents(container);
      this._renderQuestion(container);
    });
  },

  _saveSession() {
    if (!this._session) return;
    Storage.saveQuizSession(
      this._session.subModuleId,
      this._session.queue,
      this._session.currentIndex,
      this._session.answers,
      this._session.mode,
      this._moduleId
    );
  },

  _renderShell(smName) {
    const s = this._session;
    const modeLabel = s.mode === 'wrong' ? '错题重练' : s.mode === 'similar' ? '相似题' : '';
    return `
      <div class="page-enter quiz-container">
        <div class="page-header">
          <a class="back-link" href="#/module/${this._moduleId}">← 退出练习</a>
          <h2>${smName} ${modeLabel ? `<span style="font-size:0.8rem;color:var(--warning);margin-left:8px">${modeLabel}</span>` : ''}</h2>
        </div>
        <div class="quiz-progress">
          <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
          <span class="counter" id="progress-counter">1/${s.queue.length}</span>
        </div>
        <div id="quiz-card-area"></div>
        <div id="quiz-feedback-area"></div>
        <div class="quiz-actions" id="quiz-actions"></div>
        <div class="quiz-actions-bar" id="quiz-actions-bar">
          <button class="btn btn-outline btn-sm" id="btn-prev" disabled>← 上一题</button>
          <button class="btn btn-outline btn-sm" id="btn-next" disabled>下一题 →</button>
        </div>
        <div class="quiz-shortcuts">
          键盘快捷键： <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> 选择 · <kbd>←</kbd> 上一题 · <kbd>→</kbd> 下一题 · <kbd>Esc</kbd> 退出
        </div>
      </div>`;
  },

  _renderQuestion(container, isRevisit = false) {
    const q = QuizEngine.currentQuestion(this._session);
    if (!q) { this._showResult(container); return; }

    // Only reset answered state for fresh questions, not revisits from prev/next
    if (!isRevisit) {
      this._answered = false;
    }
    this._questionStart = Date.now();

    const cardArea = container.querySelector('#quiz-card-area');
    const feedbackArea = container.querySelector('#quiz-feedback-area');
    feedbackArea.innerHTML = '';

    const sourceLabels = { builtin: '内置', imported: '导入', generated: 'AI生成' };
    const sourceBadge = q.source && q.source !== 'builtin' ? `<span class="quiz-source-badge ${q.source}">${sourceLabels[q.source] || q.source}</span>` : '';

    cardArea.innerHTML = `
      <div class="quiz-card" id="quiz-card">
        ${sourceBadge}
        <div class="quiz-question">${q.question}</div>
        <div class="quiz-options" id="quiz-options">
          ${(q.options || []).map((opt, i) => `
            <button class="quiz-option" data-index="${i}" tabindex="${i+1}">
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
            </button>`).join('')}
        </div>
      </div>`;

    // Wire option clicks
    cardArea.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._answered) return;
        this._handleAnswer(container, parseInt(btn.dataset.index));
      });
    });

    // Update progress
    container.querySelector('#progress-counter').textContent = `${this._session.currentIndex + 1}/${this._session.queue.length}`;
    container.querySelector('#progress-fill').style.width = `${((this._session.currentIndex) / this._session.queue.length) * 100}%`;

    // Update nav buttons
    const prevBtn = container.querySelector('#btn-prev');
    const nextBtn = container.querySelector('#btn-next');
    if (prevBtn) prevBtn.disabled = this._session.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = true;  // enabled after answering
  },

  _handleAnswer(container, selectedIndex) {
    if (this._answered) return;
    this._answered = true;

    const timeMs = Date.now() - this._questionStart;
    const result = QuizEngine.submitAnswer(this._session, selectedIndex, timeMs);
    if (!result) return;

    // Get sub_module_id from the question
    const q = QuizEngine.currentQuestion(this._session);
    const subModuleId = q?.sub_module_id || this._smId;

    // Save immediately
    const userData = Storage.load();
    if (!userData.questions[result.qid]) userData.questions[result.qid] = { attempts: 0, correct: 0, last_at: '' };
    userData.questions[result.qid].attempts++;
    if (result.isCorrect) {
      userData.questions[result.qid].correct++;
    }
    userData.questions[result.qid].last_at = new Date().toISOString();

    // Record in wrong_book + weak_topics (new system)
    Storage.recordAnswer(userData, result.qid, subModuleId, result.isCorrect);

    // Wrong mode: if answered correctly, remove from queue so it won't repeat
    if (this._session.mode === 'wrong' && result.isCorrect) {
      QuizEngine.removeCurrentFromQueue(this._session);
    }
    Storage.save(userData);

    // Show feedback
    this._showFeedback(container, result);

    // Save session for resume
    this._saveSession();

    // Enable next button (only way to advance — no auto-advance)
    const nextBtn = container.querySelector('#btn-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  _goPrev(container) {
    // Clear any auto-advance timer
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }

    QuizEngine.prev(this._session);
    this._answered = true; // re-showing a previously answered question
    this._saveSession();
    this._renderQuestion(container, true);

    // Show the saved answer as feedback
    const answer = QuizEngine.getAnswer(this._session, this._session.currentIndex);
    if (answer) {
      const result = {
        qid: answer.qid,
        selected: answer.selected,
        isCorrect: answer.isCorrect,
        explanation: answer.explanation,
        commonMistake: answer.commonMistake,
        question: answer.question,
      };
      this._showFeedback(container, result);
    }

    // Enable next button (prev question already answered)
    const nextBtn = container.querySelector('#btn-next');
    if (nextBtn) nextBtn.disabled = false;
    const prevBtn = container.querySelector('#btn-prev');
    if (prevBtn) prevBtn.disabled = this._session.currentIndex === 0;
  },

  _goNext(container) {
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
    if (QuizEngine.hasNext(this._session)) {
      QuizEngine.next(this._session);
      this._saveSession();
      this._renderQuestion(container);
    } else {
      this._showResult(container);
    }
  },

  _showFeedback(container, result) {
    const feedbackArea = container.querySelector('#quiz-feedback-area');
    const icon = result.isCorrect ? '✅' : '❌';
    const headerText = result.isCorrect ? '回答正确！' : '回答错误';

    feedbackArea.innerHTML = `
      <div class="quiz-feedback ${result.isCorrect ? 'correct' : 'incorrect'}">
        <div class="fb-header">${icon} ${headerText}</div>
        <div class="fb-explanation">${result.explanation}</div>
        ${result.commonMistake ? `<div class="fb-mistake">⚠️ ${result.commonMistake}</div>` : ''}
        ${!result.isCorrect ? `<span class="fb-practice-link" id="fb-similar">🔄 我需要更多这类题的练习 →</span>` : ''}
      </div>`;

    // Highlight correct/wrong options
    const options = container.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      opt.classList.add('disabled');
      const idx = parseInt(opt.dataset.index);
      if (idx === result.question.answer) opt.classList.add('correct-answer');
      if (idx === result.selected && !result.isCorrect) opt.classList.add('wrong-answer');
    });

    // Wire similar practice link
    const similarLink = feedbackArea.querySelector('#fb-similar');
    if (similarLink) {
      similarLink.addEventListener('click', () => {
        Router.go(`#/module/${this._moduleId}/sub/${this._smId}/quiz?mode=similar&qid=${result.qid}`);
      });
    }
  },

  _showResult(container) {
    if (!this._session) return;
    const summary = QuizEngine.summary(this._session);

    // Save session
    const userData = Storage.load();
    userData.sessions.push({ sub_module_id: summary.subModuleId, score: summary.correct, total: summary.total, mode: summary.mode, at: summary.completedAt });
    // Mark as completed if all correct
    if (summary.correct === summary.total && !userData.sub_module_completed.includes(summary.subModuleId)) {
      userData.sub_module_completed.push(summary.subModuleId);
    }
    if (summary.streak?.current > userData.streak.longest) {
      userData.streak.longest = summary.streak?.current || 0;
    }
    // Update weak topic proficiency after dedicated practice (wrong mode or from weak topics page)
    if (summary.mode === 'wrong') {
      Storage.updateTopicProficiency(userData, summary.subModuleId, summary.accuracy);
    }
    Storage.save(userData);

    // Clear saved session — quiz is complete
    Storage.clearQuizSession();

    EventBus.emit('quiz:complete', summary);

    const emoji = summary.accuracy >= 90 ? '🏆' : summary.accuracy >= 70 ? '👍' : summary.accuracy >= 50 ? '💪' : '📚';

    container.innerHTML = `
      <div class="page-enter result-page">
        <div class="result-score-ring" id="result-ring"></div>
        <h2 style="margin-bottom:4px">${emoji} 练习完成</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">${summary.mode === 'wrong' ? '错题重练' : summary.mode === 'similar' ? '相似题练习' : '新题练习'}</p>
        <div class="result-stats">
          <div class="result-stat"><div class="val accent">${summary.total}</div><div class="lbl">总题数</div></div>
          <div class="result-stat"><div class="val success">${summary.correct}</div><div class="lbl">正确</div></div>
          <div class="result-stat"><div class="val danger">${summary.wrong}</div><div class="lbl">错误</div></div>
        </div>
        <p style="font-size:1.1rem;margin-bottom:8px">正确率 <strong style="color:${summary.accuracy >= 70 ? 'var(--success)' : 'var(--danger)'}">${summary.accuracy}%</strong></p>
        <p style="color:var(--text-muted);font-size:0.85rem">平均用时 ${summary.avgTimeMs / 1000}s · 总耗时 ${Math.round(summary.elapsedMs / 1000)}s</p>

        ${summary.wrong > 0 ? `
        <div class="result-review">
          <h3>错题回顾</h3>
          ${summary.answers.filter(a => !a.isCorrect).map(a => `
            <div class="result-review-item">
              <div class="q-text">${a.question.question}</div>
              <span class="opt chosen">你的答案：${String.fromCharCode(65 + a.selected)}. ${a.question.options[a.selected]}</span>
              <span class="opt correct-item">正确答案：${String.fromCharCode(65 + a.correct)}. ${a.question.options[a.correct]}</span>
              <div style="font-size:0.85rem;color:var(--text-muted);margin-top:8px">${a.explanation}</div>
            </div>`).join('')}
        </div>` : ''}

        <div style="margin-top:28px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          ${summary.mode === 'wrong' ? `
            <div style="width:100%;text-align:center;margin-bottom:4px">
              <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px">错题已逐道练习完毕。建议用 AI 生成新题继续巩固这个知识点，而不是重复做已经会了的题。</p>
              <button class="btn btn-primary" id="btn-generate">🤖 AI 生成更多练习</button>
              ${summary.wrong > 0 ? `<button class="btn btn-danger" id="btn-wrong-only" style="margin-left:8px">再练 ${summary.wrong} 道仍错的题</button>` : ''}
            </div>
          ` : `
            <button class="btn btn-primary" id="btn-retry">重新练习</button>
            ${summary.wrong > 0 ? `<button class="btn btn-danger" id="btn-wrong-only">只练错题 (${summary.wrong})</button>` : ''}
            ${summary.wrong > 0 ? `<button class="btn btn-outline" id="btn-generate">🤖 生成相似题</button>` : ''}
          `}
          <button class="btn btn-secondary" id="btn-back">返回模块</button>
        </div>
      </div>`;

    // Render score ring
    import('../components/progress-ring.js').then(({ default: ProgressRing }) => {
      const ringEl = container.querySelector('#result-ring');
      if (ringEl) ProgressRing.render(ringEl, { percent: summary.accuracy, size: 120, strokeWidth: 8, color: summary.accuracy >= 70 ? 'var(--success)' : summary.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)' });
    });

    // Wire buttons
    container.querySelector('#btn-retry')?.addEventListener('click', () => {
      const modeParam = summary.mode !== 'all' ? `?mode=${summary.mode}` : '';
      Router.go(`#/module/${this._moduleId}/sub/${summary.subModuleId}/quiz${modeParam}`);
    });
    container.querySelector('#btn-wrong-only')?.addEventListener('click', () => {
      Router.go(`#/module/${this._moduleId}/sub/${summary.subModuleId}/quiz?mode=wrong`);
    });
    container.querySelector('#btn-generate')?.addEventListener('click', () => {
      this._generateSimilar(container, summary);
    });
    container.querySelector('#btn-back')?.addEventListener('click', () => {
      Router.go(`#/module/${this._moduleId}`);
    });
  },

  async _generateSimilar(container, summary) {
    const btn = container.querySelector('#btn-generate');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ AI 生成中...'; }

    const settings = Storage.loadSettings();
    const wrongQuestions = summary.answers.filter(a => !a.isCorrect).map(a => a.question);

    if (wrongQuestions.length === 0) {
      if (btn) { btn.textContent = '没有错题需要生成'; btn.disabled = true; }
      return;
    }

    // Always try AI first — offline substitution is too basic
    if (settings.use_llm && settings.api_key) {
      try {
        const llmBatch = await QuestionGenerator.generateWithLLM(wrongQuestions[0], 5, settings);
        if (llmBatch.length > 0) {
          DataLoader.addGenerated(llmBatch);
          const firstWrong = summary.answers.find(a => !a.isCorrect);
          const similarQid = firstWrong?.qid || summary.answers[0]?.qid || '';
          if (btn) { btn.textContent = `✅ AI 已生成 ${llmBatch.length} 题 · 去练习`; btn.disabled = false; }
          btn?.addEventListener('click', () => {
            Router.go(`#/module/${this._moduleId}/sub/${summary.subModuleId}/quiz?mode=similar&qid=${similarQid}`);
          }, { once: true });
          return;
        }
      } catch (e) {
        console.warn('AI generation failed:', e);
        if (btn) { btn.textContent = `❌ AI 失败: ${e.message || '未知错误'}`; btn.disabled = true; }
        return;
      }
    }

    // No API key configured — guide user
    if (btn) {
      btn.textContent = '🔑 请先配置 DeepSeek API Key';
      btn.disabled = false;
      btn.addEventListener('click', () => { Router.go('#/settings'); }, { once: true });
    }
  },

  _bindEvents(container) {
    // Wire prev/next buttons
    container.querySelector('#btn-prev')?.addEventListener('click', () => {
      if (this._session.currentIndex > 0) this._goPrev(container);
    });
    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (this._answered) this._goNext(container);
    });

    // Keyboard
    const onKey = (e) => {
      if (e.key >= '1' && e.key <= '4') {
        if (this._answered) return;
        const idx = parseInt(e.key) - 1;
        const q = QuizEngine.currentQuestion(this._session);
        if (q && idx < q.options.length) {
          this._handleAnswer(container, idx);
          const opt = container.querySelector(`.quiz-option[data-index="${idx}"]`);
          if (opt) opt.classList.add('selected');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (this._answered) this._goNext(container);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (this._session.currentIndex > 0) this._goPrev(container);
      } else if (e.key === 'Escape') {
        Router.go(`#/module/${this._moduleId}`);
      }
    };

    document.addEventListener('keydown', onKey);
    this._unbindKey = () => document.removeEventListener('keydown', onKey);

    // Touch swipe
    let touchStartX = 0;
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (!this._answered) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 60) {
        if (dx < 0) { this._goNext(container); }      // swipe left → next
        else if (dx > 0) { this._goPrev(container); }  // swipe right → prev
      }
    };

    const quizEl = container.querySelector('#quiz-card-area');
    if (quizEl) {
      quizEl.addEventListener('touchstart', onTouchStart, { passive: true });
      quizEl.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    this._unbindTouch = () => {
      if (quizEl) {
        quizEl.removeEventListener('touchstart', onTouchStart);
        quizEl.removeEventListener('touchend', onTouchEnd);
      }
    };
  },

  unmount() {
    // Save session if quiz is in progress
    if (this._session && this._session.queue && this._session.queue.length > 0) {
      this._saveSession();
    }
    // Remove beforeunload handler
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._beforeUnloadHandler = null;
    }
    if (this._unbindKey) this._unbindKey();
    if (this._unbindTouch) this._unbindTouch();
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
    this._session = null;
    this._answered = false;
  }
};

export default QuizPage;
