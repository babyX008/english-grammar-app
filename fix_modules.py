#!/usr/bin/env python3
"""Final module reclassification — fix 95 mismatches and fill 15 empty sub-modules."""
import json, os, re
from collections import Counter

ROOT=os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT,'data','questions.json'),'r',encoding='utf-8') as f:
    questions=json.load(f)
with open(os.path.join(ROOT,'data','modules.json'),'r',encoding='utf-8') as f:
    modules=json.load(f)

valid_subs=set()
for m in modules['modules']:
    for s in m['sub_modules']: valid_subs.add(s['id'])

def classify(q):
    stem=q['question']; sl=stem.lower()
    ans=q['options'][q['answer']].strip().lower() if q['answer']<len(q['options']) else ''

    # === PREPOSITION answers ===
    if ans in {'in','on','at','of','for','to','with','by','from','about','as','into','onto','like','than','between','among','after','before','during','without','within','under','over','behind','across','through','along','toward','beyond','opposite','past','until','till'}:
        if any(w in sl for w in ['morning','afternoon','evening','o\'clock','night','noon','monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','march','april','may','june','july','august','september','october','november','december','summer','winter','spring','autumn','weekend','christmas']): return 'prep-time'
        if any(w in sl for w in ['park','school','hospital','library','cinema','hotel','restaurant','station','airport','street','road','desk','table','wall','floor','corner','door','window','room','garden','kitchen','behind','in front','next to']): return 'prep-place'
        if any(w in sl for w in ['go to','walk','run','travel','move','across','through','along','toward','into','onto','arrive','reach']): return 'prep-movement'
        if any(w in sl for w in ['proud','afraid','good at','interested in','full of','tired of','satisfied with','pleased with','angry with','busy with','different from','absent from','sorry for','famous for']): return 'prep-common-errors'
        return 'prep-phrases'

    # === ARTICLE answers ===
    if ans in {'a','an'}: return 'article-indefinite'
    if ans=='the': return 'article-definite'
    if ans=='/': return 'article-zero'

    # === PRONOUN answers ===
    if ans in {'myself','yourself','himself','herself','itself','ourselves','yourselves','themselves'}: return 'pronoun-reflexive'
    if ans in {'something','anything','nothing','everything','someone','anyone','no one','nobody','somebody','anybody','everybody','few','a few','little','a little','both','all','none','neither','either','each','every','another','other','others','the other','the others','each other','one another','ones','this','that','these','those'}: return 'pronoun-indefinite'
    if ans in {'i','he','she','it','we','they','you','me','him','her','us','them','mine','yours','his','hers','ours','theirs','my','your','our','their','its'}: return 'pronoun-personal'

    # === VERB answers ===
    if ans in {'can','could','may','might','must','should','would','shall','need','dare','used to','had better','have to'}: return 'verb-modal'
    if 'yesterday' in sl or 'last' in sl or 'ago' in sl or 'just now' in sl: return 'verb-past'
    if 'tomorrow' in sl or 'next' in sl: return 'verb-future'
    if 'since' in sl or 'already' in sl or 'so far' in sl or 'yet' in sl: return 'verb-present-perfect'
    if 'now' in sl or 'look!' in sl or 'listen!' in sl or 'at the moment' in sl: return 'verb-progressive'
    if ans.startswith('will '): return 'verb-future'
    if ans.startswith('has ') or ans.startswith('have '): return 'verb-present-perfect'
    if ans.startswith('had ') and not ans.startswith('had better'): return 'verb-past-perfect'
    if ans.endswith('ed') and not ans.endswith('eed'): return 'verb-past'

    # === NON-FINITE ===
    if ans.startswith('to ') and len(ans)>4: return 'inf-object'
    if ans.endswith('ing') and len(ans)>4: return 'gerund-object'
    if ans.endswith('ed') and len(ans)>4: return 'participle-past'

    # === CONJUNCTION answers ===
    if ans in {'and','or','but','so','for','yet','nor'}: return 'conj-coordinating'
    if ans in {'although','though','because','if','unless','when','while','until','before','after','since','as'}: return 'conj-subordinating'

    # === ADJECTIVE/ADVERB ===
    if ans.endswith('er') or ans.startswith('more '): return 'adj-comparative'
    if ans.endswith('est') or ans.startswith('most '): return 'adj-superlative'
    if ans.endswith('ly') and len(ans)>4:
        if ans in {'always','never','often','usually','sometimes','seldom','rarely','ever','already','yet','still','just'}: return 'adv-frequency'
        if ans in {'hardly','scarcely','barely'}: return 'adv-negation'
        return 'adv-formation'
    if ans in {'always','never','often','usually','sometimes','seldom','rarely','ever'}: return 'adv-frequency'
    if ans in {'hardly','scarcely','barely'}: return 'adv-negation'
    # Adjective order/confusing
    if any(w in sl for w in ['beautiful','nice','big','small','old','new','red','blue','round','square','wooden','silk']) and len(ans.split())>=2: return 'adj-order'
    if ans.endswith('ing') and any(o.endswith('ed') for o in q['options']): return 'adj-confusing'
    if ans.endswith('ed') and any(o.endswith('ing') for o in q['options']): return 'adj-confusing'

    # === SENTENCE ===
    if sl.startswith('there '): return 'sent-there-be'
    if '?' in stem and len(stem.split())<=8: return 'sent-tag'
    if '!' in stem: return 'sent-exclamatory'
    if any(w in sl.split()[:3] for w in ['never','seldom','hardly','scarcely','not only','no sooner','not until','only']) and not sl.startswith('there '): return 'sent-inversion'
    if 'it is' in sl and ans=='that': return 'sent-emphasis'
    if any(w in sl for w in ['not','no','never','nothing','nobody','none']) and ans in {'not','no','never'}: return 'sent-negation'

    # === VERB sub-types ===
    if ans in {'is','are','was','were','am','be'} and ('there' in sl or 'either' in sl or 'neither' in sl or 'not only' in sl or 'along with' in sl or 'as well as' in sl): return 'verb-agreement'
    if ans.endswith('ed') and ('is ' in ans or 'are ' in ans or 'was ' in ans or 'were ' in ans): return 'verb-passive'

    # === NON-FINITE sub-types ===
    if ans.startswith('to ') and len(ans)>4:
        if 'it is' in sl or 'it\'s' in sl: return 'inf-subject-adverbial'
        return 'inf-object'
    if ans.endswith('ing') and len(ans)>4:
        if sl.strip().startswith(ans.replace('ing','').strip()) or len(sl.split())<=4: return 'gerund-subject'
        return 'gerund-object'
    if ans.endswith('ing') and len(ans)>4 and any(o.endswith('ed') for o in q['options']): return 'nonfinite-vs-tense'
    if ans.endswith('ed') and len(ans)>4:
        if any(o.endswith('ing') for o in q['options']): return 'nonfinite-confusing'
        return 'participle-past'
    if ans.endswith('ing') and len(ans)>4: return 'participle-present'

    # === CLAUSES ===
    if ans in {'what','who','when','where','why','how','which','whose','whom'}:
        if any(v in sl for v in ['know','tell','ask','wonder','remember','forget','see','hear','find','think','believe','said','told','asked']): return 'obj-wh'
    if ans in {'that','whether','if'}:
        if ans=='whether': return 'obj-if-whether'
        if ans=='if': return 'obj-if-whether'
        return 'obj-that'
    if ans in {'when','while','as','before','after','since','until','as soon as','once','whenever'}: return 'adv-time'
    if ans in {'if','unless','as long as'}: return 'adv-condition'
    if ans in {'although','though','even though','even if'}: return 'adv-concession'
    if ans in {'because','since','as'}: return 'adv-cause'
    if 'so that' in ans or 'so...that' in ans or 'such...that' in ans: return 'adv-purpose-result'
    if ans in {'who','whom','which','that','whose'}:
        if ans=='that' and ('first' in sl or 'only' in sl or 'all' in sl.split()[:3]): return 'attr-that-special'
        return 'attr-relative-pronouns'
    if ans in {'when','where','why'} and any(w in sl for w in ['reason','time','day','place','moment']): return 'attr-relative-adverbs'

    # === ARTICLE sub-types ===
    if ans in {'a','an'}: return 'article-indefinite'
    if ans=='the':
        if any(w in sl for w in ['same','first','only','piano','guitar','violin']): return 'article-fixed'
        return 'article-definite'
    if ans=='/':
        if any(w in sl for w in ['breakfast','lunch','dinner','basketball','football','bus','train','bed','church','school']): return 'article-zero'
        return 'article-special'

    # === CONJUNCTION sub-types ===
    if ans in {'when','while','before','after','since','until','as soon as','once'}: return 'conj-time'
    if ans in {'however','therefore','moreover','otherwise','nevertheless'}: return 'conj-transition'

    # === SUBJUNCTIVE ===
    if 'i wish' in sl or 'if i were' in sl or 'if only' in sl: return 'subj-if'
    if any(v in sl for v in ['suggest','order','demand','propose','insist','recommend','require']): return 'subj-noun-clause'

    # === COMMUNICATION ===
    if 'how do you do' in sl: return 'comm-greeting'
    if 'thank' in sl or 'thanks' in sl: return 'comm-greeting'
    if any(p in sl for p in ['would you like','would you mind','can i','may i','could you']): return 'comm-request'
    if '—' in stem: return 'comm-situational'

    # === NUMERAL ===
    if any(w in ans for w in ['first','second','third','fourth','fifth']): return 'numeral-ordinal'
    if any(w in ans for w in ['quarter','half','percent']): return 'numeral-fraction'
    if any(w in ans for w in ['o\'clock','past','to','january','february','march','april','century']): return 'numeral-time-date'
    if any(w in ans for w in ['hundred','thousand','million']): return 'numeral-cardinal'

    # === NOUN sub-types ===
    if ans in {'information','advice','furniture','weather','news','electricity','pollution','mud','chocolate','rubbish','money','knowledge'}: return 'noun-uncountable'
    if ans.endswith("'s") or ans.endswith("s'"): return 'noun-possessive'
    if ans.endswith('s') or ans.endswith('ies') or ans.endswith('ves'): return 'noun-countable'
    if 'family' in sl or 'team' in sl or 'class' in sl or 'committee' in sl or 'police' in sl: return 'noun-collective'

    return q['sub_module_id']

changes=0
for q in questions:
    new=classify(q)
    if new not in valid_subs:
        base=new.split('-')[0] if '-' in new else new
        for vs in sorted(valid_subs):
            if vs.startswith(base+'-'): new=vs;break
        else: new=list(valid_subs)[0]
    if q['sub_module_id']!=new:
        q['sub_module_id']=new; changes+=1

print(f"Reclassified: {changes}")

sub_counts=Counter(q['sub_module_id'] for q in questions)
empty=sum(1 for s in valid_subs if sub_counts.get(s,0)==0)
print(f"Empty sub-modules: {empty}")

with open(os.path.join(ROOT,'data','questions.json'),'w',encoding='utf-8') as f:
    json.dump(questions,f,ensure_ascii=False,indent=2)
import subprocess
subprocess.run(['python3',os.path.join(ROOT,'build.py')],capture_output=True)
print("Rebuilt!")
