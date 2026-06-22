/**
 * Settings Page — API key, generation preferences, theme.
 */
import Storage from '../storage.js';
import Toast from '../components/toast.js';

const SettingsPage = {
  mount(container) {
    const settings = Storage.loadSettings();

    container.innerHTML = `
      <div class="page-enter settings-page">
        <div class="page-header">
          <a class="back-link" href="#/">← 返回首页</a>
          <h2>⚙️ 设置</h2>
        </div>

        <div class="settings-group">
          <h3>🤖 AI 生成</h3>
          <div class="form-group">
            <label>DeepSeek API Key</label>
            <input type="password" id="api-key" value="${this._escape(settings.api_key || '')}" placeholder="sk-...">
            <p class="form-hint"><a href="https://platform.deepseek.com/api_keys" target="_blank">免费获取 API Key</a>（新用户送 500 万 tokens）。Key 仅存储在浏览器，通过本地服务器转发请求。</p>
          </div>
          <div class="form-group">
            <label>模型</label>
            <select id="llm-model">
              <option value="deepseek-chat" ${settings.llm_model === 'deepseek-chat' || !settings.llm_model ? 'selected' : ''}>DeepSeek-V3（推荐，性价比最高）</option>
              <option value="deepseek-reasoner" ${settings.llm_model === 'deepseek-reasoner' ? 'selected' : ''}>DeepSeek-R1（深度推理，更慢但更准）</option>
            </select>
          </div>
          <div class="form-group">
            <div class="toggle" id="toggle-llm">
              <div class="toggle-switch ${settings.use_llm ? 'active' : ''}" id="toggle-switch"></div>
              <span class="toggle-label">启用 AI 生成相似题</span>
            </div>
            <p class="form-hint">开启后做错题时可 AI 生成相似题。关闭时仍可使用离线规则生成。</p>
          </div>
        </div>

        <div class="settings-group">
          <h3>📊 数据管理</h3>
          <div class="form-group">
            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:8px">
              存储用量: <strong>${Storage.usageKB()} KB</strong> ·
              导入题: <strong>${Storage.loadImported().length} 道</strong> ·
              生成题: <strong>${Storage.loadGenerated().length} 道</strong>
            </p>
            <button class="btn btn-outline btn-sm" id="btn-clear-generated">清除生成题</button>
            <button class="btn btn-outline btn-sm" id="btn-clear-imported" style="margin-left:8px">清除导入题</button>
            <button class="btn btn-danger btn-sm" id="btn-clear-all" style="margin-left:8px">清除所有数据</button>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-save">💾 保存设置</button>
      </div>`;

    this._bindEvents(container, settings);
  },

  _bindEvents(container, originalSettings) {
    // Toggle
    container.querySelector('#toggle-llm').addEventListener('click', () => {
      const sw = container.querySelector('#toggle-switch');
      sw.classList.toggle('active');
    });

    // Save
    container.querySelector('#btn-save').addEventListener('click', () => {
      const settings = {
        api_key: container.querySelector('#api-key').value.trim(),
        llm_model: container.querySelector('#llm-model').value,
        use_llm: container.querySelector('#toggle-switch').classList.contains('active')
      };
      Storage.saveSettings(settings);
      Toast.show('✅ 设置已保存', 'success');
    });

    // Clear generated
    container.querySelector('#btn-clear-generated').addEventListener('click', () => {
      if (confirm('确定清除所有 AI 生成的题目？此操作不可撤销。')) {
        Storage.saveGenerated([]);
        Toast.show('已清除生成的题目', 'info');
        location.reload();
      }
    });

    // Clear imported
    container.querySelector('#btn-clear-imported').addEventListener('click', () => {
      if (confirm('确定清除所有导入的题目？此操作不可撤销。')) {
        Storage.saveImported([]);
        Toast.show('已清除导入的题目', 'info');
        location.reload();
      }
    });

    // Clear all
    container.querySelector('#btn-clear-all').addEventListener('click', () => {
      if (confirm('确定清除所有数据（包括做题记录、导入题、生成题、设置）？此操作不可撤销！')) {
        Storage.clearAll();
        Toast.show('已清除所有数据', 'info');
        setTimeout(() => location.reload(), 500);
      }
    });
  },

  _escape(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  },

  unmount() {}
};

export default SettingsPage;
