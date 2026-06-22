/**
 * Data loader: fetch static JSON + merge with localStorage tiers.
 * Returns the unified question bank and module hierarchy.
 */

import Storage from './storage.js';

const DataLoader = {
  _builtinQuestions: null,
  _modules: null,
  _templates: null,
  _allQuestions: null,
  _questionsById: null,
  _questionsBySubModule: null,

  /** Load all data sources and merge */
  async init() {
    try {
      // Fetch built-in data files
      const [qRes, mRes, tRes] = await Promise.all([
        fetch('data/questions.json'),
        fetch('data/modules.json'),
        fetch('data/templates.json')
      ]);

      if (!qRes.ok && !mRes.ok) {
        throw new Error('Failed to load data files');
      }

      this._builtinQuestions = qRes.ok ? await qRes.json() : [];
      this._modules = mRes.ok ? (await mRes.json()).modules || [] : [];
      this._templates = tRes.ok ? await tRes.json() : [];

      // Load user data tiers
      const imported = Storage.loadImported();
      const generated = Storage.loadGenerated();

      // Merge all questions
      this._allQuestions = [
        ...this._builtinQuestions,
        ...imported,
        ...generated
      ];

      // Build index maps
      this._questionsById = {};
      this._questionsBySubModule = {};

      for (const q of this._allQuestions) {
        this._questionsById[q.id] = q;
        const sm = q.sub_module_id || '_uncategorized';
        if (!this._questionsBySubModule[sm]) this._questionsBySubModule[sm] = [];
        this._questionsBySubModule[sm].push(q);
      }

      return {
        questions: this._allQuestions,
        modules: this._modules,
        templates: this._templates,
        questionsById: this._questionsById,
        questionsBySubModule: this._questionsBySubModule
      };
    } catch (e) {
      console.error('[DataLoader] Init failed:', e);
      return {
        questions: [],
        modules: [],
        templates: [],
        questionsById: {},
        questionsBySubModule: {}
      };
    }
  },

  /** Get all questions for a sub-module */
  /** Get all questions (for search) */
  getAll() {
    return this._allQuestions || [];
  },

  getBySubModule(subModuleId) {
    return this._questionsBySubModule[subModuleId] || [];
  },

  /** Get all wrong questions for a sub-module */
  getWrongBySubModule(subModuleId, wrongIds) {
    const questions = this.getBySubModule(subModuleId);
    return questions.filter(q => wrongIds.includes(q.id));
  },

  /** Get questions by tags */
  getByTags(tags, subModuleId) {
    const pool = subModuleId ? this.getBySubModule(subModuleId) : this._allQuestions;
    return pool.filter(q => q.tags && q.tags.some(t => tags.includes(t)));
  },

  /** Get a single question by ID */
  getById(id) {
    return this._questionsById[id] || null;
  },

  /** Add newly generated questions to the runtime cache + localStorage */
  addGenerated(newQuestions) {
    const existing = Storage.loadGenerated();
    const merged = [...existing, ...newQuestions];
    Storage.saveGenerated(merged);
    // Update runtime cache
    for (const q of newQuestions) {
      this._questionsById[q.id] = q;
      const sm = q.sub_module_id || '_uncategorized';
      if (!this._questionsBySubModule[sm]) this._questionsBySubModule[sm] = [];
      this._questionsBySubModule[sm].push(q);
    }
    return newQuestions;
  },

  /** Add imported questions */
  addImported(newQuestions) {
    const existing = Storage.loadImported();
    const merged = [...existing, ...newQuestions];
    Storage.saveImported(merged);
    for (const q of newQuestions) {
      this._questionsById[q.id] = q;
      const sm = q.sub_module_id || '_uncategorized';
      if (!this._questionsBySubModule[sm]) this._questionsBySubModule[sm] = [];
      this._questionsBySubModule[sm].push(q);
    }
    return newQuestions;
  },

  /** Get module progress stats */
  getModuleStats(moduleId, userData) {
    const module = this._modules.find(m => m.id === moduleId);
    if (!module) return { total: 0, completed: 0, accuracy: 0 };

    let total = 0;
    let correct = 0;
    let moduleAttempts = 0;
    for (const sm of module.sub_modules) {
      const qs = this.getBySubModule(sm.id);
      total += qs.length;
      for (const q of qs) {
        if (userData.questions[q.id]) {
          correct += userData.questions[q.id].correct || 0;
          moduleAttempts += userData.questions[q.id].attempts || 0;
        }
      }
    }
    return {
      total,
      attempted: moduleAttempts,
      accuracy: moduleAttempts > 0 ? Math.round((correct / moduleAttempts) * 100) : 0,
      completedSubModules: (module.sub_modules || []).filter(sm => userData.sub_module_completed.includes(sm.id)).length,
      totalSubModules: (module.sub_modules || []).length
    };
  }
};

export default DataLoader;
