/**
 * Import Page — Upload CSV/JSON or paste text to import questions.
 */
import Importer from '../importer.js';
import DataLoader from '../data-loader.js';
import Router from '../router.js';
import Toast from '../components/toast.js';

const ImportPage = {
  _previewData: [],
  _activeTab: 'file',

  mount(container) {
    container.innerHTML = `
      <div class="page-enter import-page">
        <div class="page-header">
          <a class="back-link" href="#/">← 返回首页</a>
          <h2>📥 导入题库</h2>
          <p class="subtitle">支持 CSV、JSON 文件上传，或直接粘贴文本</p>
        </div>
        <div class="import-tabs">
          <button class="import-tab active" data-tab="file">📁 文件上传</button>
          <button class="import-tab" data-tab="paste">📋 粘贴文本</button>
          <button class="import-tab" data-tab="paste-json">📋 粘贴 JSON</button>
        </div>

        <div id="tab-file" class="tab-content">
          <div class="drop-zone" id="drop-zone">
            <div class="dz-icon">📂</div>
            <div class="dz-text">拖拽 CSV 或 JSON 文件到此处</div>
            <div class="dz-hint">或点击选择文件 · 支持 .csv, .json</div>
            <input type="file" id="file-input" accept=".csv,.json" style="display:none">
          </div>
        </div>

        <div id="tab-paste" class="tab-content" style="display:none">
          <div class="form-group">
            <label>粘贴题目文本（每题一块，空行分隔）</label>
            <textarea id="paste-text" placeholder="1. We haven't got much __ for our picnic.&#10;A. apple  B. tomato  C. bread  D. biscuit&#10;答案: C&#10;&#10;2. She ___ to school every day.&#10;A. go  B. goes  C. going  D. gone&#10;答案: B"></textarea>
            <p class="form-hint">格式：题号. 题干 → A.选项1  B.选项2 ... → 答案:选项字母 · 每道题之间空一行</p>
          </div>
          <button class="btn btn-primary" id="btn-parse-text">解析文本</button>
        </div>

        <div id="tab-paste-json" class="tab-content" style="display:none">
          <div class="form-group">
            <label>粘贴 JSON 数组</label>
            <textarea id="paste-json" placeholder='[{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..."}]'></textarea>
          </div>
          <button class="btn btn-primary" id="btn-parse-json">解析 JSON</button>
        </div>

        <div id="preview-area" style="margin-top:20px;display:none"></div>
        <div id="import-result" style="margin-top:16px"></div>
      </div>`;

    this._bindEvents(container);
  },

  _bindEvents(container) {
    // Tab switching
    container.querySelectorAll('.import-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeTab = tab.dataset.tab;
        container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        container.querySelector(`#tab-${tab.dataset.tab}`).style.display = '';
      });
    });

    // Drag and drop
    const dropZone = container.querySelector('#drop-zone');
    const fileInput = container.querySelector('#file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._processFile(file, container);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._processFile(file, container);
    });

    // Parse buttons
    container.querySelector('#btn-parse-text').addEventListener('click', () => {
      const text = container.querySelector('#paste-text').value;
      const result = Importer.parseText(text);
      if (result.error) { Toast.show(result.error, 'error'); return; }
      this._previewData = result.questions;
      this._showPreview(container);
    });

    container.querySelector('#btn-parse-json').addEventListener('click', () => {
      const text = container.querySelector('#paste-json').value;
      const result = Importer.parseJSON(text);
      if (result.error) { Toast.show(result.error, 'error'); return; }
      this._previewData = result.questions;
      this._showPreview(container);
    });
  },

  _processFile(file, container) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      let result;
      if (file.name.endsWith('.csv')) {
        result = Importer.parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        result = Importer.parseJSON(text);
      } else {
        Toast.show('不支持的文件格式，请使用 .csv 或 .json', 'error');
        return;
      }
      if (result.error) { Toast.show(result.error, 'error'); return; }
      this._previewData = result.questions;
      this._showPreview(container);
      Toast.show(`已解析 ${result.count} 道题目`, 'info');
    };
    reader.readAsText(file);
  },

  _showPreview(container) {
    const questions = this._previewData;
    if (!questions.length) {
      container.querySelector('#preview-area').innerHTML = '<p style="color:var(--text-muted)">没有解析到有效的题目</p>';
      container.querySelector('#preview-area').style.display = 'block';
      return;
    }

    const preview = container.querySelector('#preview-area');
    preview.style.display = 'block';
    preview.innerHTML = `
      <h3 style="margin-bottom:12px">预览：${questions.length} 道题</h3>
      <div style="overflow-x:auto">
        <table class="preview-table">
          <thead><tr><th>#</th><th>题干</th><th>选项</th><th>答案</th><th>解析</th><th>状态</th></tr></thead>
          <tbody>
            ${questions.slice(0, 20).map((q, i) => {
              const v = Importer.validate(q);
              const status = v.valid ? '<span style="color:var(--success)">✓</span>' : `<span style="color:var(--danger)" title="${v.errors.join(', ')}">✗</span>`;
              return `<tr>
                <td>${i+1}</td>
                <td>${this._escape(q.question).slice(0, 40)}</td>
                <td>${(q.options||[]).map((o,j) => `${String.fromCharCode(65+j)}. ${o.slice(0,15)}`).join('<br>')}</td>
                <td>${String.fromCharCode(65 + q.answer)}</td>
                <td>${(q.explanation||'').slice(0,30)}</td>
                <td>${status}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${questions.length > 20 ? `<p style="color:var(--text-muted);margin-top:8px">还有 ${questions.length - 20} 道题未显示...</p>` : ''}
      <div style="margin-top:16px;display:flex;gap:12px">
        <button class="btn btn-primary" id="btn-import">✅ 确认导入 ${questions.length} 道题</button>
        <button class="btn btn-secondary" id="btn-cancel">取消</button>
      </div>`;

    container.querySelector('#btn-import').addEventListener('click', () => {
      const { valid, invalid } = Importer.validateBatch(this._previewData);
      if (invalid.length > 0) {
        Toast.show(`${invalid.length} 道题校验不通过，只导入 ${valid.length} 道`, 'warning');
      }
      const count = DataLoader.addImported(valid);
      const resultEl = container.querySelector('#import-result');
      resultEl.innerHTML = `<div class="import-report success">✅ 已成功导入 ${count.length} 道题目！</div>`;
      preview.style.display = 'none';
      setTimeout(() => Router.go('#/'), 1500);
    });

    container.querySelector('#btn-cancel').addEventListener('click', () => {
      preview.style.display = 'none';
      this._previewData = [];
    });
  },

  _escape(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  },

  unmount() {}
};

export default ImportPage;
