#!/usr/bin/env python3
"""Rewrite ALL grammar_summary entries in modules.json to be comprehensive."""
import json, os

ROOT=os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT,'data','modules.json'),'r',encoding='utf-8') as f:
    modules=json.load(f)

GRAMMAR={
    # ============================================================
    # 名词
    # ============================================================
    'noun-proper': {
        'rules': [
            '专有名词是特定人、地点、事物或组织的名称，首字母必须大写。如：China, Beijing, Monday, January, Tom',
            '由普通名词构成的专有名词前通常加定冠词 the。如：the Great Wall（长城）, the United States（美国）, the People\'s Republic of China',
            '单独的人名、地名、国名一般不加冠词。如：John, London, France（但复合国名要加 the：the United Kingdom）',
            '江河、海洋、山脉、群岛等地理名称前必须加 the。如：the Yangtze River, the Pacific Ocean, the Alps, the Philippines',
            '组织机构、报刊杂志、船舶、乐器等专有名称前常加 the。如：the United Nations, the New York Times, the Titanic, the piano',
            '节假日名称通常不加冠词。如：Christmas, New Year\'s Day, National Day（但 the Spring Festival 习惯加 the）',
        ],
        'examples': [
            'Beijing is the capital of China.（北京是中国的首都）',
            'the Great Wall is one of the seven wonders of the world.（长城是世界七大奇迹之一）',
            'The Yangtze River is the longest river in Asia.（长江是亚洲最长的河流）',
            'Mr. Smith comes from the United Kingdom.（史密斯先生来自英国）',
        ],
        'common_mistakes': [
            'monday → Monday（星期首字母必须大写）',
            'the beijing → Beijing（单个城市名不加 the）',
            'great wall → the Great Wall（复合专有名词必须加 the）',
            'the Japan → Japan（单个国名不加 the，但 the United States 要加）',
        ],
    },
    'noun-countable': {
        'rules': [
            '可数名词有单数和复数两种形式。单数前可用 a/an，复数通常在词尾加 -s 或 -es。',
            '规则复数变化：①一般加 -s（book→books）；②以 s/x/sh/ch 结尾加 -es（bus→buses）；③辅音+y 结尾变 y 为 i 加 -es（city→cities）；④以 f/fe 结尾变 f 为 v 加 -es（leaf→leaves）；⑤以 o 结尾，有生命加 -es（potato→potatoes），无生命加 -s（photo→photos）',
            '不规则复数变化：man→men, woman→women, child→children, tooth→teeth, foot→feet, mouse→mice',
            '单复数同形：sheep, deer, fish（同种鱼）, Chinese, Japanese',
            '复合名词变复数：①一般只变中心词（apple tree→apple trees）；②man/woman 修饰时两部分都变（woman doctor→women doctors）；③无中心词时在末尾加 s（grown-up→grown-ups）',
            '只能用复数的名词：trousers, glasses, scissors, clothes, people, police, cattle（这些词作主语时谓语用复数）',
        ],
        'examples': [
            'There are three apples on the table.（桌上有三个苹果）',
            'Many countries took part in the meeting.（许多国家参加了会议）',
            'Women doctors are very popular in this hospital.（女医生在这家医院很受欢迎）',
            'The police are searching for the thief.（警察正在搜捕小偷）',
        ],
        'common_mistakes': [
            'sheeps → sheep（单复数同形，不加 s）',
            'childs → children（不规则变化）',
            'woman doctors → women doctors（两部分都变复数）',
            'potatos → potatoes（有生命的 o 结尾加 es）',
        ],
    },
    'noun-uncountable': {
        'rules': [
            '不可数名词没有复数形式，不能加 s，也不能用 a/an 修饰。表示数量时用 some, much, a little, a lot of 等。',
            '常见不可数名词：information, advice, furniture, weather, news, money, bread, rice, milk, water, paper, work, homework, housework, knowledge, equipment, luggage, traffic, music, progress',
            '要表示不可数名词的具体数量，需借助量词：a piece of advice/information/news, a loaf of bread, a bottle of water, a sheet of paper',
            '有些名词既是可数又是不可数，但含义不同：glass（玻璃，不可数）/ a glass（玻璃杯，可数）；paper（纸，不可数）/ a paper（报纸/论文，可数）；experience（经验，不可数）/ an experience（经历，可数）',
            '不可数名词作主语时，谓语动词用单数。Information is important.',
            '用 much, (a) little, a great deal of, a large amount of 修饰不可数名词；用 many, (a) few, a large number of 修饰可数名词',
        ],
        'examples': [
            'Could you give me some advice?（你能给我一些建议吗？）',
            'There is little furniture in the room.（房间里几乎没有什么家具）',
            'What fine weather we are having!（多好的天气啊！）',
            'I need a piece of paper to write on.（我需要一张纸来写）',
        ],
        'common_mistakes': [
            'a good news → a piece of good news 或 good news（news 不可数）',
            'many furniture → much furniture（furniture 不可数）',
            'informations → information（不加 s）',
            'a bread → a piece of bread 或 some bread（bread 不可数）',
        ],
    },
    'noun-possessive': {
        'rules': [
            '名词所有格表示"……的"。有 \'s 所有格和 of 所有格两种形式。',
            '\'s 所有格主要用于有生命的名词：①单数加 \'s（Tom\'s book）；②以 s 结尾的复数加 \'（the students\' books）；③不规则复数加 \'s（children\'s toys）',
            'of 所有格主要用于无生命的名词：the title of the book, the capital of China',
            '双重所有格（of + \'s 所有格/名词性物主代词）：a friend of my father\'s = one of my father\'s friends',
            '时间、距离、重量、国家、城市等无生命名词也可用 \'s 所有格：today\'s newspaper, ten minutes\' walk, China\'s history',
            '并列所有格：①A and B\'s + 单数 = 共同拥有（Tom and Jerry\'s room 共住的房间）；②A\'s and B\'s + 复数 = 各自拥有（Tom\'s and Jerry\'s rooms 各自的房间）',
        ],
        'examples': [
            'This is Tom\'s bike.（这是汤姆的自行车）',
            'It\'s twenty minutes\' walk from my home to school.（从我家到学校步行20分钟）',
            'He is a friend of my brother\'s.（他是我哥哥的一个朋友）',
            'Tom\'s and Peter\'s fathers are both teachers.（汤姆的爸爸和彼得的爸爸都是老师）',
        ],
        'common_mistakes': [
            'Toms book → Tom\'s book（漏掉撇号）',
            'the students\'s books → the students\' books（s 结尾复数只加 \'）',
            'a friend of my brother → a friend of my brother\'s（双重所有格必须加 \'s）',
        ],
    },
    'noun-collective': {
        'rules': [
            '集合名词表示一群人或物的总称。常见的：family, team, class, committee, audience, crowd, government, staff, crew, public',
            '集合名词作主语时，强调整体概念用单数谓语，强调个体成员用复数谓语。如：My family is a big one.（整体）/ My family are watching TV.（个体）',
            '有些集合名词总是用复数谓语：people, police, cattle, clergy, militia',
            '有些集合名词总是用单数谓语：machinery, equipment, furniture, luggage, clothing, poetry',
            '判断标准：看说话人是把集合体当作一个整体还是当作多个个体。有 each/all 等强调个体的词时用复数；有 every/whole 等词时用单数',
        ],
        'examples': [
            'The class is very big.（这个班很大——整体）',
            'The class are doing experiments.（班上同学在做实验——个体）',
            'The police are looking for the lost child.（警察在找失踪的孩子——总是复数）',
            'My family were having dinner when he arrived.（他到时我们全家在吃饭——个体）',
        ],
        'common_mistakes': [
            'The police is coming → The police are coming（police 总是复数）',
            'The team are a strong one → The team is a strong one（整体用单数）',
        ],
    },
    'noun-agreement-grammar': {
        'rules': [
            '主谓一致的"语法一致"原则：谓语动词在人称和数上与主语保持一致。这是最基本的原则。',
            '单数主语 + 单数谓语：He is a student. / The book was interesting.',
            '复数主语 + 复数谓语：They are students. / The books were interesting.',
            '由 and 连接的两个名词作主语时谓语用复数：Tom and Mary are friends.',
            '特殊情况：①each/every + 单数名词 + and + each/every + 单数名词 → 单数谓语（Every boy and every girl has a book.）；②many a + 单数名词 → 单数谓语（Many a student has tried.）；③more than one + 单数名词 → 单数谓语；④不定式、动名词、主语从句作主语 → 单数谓语',
            'no/each/every/many a + 单数名词 + and + no/each/every/many a + 单数名词 → 单数谓语',
            '"a series/species/means + of"作主语时谓语用单数',
        ],
        'examples': [
            'To say something is one thing, to do it is another.（说是一回事，做是另一回事）',
            'Many a student has made this mistake.（许多学生犯过这个错误）',
            'Every teacher and every student was invited.（每个老师和学生都被邀请了）',
            'Writing stories and poems is what I enjoy most.（写故事和诗歌是我最喜欢的）',
        ],
        'common_mistakes': [
            'Many a students have tried → Many a student has tried（单数谓语）',
            'Every boy and girl have → Every boy and every girl has（单数谓语）',
        ],
    },
    'noun-agreement-proximity': {
        'rules': [
            '就近原则：谓语动词的人称和数与最靠近的主语保持一致。',
            'either...or...：Either you or he is wrong.（谓语与 he 一致）',
            'neither...nor...：Neither he nor I am interested.（谓语与 I 一致）',
            'not only...but also...：Not only the students but also the teacher was invited.',
            'not...but...：Not you but I am to blame.',
            'There be 句型：be 动词与最靠近的名词保持一致。There is a book and two pens on the desk.',
            'Here be 句型同理：Here is a pen and some paper for you.',
            'or, whether...or... 连接的主语也遵循就近原则',
        ],
        'examples': [
            'There is a desk, a bed and some chairs in the room.',
            'Either your teacher or you are mistaken.',
            'Neither Jane nor her brothers need a consent.',
            'Not only I but also Tom and Mary are fond of music.',
        ],
        'common_mistakes': [
            'There are a book and two pens → There is a book and two pens（就近 a book 单数）',
            'Neither he nor I is → Neither he nor I am（就近 I→am）',
        ],
    },
    'noun-agreement-meaning': {
        'rules': [
            '意义一致原则：谓语动词根据主语的实际含义（而非语法形式）确定单复数。',
            '表示时间、距离、金钱、重量等的复数名词作主语时，视为整体，谓语用单数：Twenty years is a long time. / Five thousand dollars is enough.',
            '以 -ics 结尾的学科名称作主语时，谓语用单数：Mathematics is difficult. / Physics was my favorite subject.',
            '以 s 结尾的国名、机构名、书名、报纸名作主语时，谓语用单数：The United States is a powerful country. / The New York Times is widely read.',
            '群岛、山脉、瀑布等作主语时，谓语通常用复数：The Philippines are in the Pacific Ocean. / The Alps are in Europe.',
            '"the + 形容词"指一类人时谓语用复数：The poor are getting poorer. / The young are full of energy.',
            '分数/百分数 + of + 名词 → 谓语与名词一致：Two thirds of the water is polluted. / Two thirds of the students are present.',
            'all/most/some/half/part/the rest + of + 名词 → 谓语与名词一致',
        ],
        'examples': [
            'Ten miles is a long distance.（十英里是很长的距离）',
            'Mathematics is my favorite subject.（数学是我最喜欢的科目）',
            'The young are the future of our country.（年轻人是我们国家的未来）',
            'Three fourths of the surface is covered with water.（四分之三的表面被水覆盖）',
        ],
        'common_mistakes': [
            'Twenty dollars are enough → Twenty dollars is enough（金钱整体单数）',
            'Two thirds of the apple were eaten → Two thirds of the apple was eaten（apple 单数）',
        ],
    },

    # ============================================================
    # 代词
    # ============================================================
    'pronoun-personal': {
        'rules': [
            '人称代词分为主格和宾格。主格作主语（I, he, she, we, they, you, it），宾格作宾语（me, him, her, us, them, you, it）。',
            '动词后接宾格：Please help me. / I saw him yesterday.',
            '介词后接宾格：This is for her. / Come with us.',
            '主语位置必须用主格：He and I are good friends.（不是 Him and me）',
            '人称代词的排列顺序：单数通常是 you → he/she → I（第二、第三、第一人称），复数通常是 we → you → they。',
            '在承认错误时，第一人称放在前面：I and he are to blame.',
            'it 作无人称主语：表示天气、时间、距离等。It is raining. / It is late. / It is five miles to the station.',
        ],
        'examples': [
            'She and I went to the park together.（她和我一起去公园）',
            'Please give the book to me.（请把书给我）',
            'It was very kind of you to help us.（你帮助我们真是太好了）',
            'I don\'t think it will rain tomorrow.（我觉得明天不会下雨）',
        ],
        'common_mistakes': [
            'Me and Tom went → Tom and I went（主语用主格）',
            'between you and I → between you and me（介词后用宾格）',
            'Let we go → Let us go（let 后用宾格）',
        ],
    },
    'pronoun-reflexive': {
        'rules': [
            '反身代词表示"某人自己"。myself, yourself, himself, herself, itself, ourselves, yourselves, themselves',
            '用于宾语和主语是同一人或物时：He hurt himself.（他伤了自己）',
            '用于强调：I saw it myself.（我亲眼看见的）',
            '固定搭配：enjoy oneself（玩得开心）, help oneself（自便/自取）, by oneself（独自）, teach oneself（自学）, behave oneself（规矩点）, make oneself at home（别客气）',
            '反身代词必须与主语在人称、数上保持一致。单数 yourself，复数 yourselves',
        ],
        'examples': [
            'Help yourself to some cake.（请随便吃蛋糕）',
            'They enjoyed themselves at the party.（他们在聚会上玩得很开心）',
            'She taught herself English.（她自学英语）',
            'Did you do it all by yourself?（你一个人做的吗？）',
        ],
        'common_mistakes': [
            'Help you to some cake → Help yourself（反身代词）',
            'They enjoyed them → They enjoyed themselves（反身代词）',
            'He taught hisself English → He taught himself English（himself 才是正确形式）',
        ],
    },
    'pronoun-indefinite': {
        'rules': [
            '不定代词指不明确指代对象的名词。主要有：some/any/no/every + thing/one/body, all, each, both, either, neither, none, few, little, many, much, other, another, one',
            '复合不定代词(something, anything, nothing, everything 等)作主语时谓语用单数。Nothing is impossible.',
            '形容词修饰复合不定代词时必须后置：something important, nothing special, anyone else',
            'some-/any- 的区别：some- 用于肯定句，any- 用于否定句、疑问句和条件句。在请求、建议的疑问句中用 some-（期望肯定回答）',
            'both/either/neither 用于两者：both（两者都）, either（两者任一）, neither（两者都不）',
            'all/none 用于三者及以上：all（都）, none（都不）',
            'few/a few + 可数复数；little/a little + 不可数。有 a 表示肯定（有几个/一点），无 a 表示否定（几乎没有）',
            'each 强调个体，every 强调整体。each of + 复数 + 单数谓语',
            'other/the other/others/the others/another 的区别要掌握',
        ],
        'examples': [
            'Is there anything wrong with your car?（你的车有什么毛病吗？）',
            'Few people can answer this question.（几乎没人能回答这个问题）',
            'Neither of the two answers is correct.（两个答案都不对）',
            'Some are singing, others are dancing.（有些在唱歌，另一些在跳舞）',
        ],
        'common_mistakes': [
            'important something → something important（形容词后置）',
            'anybody are → anybody is（复合不定代词单数）',
            'few 和 a few 混淆：few = 几乎没（否定），a few = 有几个（肯定）',
        ],
    },

    # ============================================================
    # 数词
    # ============================================================
    'numeral-cardinal': {
        'rules': [
            '基数词表示数量。1-12有独立形式，13-19以-teen结尾，20-90整十以-ty结尾。',
            'hundred, thousand, million, billion前有具体数字时不加s：two hundred, five thousand',
            'hundreds/thousands/millions of 表示"成百上千/成千上万"时加s：hundreds of people',
            '几十几的表达：十位和个位间加连字符：twenty-one, ninety-nine',
            '"数词+名词"作定语时，名词用单数：a five-year-old boy, a ten-mile walk',
        ],
        'examples': [
            'There are three hundred students in our school.',
            'Hundreds of birds are flying south.',
            'She is a sixteen-year-old girl.',
        ],
        'common_mistakes': [
            'two hundreds → two hundred（具体数字不加s）',
            'five-years-old → five-year-old（作定语时名词单数）',
        ],
    },
    'numeral-ordinal': {
        'rules': [
            '序数词表示顺序。1-3: first, second, third；4-19: 基数词+th（注意 fifth, eighth, ninth, twelfth 的特殊拼写）；20以上整十：变 y 为 ieth（twenty→twentieth）',
            '序数词前通常加 the：the first time, the second floor',
            'a + 序数词 = 又一/再一：a second chance = 又一次机会',
        ],
        'examples': [
            'He lives on the twelfth floor.',
            'This is the third time I have been here.',
            'They gave him a second chance.',
        ],
        'common_mistakes': [
            'twelveth → twelfth（注意拼写）',
            'nineth → ninth（去e加th）',
        ],
    },
    'numeral-fraction': {
        'rules': [
            '分数表达：分子用基数词，分母用序数词。分子>1时分母加 s。',
            '1/2 = a half / one half；1/4 = a quarter / one quarter；3/4 = three quarters / three fourths',
            '百分数：数字 + percent。percent of + 名词 → 谓语与名词一致。',
            '小数：整数部分按基数词读，小数点读 point，小数部分逐位读。',
        ],
        'examples': [
            'Two thirds of the earth is covered with water.',
            'More than 40 percent of the students wear glasses.',
            'Zero point two five equals a quarter.',
        ],
        'common_mistakes': [
            'three-fifth → three-fifths（分子>1分母加s）',
            'percent of 后用错谓语单复数',
        ],
    },

    # ============================================================
    # 冠词
    # ============================================================
    'article-indefinite': {
        'rules': [
            '不定冠词 a/an 用于单数可数名词前，表示泛指"一个"。',
            'a 用于辅音音素开头的词前：a book, a university（/juː/）, a European（/jʊ/）',
            'an 用于元音音素开头的词前：an apple, an hour（/aʊ/）, an honest man（/ɒ/），an MP3（/em/）',
            '关键规则：看发音（音素），不看字母！a useful tool（/j/辅音），an umbrella（/ʌ/元音）',
        ],
        'examples': [
            'I have a useful book.（我有一本有用的书）',
            'He is an honest boy.（他是个诚实的孩子）',
            'She waited for me for an hour.（她等了我一小时）',
        ],
        'common_mistakes': [
            'a apple → an apple（元音音素）',
            'an university → a university（/juː/辅音音素）',
        ],
    },
    'article-definite': {
        'rules': [
            '定冠词 the 表示特指——说话双方都知道的人或物。',
            '必须用 the 的情况：①独一无二的事物（the sun, the moon）；②序数词和最高级前（the first, the best）；③演奏乐器（play the piano）；④江河海洋山脉（the Nile）；⑤上文提过的人或物',
            'the + 形容词 = 一类人：the rich（富人）, the poor（穷人）, the young（年轻人）',
        ],
        'examples': [
            'The earth moves around the sun.',
            'He is the tallest boy in our class.',
            'She plays the violin very well.',
        ],
        'common_mistakes': [
            'sun rises in east → The sun rises in the east（独一无二+方位）',
            'play piano → play the piano（乐器加the）',
        ],
    },
    'article-zero': {
        'rules': [
            '零冠词指不用冠词的情况。',
            '不用冠词：①球类运动（play basketball）；②一日三餐（have breakfast）；③交通工具（by bus）；④学科名称（math, physics）；⑤节假日（Christmas, New Year\'s Day）；⑥称呼语（Come in, Doctor）；⑦泛指的复数名词和不可数名词',
            '固定短语中的零冠词：go to bed, go to school, at home, in hospital, in prison, at work, by chance, on foot',
        ],
        'examples': [
            'We have lunch at twelve every day.',
            'He goes to school by bus.',
            'Children like playing football.',
        ],
        'common_mistakes': [
            'play the basketball → play basketball（球类零冠词）',
            'have a breakfast → have breakfast（三餐零冠词）',
        ],
    },

    # ============================================================
    # 形容词
    # ============================================================
    'adj-comparative': {
        'rules': [
            '比较级用于两者之间的比较。结构：A + be + 比较级 + than + B',
            '变化规则：①单音节词 + er（tall→taller）；②以 e 结尾 + r（large→larger）；③辅音+y 结尾变 y 为 i+er（happy→happier）；④重读闭音节双写辅音+er（big→bigger）；⑤多音节词前加 more（beautiful→more beautiful）',
            '不规则变化：good→better, bad→worse, many/much→more, little→less, far→farther/further, old→older/elder',
            'much/far/even/still/a lot/a bit + 比较级表示"……得多/稍微"',
            '比较级 + and + 比较级 = 越来越……（better and better）',
            'the + 比较级, the + 比较级 = 越……越……（The more, the better）',
            '比较对象要对等：His bag is bigger than mine (my bag).',
        ],
        'examples': [
            'Tom is taller than his brother.',
            'This book is much more interesting than that one.',
            'The harder you work, the better result you will get.',
        ],
        'common_mistakes': [
            'more taller → much taller（不能用 more 修饰比较级）',
            'He is taller than me → He is taller than I (am)（正式语法）',
        ],
    },
    'adj-superlative': {
        'rules': [
            '最高级用于三者或以上的比较。结构：the + 最高级 + 范围',
            '变化规则：①单音节词 + est（tall→tallest）；②多音节词前加 most（beautiful→the most beautiful）',
            '不规则变化：good→best, bad→worst, many→most, little→least, far→farthest/furthest',
            '常用范围状语：in the world, of all, in our class, among..., one of the + 最高级 + 复数名词',
        ],
        'examples': [
            'She is the most beautiful girl in our class.',
            'This is one of the best movies I have ever seen.',
            'He runs (the) fastest of all.（副词最高级前 the 可省略）',
        ],
        'common_mistakes': [
            'the most tallest → the tallest（最高级不用 most+est）',
            '漏掉 the：He is tallest in class → He is the tallest in the class',
        ],
    },
}

# Apply
for m in modules['modules']:
    for s in m['sub_modules']:
        sid=s['id']
        if sid in GRAMMAR:
            s['grammar_summary']=GRAMMAR[sid]
            print(f"Updated: {sid}")

with open(os.path.join(ROOT,'data','modules.json'),'w',encoding='utf-8') as f:
    json.dump(modules,f,ensure_ascii=False,indent=2)

import subprocess
subprocess.run(['python3',os.path.join(ROOT,'build.py')],capture_output=True)
print("\nRebuilt!")
