/**
 * Quiz Engine — pure logic, no DOM.
 * Handles question queuing, scoring, session management.
 */

const QuizEngine = {
  /**
   * Build a question queue for a session.
   * @param {Array} questions - Full question pool
   * @param {Object} options
   * @param {string} options.mode - 'all' | 'wrong' | 'similar'
   * @param {Array} options.wrongIds - Question IDs the user got wrong
   * @param {Array} options.specificIds - Exact question IDs to use (for similar mode)
   * @param {number} options.count - Max questions (default: all)
   * @param {boolean} options.shuffle - Randomize order (default: true)
   */
  buildQueue(questions, options = {}) {
    const { mode = 'all', wrongIds = [], specificIds = null, count = questions.length, shuffle = true } = options;

    let pool = [...questions];

    if (specificIds && specificIds.length > 0) {
      pool = pool.filter(q => specificIds.includes(q.id));
    } else if (mode === 'wrong') {
      pool = pool.filter(q => wrongIds.includes(q.id));
    }

    // Shuffle using Fisher-Yates
    if (shuffle) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    // Limit count
    if (count > 0 && pool.length > count) {
      pool = pool.slice(0, count);
    }

    return pool;
  },

  /**
   * Create a new quiz session.
   */
  createSession(subModuleId, questions, options = {}) {
    const queue = this.buildQueue(questions, options);
    return {
      id: 'ses-' + Date.now(),
      subModuleId,
      queue,
      currentIndex: 0,
      answers: [],        // { qid, selected, correct, timeMs }
      startTime: Date.now(),
      mode: options.mode || 'all'
    };
  },

  /** Get current question from session */
  currentQuestion(session) {
    if (!session || session.currentIndex >= session.queue.length) return null;
    return session.queue[session.currentIndex];
  },

  /** Submit an answer, returns { correct, question, answer, explanation } */
  submitAnswer(session, selectedIndex, timeMs) {
    const question = this.currentQuestion(session);
    if (!question) return null;

    const correct = question.answer === selectedIndex;
    const result = {
      qid: question.id,
      selected: selectedIndex,
      correct: question.answer,
      isCorrect: correct,
      timeMs: timeMs || 0,
      question,
      explanation: question.explanation || '',
      commonMistake: question.common_mistake || ''
    };

    session.answers.push(result);
    return result;
  },

  /** Remove current question from queue (used when correct answer in wrong mode) */
  removeCurrentFromQueue(session) {
    if (session.currentIndex < session.queue.length) {
      session.queue.splice(session.currentIndex, 1);
      // Don't advance index — currentIndex now points to the next question
      return true;
    }
    return false;
  },

  /** Advance to next question */
  next(session) {
    session.currentIndex++;
    return this.currentQuestion(session);
  },

  /** Go to previous question (review only) */
  prev(session) {
    if (session.currentIndex > 0) {
      session.currentIndex--;
    }
    return this.currentQuestion(session);
  },

  /** Check if session has more questions */
  hasNext(session) {
    return session.currentIndex < session.queue.length - 1;
  },

  /** Check if session is complete */
  isComplete(session) {
    return session.currentIndex >= session.queue.length;
  },

  /** Get session summary */
  summary(session) {
    const total = session.answers.length;
    const correct = session.answers.filter(a => a.isCorrect).length;
    const wrong = total - correct;
    const avgTime = total > 0 ? Math.round(session.answers.reduce((s, a) => s + a.timeMs, 0) / total) : 0;
    const elapsed = Date.now() - session.startTime;
    const wrongQuestions = session.answers.filter(a => !a.isCorrect).map(a => a.qid);

    return {
      sessionId: session.id,
      subModuleId: session.subModuleId,
      mode: session.mode,
      total,
      correct,
      wrong,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      avgTimeMs: avgTime,
      elapsedMs: elapsed,
      wrongIds: wrongQuestions,
      answers: session.answers,
      completedAt: new Date().toISOString()
    };
  },

  /** Get answer for a previous question (for review) */
  getAnswer(session, index) {
    if (index < 0 || index >= session.answers.length) return null;
    return session.answers[index];
  }
};

export default QuizEngine;
