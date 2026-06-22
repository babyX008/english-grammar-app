/**
 * Question Generator — produces similar questions for wrong answers.
 * Tier 1: Rule-based substitution engine (offline, always available).
 * Tier 2: LLM-powered (optional, requires API key in settings).
 */

const QuestionGenerator = {
  _templates: [],
  _vocabBank: {
    // Nouns
    uncountable: ['bread', 'water', 'money', 'information', 'advice', 'homework', 'furniture', 'news', 'luggage', 'equipment', 'knowledge', 'progress', 'research', 'evidence', 'weather', 'milk', 'rice', 'sugar', 'salt', 'paper', 'traffic', 'rubbish'],
    countable: ['apple', 'book', 'car', 'dog', 'chair', 'pen', 'desk', 'student', 'teacher', 'picture', 'gift', 'letter', 'ticket', 'bag', 'cup', 'bottle', 'box', 'cake', 'bird', 'flower'],
    // People & roles
    person: ['Tom', 'Lucy', 'Mike', 'Amy', 'Jack', 'Emma', 'David', 'Sarah', 'Peter', 'Mary', 'John', 'Lisa', 'Ben', 'Anna', 'teacher', 'doctor', 'student', 'friend', 'neighbor', 'classmate'],
    personObj: ['me', 'him', 'her', 'us', 'them', 'Tom', 'Lucy', 'Mike', 'Amy', 'my friend', 'his sister', 'her brother'],
    // Places
    place: ['school', 'library', 'park', 'museum', 'hospital', 'restaurant', 'cinema', 'airport', 'station', 'garden', 'supermarket', 'bookstore', 'hotel', 'theater', 'playground'],
    // Time expressions
    time: ['morning', 'afternoon', 'evening', 'weekend', 'holiday', 'summer', 'winter', 'night', 'tomorrow', 'yesterday', 'Monday', 'Friday', 'Sunday', 'spring', 'autumn'],
    timeFuture: ['tomorrow', 'next week', 'next month', 'next year', 'soon', 'in two days', 'this weekend', 'on Friday'],
    timePast: ['yesterday', 'last week', 'last month', 'last year', 'two days ago', 'just now', 'a moment ago'],
    timeSince: ['since 2020', 'since last year', 'since he arrived', 'since Monday', 'since childhood'],
    // Activities
    activity: ['swimming', 'reading', 'cooking', 'drawing', 'singing', 'dancing', 'writing', 'running', 'painting', 'studying', 'fishing', 'shopping', 'cleaning', 'gardening', 'travelling'],
    activityVerb: ['swim', 'read', 'cook', 'draw', 'sing', 'dance', 'write', 'run', 'paint', 'study', 'fish', 'shop', 'clean', 'garden', 'travel'],
    // Adjectives
    adjective: ['big', 'small', 'tall', 'short', 'old', 'young', 'fast', 'slow', 'hot', 'cold', 'happy', 'sad', 'rich', 'poor', 'clean', 'dirty', 'easy', 'hard', 'cheap', 'expensive'],
    adjComparative: ['bigger', 'smaller', 'taller', 'shorter', 'older', 'younger', 'faster', 'slower', 'hotter', 'colder', 'happier', 'sadder', 'richer', 'poorer', 'cleaner', 'dirtier', 'easier', 'harder', 'cheaper'],
    adjSuperlative: ['the biggest', 'the smallest', 'the tallest', 'the shortest', 'the oldest', 'the youngest', 'the fastest', 'the slowest', 'the hottest', 'the coldest', 'the happiest', 'the saddest', 'the richest', 'the poorest'],
    // Verbs
    verbBase: ['play', 'watch', 'visit', 'finish', 'start', 'build', 'make', 'take', 'give', 'send', 'buy', 'sell', 'teach', 'learn', 'help'],
    verbPast: ['played', 'watched', 'visited', 'finished', 'started', 'built', 'made', 'took', 'gave', 'sent', 'bought', 'sold', 'taught', 'learned', 'helped'],
    verbPP: ['played', 'watched', 'visited', 'finished', 'started', 'built', 'made', 'taken', 'given', 'sent', 'bought', 'sold', 'taught', 'learned', 'helped'],
    // Modal verbs
    modal: ['can', 'must', 'should', 'may', 'might', 'could', 'would', 'need'],
    // Conjunctions
    conjCause: ['because', 'since', 'as', 'for'],
    conjContrast: ['but', 'although', 'though', 'however'],
    conjCondition: ['if', 'unless', 'as long as'],
    // Prepositions
    prepTime: ['at', 'on', 'in', 'by', 'before', 'after', 'during', 'until'],
    prepPlace: ['at', 'on', 'in', 'by', 'near', 'beside', 'under', 'above', 'behind'],
  },

  /** Initialize with templates from data */
  init(templates) {
    this._templates = templates || [];
  },

  generateFromTemplate(templateRef, count = 5, parentQid = '') {
    const template = this._templates.find(t => t.id === templateRef);
    if (!template) return [];
    const questions = [];
    for (let i = 0; i < count; i++) {
      const q = this._instantiateTemplate(template, parentQid);
      if (q) questions.push(q);
    }
    return questions;
  },

  _instantiateTemplate(template, parentQid) {
    try {
      let sentence = template.pattern;
      const filled = {};
      for (const [slotName, slotDef] of Object.entries(template.slots || {})) {
        const values = slotDef.values || [];
        if (values.length === 0) continue;
        const pick = values[Math.floor(Math.random() * values.length)];
        sentence = sentence.replace(`{${slotName}}`, pick);
        filled[slotName] = pick;
      }
      const correctAnswer = template.answer_slot
        ? template.slots[template.answer_slot]?.values?.[0] || ''
        : (Object.values(filled)[0] || '');
      let options = [];
      if (template.distractor_pool) {
        const pool = [...template.distractor_pool];
        this._shuffle(pool);
        options = [correctAnswer, ...pool.slice(0, 3)];
        this._shuffle(options);
      } else {
        options = this._generateDistractors(correctAnswer, template.distractor_category || 'countable');
      }
      const answerIndex = options.indexOf(correctAnswer);
      if (answerIndex < 0) options[0] = correctAnswer;
      let explanation = template.explanation_template || '';
      let commonMistake = template.common_mistake_template || '';
      for (const [k, v] of Object.entries(filled)) {
        explanation = explanation.replace(`{${k}}`, v);
        commonMistake = commonMistake.replace(`{${k}}`, v);
      }
      return {
        id: 'gen-' + this._uuid(), sub_module_id: template.sub_module_id || '',
        tags: template.tags || [], type: 'choice', question: sentence, options,
        answer: options.indexOf(correctAnswer) >= 0 ? options.indexOf(correctAnswer) : 0,
        explanation, common_mistake: commonMistake,
        source: 'generated', template_ref: template.id, parent_qid: parentQid
      };
    } catch (e) {
      console.error('[Generator] Template error:', e);
      return null;
    }
  },

  _generateDistractors(correct, category) {
    const pool = this._vocabBank[category] || this._vocabBank.countable;
    const distractors = pool.filter(w => w !== correct);
    this._shuffle(distractors);
    return [correct, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
  },

  /**
   * Grammar-aware substitution: swap content words while preserving grammar pattern.
   * Returns questions or empty array if no meaningful substitution is possible.
   */
  generateBySubstitution(question, count = 3) {
    if (!question) return [];

    const smId = question.sub_module_id || '';
    const questions = [];

    for (let i = 0; i < count; i++) {
      let qText = question.question;
      let opts = [...question.options];
      let madeChange = false;

      // Strategy per grammar category
      if (smId.startsWith('noun-') || smId === 'article-definite' || smId === 'article-indefinite') {
        madeChange = this._swapNouns(qText, opts, question.answer, smId);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('pronoun-')) {
        madeChange = this._swapPronouns(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('verb-') || smId.startsWith('inf-') || smId.startsWith('gerund-') || smId.startsWith('part-')) {
        madeChange = this._swapVerbContext(qText, opts, question.answer, smId);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('adj-')) {
        madeChange = this._swapAdjectives(qText, opts, question.answer, smId);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('prep-')) {
        madeChange = this._swapPrepositionContext(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('conj-')) {
        madeChange = this._swapConjunctionContext(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('adv-')) {
        madeChange = this._swapAdverbContext(qText, opts, question.answer, smId);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('numeral-') || smId.startsWith('num-')) {
        madeChange = this._swapNumeralContext(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else if (smId.startsWith('comm-')) {
        madeChange = this._swapCommunicationContext(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      } else {
        // Generic: try name/time swap for any question
        madeChange = this._genericSwap(qText, opts, question.answer);
        if (madeChange) {
          qText = madeChange.text;
          opts = madeChange.options;
        }
      }

      const newAnswer = opts.findIndex((o, idx) =>
        (madeChange && madeChange.answerWas === question.options[idx])
      );
      const finalAnswer = newAnswer >= 0 ? newAnswer : question.answer;

      questions.push({
        ...question,
        id: 'gen-' + this._uuid(),
        source: 'generated',
        parent_qid: question.id,
        question: qText,
        options: opts,
        answer: finalAnswer,
        explanation: question.explanation || '',
        common_mistake: question.common_mistake || '',
      });
    }
    return questions;
  },

  // === Grammar-specific swap helpers ===

  _swapNouns(text, options, answerIdx, smId) {
    const isUncountable = smId.includes('uncountable');
    const pool = isUncountable ? this._vocabBank.uncountable : this._vocabBank.countable;
    const answerWord = options[answerIdx] || '';
    const newWord = this._pickOther(pool, answerWord);
    if (!newWord) return null;

    // Replace in text (only standalone occurrences, not within other words)
    const escaped = answerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'gi');
    const newText = text.replace(re, newWord);
    const newOptions = options.map(o => o === answerWord ? newWord : o);
    return { text: newText, options: newOptions, answerWas: answerWord };
  },

  _swapPronouns(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Swap subject pronouns → keep grammar pattern, change referent
    const subjectMap = { 'He': 'She', 'She': 'He', 'he': 'she', 'she': 'he', 'Tom': 'Lucy', 'Lucy': 'Tom', 'Mike': 'Amy', 'Amy': 'Mike' };
    const newWord = subjectMap[answerWord] || this._pickOther([...this._vocabBank.person], answerWord);
    if (!newWord || newWord === answerWord) return null;

    const escaped = answerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'g');
    const newText = text.replace(re, newWord);
    const newOptions = options.map(o => o === answerWord ? newWord : o);
    return { text: newText, options: newOptions, answerWas: answerWord };
  },

  _swapVerbContext(text, options, answerIdx, smId) {
    // Swap time expressions in the question stem while keeping the verb tense answer
    const answerWord = options[answerIdx] || '';

    if (smId.includes('past') || smId.includes('perfect')) {
      const oldTime = this._findInText(text, this._vocabBank.timePast);
      const newTime = this._pickOther(this._vocabBank.timePast, oldTime);
      if (newTime && oldTime) {
        return { text: text.replace(oldTime, newTime), options, answerWas: answerWord };
      }
    }
    if (smId.includes('future') || smId.includes('will')) {
      const oldTime = this._findInText(text, this._vocabBank.timeFuture);
      const newTime = this._pickOther(this._vocabBank.timeFuture, oldTime);
      if (newTime && oldTime) {
        return { text: text.replace(oldTime, newTime), options, answerWas: answerWord };
      }
    }
    if (smId.includes('present-perfect')) {
      const oldTime = this._findInText(text, this._vocabBank.timeSince);
      const newTime = this._pickOther(this._vocabBank.timeSince, oldTime);
      if (newTime && oldTime) {
        return { text: text.replace(oldTime, newTime), options, answerWas: answerWord };
      }
    }

    // Generic: swap a person name in the sentence
    const oldPerson = this._findInText(text, this._vocabBank.person);
    const newPerson = this._pickOther(this._vocabBank.person, oldPerson);
    if (newPerson && oldPerson) {
      return { text: text.replace(oldPerson, newPerson), options, answerWas: answerWord };
    }
    return null;
  },

  _swapAdjectives(text, options, answerIdx, smId) {
    const answerWord = options[answerIdx] || '';
    let pool;
    if (smId.includes('superlative')) {
      pool = this._vocabBank.adjSuperlative;
    } else if (smId.includes('comparative')) {
      pool = this._vocabBank.adjComparative;
    } else {
      pool = this._vocabBank.adjective;
    }
    const newWord = this._pickOther(pool, answerWord);
    if (!newWord) return null;
    const escaped = answerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'g');
    const newText = text.replace(re, newWord);
    const newOptions = options.map(o => o === answerWord ? newWord : o);
    return { text: newText, options: newOptions, answerWas: answerWord };
  },

  _swapPrepositionContext(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Swap the object of the preposition (place/time noun)
    const oldPlace = this._findInText(text, this._vocabBank.place);
    const newPlace = this._pickOther(this._vocabBank.place, oldPlace);
    if (newPlace && oldPlace && oldPlace.length > 2) {
      return { text: text.replace(oldPlace, newPlace), options, answerWas: answerWord };
    }
    const oldTime = this._findInText(text, this._vocabBank.time);
    const newTime = this._pickOther(this._vocabBank.time, oldTime);
    if (newTime && oldTime && oldTime.length > 2) {
      return { text: text.replace(oldTime, newTime), options, answerWas: answerWord };
    }
    return null;
  },

  _swapConjunctionContext(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Swap names in the clauses
    const oldPerson = this._findInText(text, this._vocabBank.person);
    const newPerson = this._pickOther(this._vocabBank.person, oldPerson);
    if (newPerson && oldPerson) {
      return { text: text.replace(oldPerson, newPerson), options, answerWas: answerWord };
    }
    return null;
  },

  _swapAdverbContext(text, options, answerIdx, smId) {
    const answerWord = options[answerIdx] || '';
    // Swap the verb being modified
    if (smId.includes('frequency')) {
      const oldVerb = this._findInText(text, this._vocabBank.verbBase);
      const newVerb = this._pickOther(this._vocabBank.verbBase, oldVerb);
      if (newVerb && oldVerb) {
        return { text: text.replace(oldVerb, newVerb), options, answerWas: answerWord };
      }
    }
    const oldPerson = this._findInText(text, this._vocabBank.person);
    const newPerson = this._pickOther(this._vocabBank.person, oldPerson);
    if (newPerson && oldPerson) {
      return { text: text.replace(oldPerson, newPerson), options, answerWas: answerWord };
    }
    return null;
  },

  _swapNumeralContext(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Swap the object being counted
    const oldNoun = this._findInText(text, this._vocabBank.countable);
    const newNoun = this._pickOther(this._vocabBank.countable, oldNoun);
    if (newNoun && oldNoun && oldNoun.length > 2) {
      return { text: text.replace(oldNoun, newNoun), options, answerWas: answerWord };
    }
    return null;
  },

  _swapCommunicationContext(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Swap names
    const oldPerson = this._findInText(text, this._vocabBank.person);
    const newPerson = this._pickOther(this._vocabBank.person, oldPerson);
    if (newPerson && oldPerson) {
      return { text: text.replace(oldPerson, newPerson), options, answerWas: answerWord };
    }
    return null;
  },

  _genericSwap(text, options, answerIdx) {
    const answerWord = options[answerIdx] || '';
    // Try swapping any recognizable content word
    const allContent = [...this._vocabBank.person, ...this._vocabBank.place, ...this._vocabBank.time];
    const oldWord = this._findInText(text, allContent);
    const newWord = this._pickOther(allContent, oldWord);
    if (newWord && oldWord && oldWord.length > 2) {
      return { text: text.replace(oldWord, newWord), options, answerWas: answerWord };
    }
    return null;
  },

  // === Helpers ===

  _findInText(text, pool) {
    for (const word of pool) {
      if (word.length > 2 && text.toLowerCase().includes(word.toLowerCase())) {
        return word;
      }
    }
    return null;
  },

  _pickOther(pool, exclude) {
    const others = pool.filter(w => w !== exclude);
    if (others.length === 0) return null;
    return others[Math.floor(Math.random() * others.length)];
  },

  // === LLM Generation ===

  async generateWithLLM(question, count = 5, settings = {}) {
    const { api_key, model = 'deepseek-chat' } = settings;
    if (!api_key) {
      throw new Error('请先在设置中配置 DeepSeek API Key（免费获取: https://platform.deepseek.com/api_keys），然后在设置中开启 AI 生成。');
    }

    if (window.location.protocol === 'file:') {
      throw new Error('AI 生成需要 HTTP 服务器。请用 python server.py 启动服务器后访问 http://localhost:8080，不要直接双击 HTML 文件。');
    }

    const prompt = `你是一位英语语法老师。请生成 ${count} 道与下面这道题考察同一语法点的选择题。语法点: ${question.sub_module_id || '通用'}。

原题: "${question.question}"
选项: ${(question.options || []).map((o,i) => String.fromCharCode(65+i) + '. ' + o).join(' | ')}
答案: ${String.fromCharCode(65 + question.answer)}. ${question.options?.[question.answer] || ''}
解析: ${question.explanation || ''}

返回纯JSON数组（不要markdown包裹）:
[{"question":"题目","options":["A","B","C","D"],"answer":0,"explanation":"中文解析","common_mistake":"常见错误提示"}]`;

    // Use local proxy endpoint (server.py proxies to Anthropic)
    const apiUrl = window.location.protocol === 'file:'
      ? null  // unreachable
      : window.location.origin + '/api/generate';

    if (!apiUrl) {
      throw new Error('无法访问 API。请通过 HTTP 服务器访问此页面。');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, api_key, model })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `请求失败 (${response.status})`);
    }

    const text = result.text || '';
    const json = this._extractJSON(text);
    if (!Array.isArray(json)) {
      console.warn('[Generator] Could not parse LLM response:', text.substring(0, 200));
      throw new Error('AI 返回格式异常，请重试');
    }

    return json.map(q => ({
      id: 'gen-' + this._uuid(),
      sub_module_id: question.sub_module_id,
      tags: question.tags || [],
      type: 'choice',
      question: q.question || '',
      options: q.options || [],
      answer: typeof q.answer === 'number' ? q.answer : 0,
      explanation: q.explanation || '',
      common_mistake: q.common_mistake || '',
      source: 'generated',
      template_ref: null,
      parent_qid: question.id
    }));
  },

  _extractJSON(text) {
    try { return JSON.parse(text); } catch {}
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) { try { return JSON.parse(codeMatch[1]); } catch {} }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    return null;
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }).slice(0, 8);
  }
};

export default QuestionGenerator;
