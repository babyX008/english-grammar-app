/**
 * Question importer: CSV / JSON / paste → validate → dedupe → merge.
 */

const Importer = {
  /**
   * Parse CSV text into question objects.
   * Auto-maps column names (supports both Chinese and English headers).
   */
  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { error: 'CSV must have a header row and at least one data row' };

    // Parse header
    const headers = this._splitCSVLine(lines[0]);
    const colMap = this._mapColumns(headers);
    if (!colMap.question) return { error: 'CSV must have a "question" or "题目" column' };

    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this._splitCSVLine(lines[i]);
      if (cols.length === 0) continue;

      const q = {};
      for (const [field, idx] of Object.entries(colMap)) {
        q[field] = (cols[idx] || '').trim();
      }

      // Parse options into array
      const options = [];
      for (const key of ['optionA', 'optionB', 'optionC', 'optionD', 'optionE']) {
        if (q[key]) options.push(q[key]);
        delete q[key];
      }

      if (q.question && options.length >= 2) {
        questions.push({
          id: 'imp-' + this._uuid(),
          sub_module_id: q.sub_module_id || '',
          tags: q.tags ? q.tags.split(/[,;，；]/).map(t => t.trim()).filter(Boolean) : [],
          type: 'choice',
          question: q.question,
          options,
          answer: this._parseAnswer(q.answer, options.length),
          explanation: q.explanation || '',
          common_mistake: q.common_mistake || '',
          source: 'imported',
          template_ref: null
        });
      }
    }
    return { questions, count: questions.length };
  },

  /** Map column headers to standard field names */
  _mapColumns(headers) {
    const mapping = {
      question: ['question', '题目', '题干', 'question_text'],
      optionA: ['optionA', 'a', '选项A', '选项a', 'opt_a', 'choice_a'],
      optionB: ['optionB', 'b', '选项B', '选项b', 'opt_b', 'choice_b'],
      optionC: ['optionC', 'c', '选项C', '选项c', 'opt_c', 'choice_c'],
      optionD: ['optionD', 'd', '选项D', '选项d', 'opt_d', 'choice_d'],
      optionE: ['optionE', 'e', '选项E', '选项e', 'opt_e', 'choice_e'],
      answer: ['answer', '答案', 'correct', 'correct_answer', 'key'],
      explanation: ['explanation', '解析', '详解', 'note'],
      common_mistake: ['common_mistake', '常见错误', 'mistake', '易错点'],
      tags: ['tags', '标签', 'keywords', '知识点', 'knowledge_points'],
      sub_module_id: ['sub_module_id', '子模块', 'submodule', 'module_id', '所属模块', 'sub_module']
    };

    const map = {};
    for (const [field, aliases] of Object.entries(mapping)) {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].trim().toLowerCase();
        if (aliases.includes(h) || aliases.some(a => h === a.toLowerCase())) {
          map[field] = i;
          break;
        }
      }
    }
    return map;
  },

  /** Parse answer: support 'A'/'B'/etc, '0'/'1'/etc, or 'C' for option letters */
  _parseAnswer(raw, numOptions) {
    if (raw === undefined || raw === '') return 0;
    const val = raw.trim().toUpperCase();
    // Letter format: A,B,C,D...
    if (/^[A-Z]$/.test(val)) {
      const idx = val.charCodeAt(0) - 65; // 'A' = 0, 'B' = 1...
      return (idx >= 0 && idx < numOptions) ? idx : 0;
    }
    // Number format: 0-based or 1-based
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      return num > 0 ? num - 1 : num; // 1-based → 0-based
    }
    return 0;
  },

  /** Split CSV line respecting quoted fields */
  _splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  },

  /** Parse JSON array of questions */
  parseJSON(text) {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : (data.questions || []);
      const questions = arr.map((q, i) => ({
        id: 'imp-' + this._uuid(),
        sub_module_id: q.sub_module_id || '',
        tags: Array.isArray(q.tags) ? q.tags : [],
        type: q.type || 'choice',
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        answer: typeof q.answer === 'number' ? q.answer : 0,
        explanation: q.explanation || '',
        common_mistake: q.common_mistake || '',
        source: 'imported',
        template_ref: null
      })).filter(q => q.question && q.options.length >= 2);
      return { questions, count: questions.length };
    } catch (e) {
      return { error: 'Invalid JSON: ' + e.message };
    }
  },

  /** Parse freeform text (one question per block, blank-line separated) */
  parseText(text) {
    const blocks = text.split(/\n\s*\n/);
    const questions = [];

    for (const block of blocks) {
      const lines = block.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 3) continue;

      const question = lines[0].replace(/^\d+[\.\、\)）]\s*/, '');
      const options = [];
      let answer = 0;
      let explanation = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const optMatch = line.match(/^([A-Da-d])[\.\、\)）]\s*(.+)/);
        if (optMatch) {
          options.push(optMatch[2]);
          if (/\*\*?/.test(line) || /（答案|正确）/.test(line)) answer = options.length - 1;
        } else if (line.startsWith('答案') || line.startsWith('Answer')) {
          const ans = line.match(/[A-D]/i);
          if (ans) answer = ans[0].toUpperCase().charCodeAt(0) - 65;
        } else if (line.startsWith('解析') || line.startsWith('Explanation')) {
          explanation = line.replace(/^(解析|Explanation)[:：]?\s*/, '');
        }
      }

      if (question && options.length >= 2) {
        questions.push({
          id: 'imp-' + this._uuid(),
          sub_module_id: '',
          tags: [],
          type: 'choice',
          question,
          options,
          answer,
          explanation,
          common_mistake: '',
          source: 'imported',
          template_ref: null
        });
      }
    }
    return { questions, count: questions.length };
  },

  /**
   * Validate a question object.
   * Returns { valid, warnings, errors }
   */
  validate(question) {
    const errors = [];
    const warnings = [];
    if (!question.question || question.question.trim().length < 3) errors.push('题干太短或为空');
    if (!question.options || question.options.length < 2) errors.push('至少需要2个选项');
    if (question.answer < 0 || question.answer >= (question.options?.length || 0)) errors.push('答案索引超出选项范围');
    if (!question.sub_module_id) warnings.push({ field: 'sub_module_id', msg: '未指定子模块，将归入"未分类"' });
    return { valid: errors.length === 0, errors, warnings };
  },

  /**
   * Validate a batch. Returns { valid, invalid, warnings, report }
   */
  validateBatch(questions) {
    const valid = [];
    const invalid = [];
    const warnings = [];
    for (const q of questions) {
      const result = this.validate(q);
      if (result.valid) {
        valid.push(q);
        if (result.warnings.length) warnings.push(...result.warnings.map(w => ({ q, ...w })));
      } else {
        invalid.push({ q, errors: result.errors });
      }
    }
    return { valid, invalid, warnings, total: questions.length };
  },

  /** Simple text similarity check (Jaccard on 3-grams, fast approximation) */
  _similarity(a, b) {
    if (a === b) return 1;
    const getGrams = (s) => { const g = new Set(); for (let i=0; i<s.length-2; i++) g.add(s.substring(i,i+3)); return g; };
    const ga = getGrams(a.toLowerCase());
    const gb = getGrams(b.toLowerCase());
    if (ga.size === 0 || gb.size === 0) return 0;
    let intersect = 0;
    for (const g of ga) { if (gb.has(g)) intersect++; }
    return intersect / Math.max(ga.size, gb.size);
  },

  /** Deduplicate against existing questions */
  dedupe(newQuestions, existingById) {
    const unique = [];
    const dupes = [];
    for (const q of newQuestions) {
      let isDupe = false;
      for (const existing of Object.values(existingById)) {
        if (this._similarity(q.question, existing.question) >= 0.85) {
          dupes.push({ new: q, existing });
          isDupe = true;
          break;
        }
      }
      if (!isDupe) unique.push(q);
    }
    return { unique, dupes };
  },

  /** Generate a short UUID */
  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }).slice(0, 8);
  }
};

export default Importer;
