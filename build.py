#!/usr/bin/env python3
"""Build standalone HTML with PWA support."""
import json, os, re, base64

ROOT = os.path.dirname(os.path.abspath(__file__))

# Embed mindmap images as base64
MINDMAP_DIR = os.path.join(ROOT, 'mindmaps')
embedded_mindmaps = {}
mindmap_files = sorted([f for f in os.listdir(MINDMAP_DIR) if f.endswith('.webp')])
for f in mindmap_files:
    with open(os.path.join(MINDMAP_DIR, f), 'rb') as fh:
        b64 = base64.b64encode(fh.read()).decode('ascii')
        embedded_mindmaps[f'mindmaps/{f}'] = f'data:image/webp;base64,{b64}'
print(f'Embedded {len(embedded_mindmaps)} mindmap images')

# CSS files
css = ''
for f in ['css/reset.css', 'css/theme.css', 'css/app.css']:
    with open(os.path.join(ROOT, f), 'r', encoding='utf-8') as fh:
        css += fh.read() + '\n'

# JS files in order
js_files = [
    'js/event-bus.js', 'js/storage.js', 'js/router.js', 'js/quiz-engine.js',
    'js/question-generator.js', 'js/importer.js', 'js/components/toast.js',
    'js/components/progress-ring.js', 'js/components/heatmap.js',
    'js/data-loader.js', 'js/pages/home.js', 'js/pages/module.js',
    'js/pages/summary.js', 'js/pages/quiz.js', 'js/pages/result.js',
    'js/pages/import.js', 'js/pages/settings.js', 'js/pages/stats.js',
    'js/pages/wrongbook.js', 'js/app.js',
]
js = ''
for f in js_files:
    with open(os.path.join(ROOT, f), 'r', encoding='utf-8') as fh:
        code = fh.read()
        code = re.sub(r'^import\s+.*?;\s*$', '/* import removed */', code, flags=re.MULTILINE)
        code = re.sub(r'^export\s+default\s+', 'var __mod = ', code, flags=re.MULTILINE)
        code = re.sub(r'^export\s+(const|let|var|function|class)\s+', r'\1 ', code, flags=re.MULTILINE)
        code = re.sub(r'^export\s+\{.*?\};\s*$', '/* export removed */', code, flags=re.MULTILINE)
        code = re.sub(r'^export\s+', '/* export removed */ ', code, flags=re.MULTILINE)
        js += f'\n// === {f} ===\n' + code + '\n'

# Questions JSON
with open(os.path.join(ROOT, 'data', 'questions.json'), 'r', encoding='utf-8') as fh:
    questions = json.load(fh)
with open(os.path.join(ROOT, 'data', 'modules.json'), 'r', encoding='utf-8') as fh:
    modules = json.load(fh)

# Build HTML
html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0f0f0f">
  <meta name="description" content="英语语法练习 — 按模块练习选择题，即时反馈，错题重练">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="语法练习">
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>📝</text></svg>">
  <link rel="manifest" href="data:application/json;base64,eyJuYW1lIjogIuiLseivreivreazlee7g+S5oCIsICJzaG9ydF9uYW1lIjogIuivreazlee7g+S5oCIsICJzdGFydF91cmwiOiAiLi8iLCAiZGlzcGxheSI6ICJzdGFuZGFsb25lIiwgImJhY2tncm91bmRfY29sb3IiOiAiIzBmMGYwZiIsICJ0aGVtZV9jb2xvciI6ICIjMGYwZjBmIiwgIm9yaWVudGF0aW9uIjogInBvcnRyYWl0LXByaW1hcnkiLCAiaWNvbnMiOiBbeyJzcmMiOiAiZGF0YTppbWFnZS9zdmcreG1sLDxzdmcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJyB2aWV3Qm94PScwIDAgMTAwIDEwMCc+PHRleHQgeT0nMC45ZW0nIGZvbnQtc2l6ZT0nOTAnPvCfk508L3RleHQ+PC9zdmc+IiwgInNpemVzIjogIjE0NHgxNDQiLCAidHlwZSI6ICJpbWFnZS9zdmcreG1sIn1dfQ==">
  <title>英语语法练习</title>
  <style>{css}</style>
</head>
<body>
  <div class="app-shell">
    <header class="app-header">
      <a href="#/" class="logo">📝 语法练习</a>
      <nav class="nav-links">
        <a href="#/">首页</a>
        <a href="#/wrongbook">错题本</a>
        <a href="#/stats">统计</a>
        <a href="#/import">导入</a>
        <a href="#/settings">设置</a>
      </nav>
    </header>
    <main class="app-main" id="app-main">
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
    </main>
  </div>
  <script>
    // Embedded data
    const __EMBEDDED_QUESTIONS = {json.dumps(questions, ensure_ascii=False)};
    const __EMBEDDED_MODULES = {json.dumps(modules, ensure_ascii=False)};
	    const __EMBEDDED_MINDMAPS = {json.dumps(embedded_mindmaps, ensure_ascii=False)};

    // Override fetch for data files
    const _origFetch = window.fetch;
    window.fetch = function(url, opts) {{
      if (typeof url === 'string') {{
        if (url.includes('questions.json')) return Promise.resolve(new Response(JSON.stringify(__EMBEDDED_QUESTIONS), {{ headers: {{ 'Content-Type': 'application/json' }} }}));
        if (url.includes('modules.json')) return Promise.resolve(new Response(JSON.stringify(__EMBEDDED_MODULES), {{ headers: {{ 'Content-Type': 'application/json' }} }}));
        if (url.includes('templates.json')) return Promise.resolve(new Response('[]', {{ headers: {{ 'Content-Type': 'application/json' }} }}));
      }}
      return _origFetch.call(this, url, opts);
    }};
  </script>
  <script>{js}</script>
  <script>
    // PWA Service Worker
    if ('serviceWorker' in navigator) {{
      const swCode = "self.addEventListener('install',e=>{{e.waitUntil(caches.open('grammar-v1').then(c=>c.addAll(['.'])).then(()=>self.skipWaiting()))}});self.addEventListener('activate',e=>{{e.waitUntil(clients.claim())}});self.addEventListener('fetch',e=>{{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{{let c2=res.clone();caches.open('grammar-v1').then(c=>c.put(e.request,c2));return res}})))}})";
      const blob = new Blob([swCode], {{ type: 'application/javascript' }});
      navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(()=>{{}});
    }}
  </script>
</body>
</html>'''

out = os.path.join(ROOT, '英语语法练习.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)

size_kb = os.path.getsize(out) / 1024
print(f"Built: {out}")
print(f"Size: {size_kb:.0f} KB")
print(f"Questions: {len(questions)}")
print("PWA: ✅ (installable on mobile)")
