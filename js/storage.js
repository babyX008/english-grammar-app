/**
 * localStorage wrapper with:
 * - Auto-save queue (debounced writes)
 * - Three-tier question storage (builtin + imported + generated)
 * - Corruption recovery
 * - Progress tracking
 */

const STORAGE_KEY = 'grammar_app';
const IMPORTED_KEY = 'grammar_imported_qs';
const GENERATED_KEY = 'grammar_generated_qs';
const SETTINGS_KEY = 'grammar_settings';
const SESSION_KEY = 'grammar_quiz_session';

const Storage = {
  _defaults() {
    return {
      questions: {},           // { questionId: { attempts, correct, last_at } }
      wrong_book: {},          // { qid: { wrongCount, consecutiveCorrect, lastAttempt, history[] } }
      weak_topics: {},         // { sub_module_id: { totalWrong, firstWrong, lastWrong, proficiency } }
      wrong_ids: [],           // Deprecated — kept for migration, replaced by wrong_book + getWrongIds()
      sessions: [],            // { sub_module_id, score, total, at, mode }
      sub_module_completed: [],// Sub-module IDs fully completed
      streak: { current: 0, longest: 0 },
      version: 2
    };
  },

  /** Load user progress from localStorage, with migration from v1 */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let data = JSON.parse(raw);
        data = { ...this._defaults(), ...data };

        // Migrate from v1: wrong_ids array → wrong_book object
        if (data.version < 2 && Array.isArray(data.wrong_ids) && data.wrong_ids.length > 0) {
          if (Object.keys(data.wrong_book || {}).length === 0) {
            for (const qid of data.wrong_ids) {
              data.wrong_book[qid] = {
                wrongCount: 1,
                consecutiveCorrect: 0,
                lastAttempt: new Date().toISOString(),
                history: [{ at: new Date().toISOString(), correct: false }]
              };
              // Extract sub_module_id from qid and init weak_topics
              const smId = this._extractSubModuleId(qid);
              if (smId && !data.weak_topics[smId]) {
                data.weak_topics[smId] = {
                  totalWrong: 1,
                  firstWrong: new Date().toISOString(),
                  lastWrong: new Date().toISOString(),
                  proficiency: 'weak'
                };
              }
            }
          }
          data.version = 2;
        }

        return data;
      }
    } catch (e) {
      console.warn('[Storage] Corrupted data, resetting:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return this._defaults();
  },

  /** Compute wrong_ids from wrong_book — all entries not yet removed */
  getWrongIds(userData) {
    return Object.entries(userData.wrong_book || {})
      .filter(([qid, entry]) => entry.consecutiveCorrect < 2)
      .map(([qid]) => qid);
  },

  /** Record an answer in wrong_book and weak_topics */
  recordAnswer(userData, qid, subModuleId, isCorrect) {
    const now = new Date().toISOString();

    // Init wrong_book entry
    if (!userData.wrong_book[qid]) {
      userData.wrong_book[qid] = { wrongCount: 0, consecutiveCorrect: 0, lastAttempt: now, history: [] };
    }
    const entry = userData.wrong_book[qid];
    entry.lastAttempt = now;
    entry.history = entry.history || [];
    entry.history.push({ at: now, correct: isCorrect });
    // Keep last 20
    if (entry.history.length > 20) entry.history = entry.history.slice(-20);

    if (isCorrect) {
      entry.consecutiveCorrect = (entry.consecutiveCorrect || 0) + 1;
    } else {
      entry.wrongCount = (entry.wrongCount || 0) + 1;
      entry.consecutiveCorrect = 0;

      // Update weak_topics
      if (subModuleId) {
        if (!userData.weak_topics[subModuleId]) {
          userData.weak_topics[subModuleId] = {
            totalWrong: 0,
            firstWrong: now,
            lastWrong: now,
            proficiency: 'weak'
          };
        }
        const wt = userData.weak_topics[subModuleId];
        wt.totalWrong = (wt.totalWrong || 0) + 1;
        wt.lastWrong = now;
        // Never auto-upgrade proficiency — user must practice specifically
      }
    }

    // Update wrong_ids for backward compat
    userData.wrong_ids = this.getWrongIds(userData);
  },

  /** Get active wrong book entries (not yet removed = consecutiveCorrect < 2) */
  getActiveWrongBook(userData) {
    const result = {};
    for (const [qid, entry] of Object.entries(userData.wrong_book || {})) {
      if ((entry.consecutiveCorrect || 0) < 2) {
        result[qid] = entry;
      }
    }
    return result;
  },

  /** Get removed (mastered) wrong book entries */
  getRemovedWrongBook(userData) {
    const result = {};
    for (const [qid, entry] of Object.entries(userData.wrong_book || {})) {
      if ((entry.consecutiveCorrect || 0) >= 2) {
        result[qid] = entry;
      }
    }
    return result;
  },

  /** Get weak topics */
  getWeakTopics(userData) {
    return userData.weak_topics || {};
  },

  /** Update weak topic proficiency after dedicated practice */
  updateTopicProficiency(userData, subModuleId, sessionAccuracy) {
    if (!userData.weak_topics[subModuleId]) return;
    const wt = userData.weak_topics[subModuleId];
    if (sessionAccuracy >= 80) {
      wt.proficiency = 'ok';
    } else if (sessionAccuracy >= 50) {
      wt.proficiency = 'practicing';
    }
    // stays 'weak' if < 50%
  },

  /** Try to extract sub_module_id from question ID */
  _extractSubModuleId(qid) {
    // q-book-nouns-001 → noun
    // q-gap-adj-functions-001 → adj-functions
    // q-extra-noun-countable-001 → noun-countable
    // q-001 → unknown
    if (qid.startsWith('q-book-')) {
      const parts = qid.split('-');
      // q-book-nouns-001: parts[1]=nouns (not useful), parts[2]=001
      // Actually the sub_module_id is in options, not in the ID.
      // Return a best-guess from the ID prefix
      const mid = parts.slice(2, -1).join('-');
      return mid || null;
    }
    if (qid.startsWith('q-gap-') || qid.startsWith('q-bulk-') || qid.startsWith('q-extra-')) {
      const parts = qid.split('-');
      return parts.slice(2).join('-') || null;
    }
    return null;
  },

  /** Save user progress (debounced internally by callers, or call directly) */
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage] Save failed:', e);
    }
  },

  /** Load imported questions */
  loadImported() {
    try {
      const raw = localStorage.getItem(IMPORTED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /** Save imported questions */
  saveImported(questions) {
    try {
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(questions));
    } catch (e) {
      console.error('[Storage] Save imported failed:', e);
    }
  },

  /** Load generated questions */
  loadGenerated() {
    try {
      const raw = localStorage.getItem(GENERATED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  /** Save generated questions */
  saveGenerated(questions) {
    try {
      localStorage.setItem(GENERATED_KEY, JSON.stringify(questions));
    } catch (e) {
      console.error('[Storage] Save generated failed:', e);
    }
  },

  /** Load user settings */
  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { api_key: '', use_llm: false, llm_model: 'deepseek-chat' };
    } catch (e) {
      return { api_key: '', use_llm: false, llm_model: 'deepseek-chat' };
    }
  },

  /** Save user settings */
  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('[Storage] Save settings failed:', e);
    }
  },

  /** Save in-progress quiz session */
  saveQuizSession(subModuleId, queue, currentIndex, answers, mode, moduleId) {
    try {
      const session = {
        subModuleId,
        moduleId,
        queue,
        currentIndex,
        answers,
        mode,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('[Storage] Save session failed:', e);
    }
  },

  /** Load saved quiz session, or null if none / expired (>24h) */
  loadQuizSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Expire sessions older than 24 hours
      const age = Date.now() - new Date(session.savedAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  },

  /** Clear saved quiz session */
  clearQuizSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  /** Wipe all user data */
  clearAll() {
    [STORAGE_KEY, IMPORTED_KEY, GENERATED_KEY, SETTINGS_KEY, SESSION_KEY].forEach(k => localStorage.removeItem(k));
  },

  /** Get total storage usage estimate in KB */
  usageKB() {
    let size = 0;
    [STORAGE_KEY, IMPORTED_KEY, GENERATED_KEY, SETTINGS_KEY].forEach(k => {
      const v = localStorage.getItem(k);
      if (v) size += v.length * 2; // UTF-16
    });
    return Math.round(size / 1024);
  }
};

export default Storage;
