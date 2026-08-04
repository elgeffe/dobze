#!/usr/bin/env python3
"""Build the offline 1,000-word corpora from FrequencyWords/OpenSubtitles."""
import json, re, time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{lang}/{lang}_50k.txt'
LANGS = ('pl', 'en', 'nl', 'fr', 'de', 'es', 'it', 'sv')

TOKEN_RE = re.compile(r"[\wÀ-žąćęłńóśźżĄĆĘŁŃÓŚŹŻ'’-]+", re.UNICODE)

# OpenSubtitles is tokenised, not lemmatised, so the raw lists are full of
# pieces that are not words: French and Italian elisions split off their host
# ("c'", "l'", "dell'"), English contraction tails ("'s", "'ll") and the stems
# left behind ("didn", "isn"), and inverted question forms that are two words
# with a hyphen between them ("avez-vous"). They rank high precisely because
# they are fragments of very common words, so they crowd out real vocabulary
# and, being untranslatable alone, produce the worst glosses in the corpus.

# Single letters that really are words. Rejecting all of them would lose the
# Polish prepositions in the top twenty; keeping all of them admits the debris
# of every elision the tokeniser split.
SINGLE_LETTER_WORDS = {
    'pl': {'w', 'i', 'z', 'o', 'a', 'u'},   # in, and, with, about, and/but, at
    'en': {'a', 'i'},
    'nl': {'u'},                            # formal "you"
    'fr': {'à', 'a', 'y'},                  # to, has, there
    'de': set(),
    'es': {'a', 'y', 'o', 'e'},             # to, and, or, and (before i-)
    'it': {'e', 'è', 'a', 'o', 'i'},        # and, is, to, or, the (m. pl.)
    'sv': {'i'},                            # in
}

# Hyphenated forms that are single lexical units. Everything else with a hyphen
# in these corpora is a verb with an enclitic pronoun — "avez-vous", "dis-moi"
# — which is a phrase, not an entry. A pattern cannot separate the two, because
# "rendez-vous" and "moi-même" contain the very pronouns that mark the phrases.
HYPHENATED_WORDS = {
    'fr': {
        'peut-être', 'là-bas', 'là-dedans', 'rendez-vous', 'moi-même',
        'lui-même', 'celui-là', 'grand-mère', 'grand-père', 'après-midi',
        'week-end',
    },
}

# Stems left behind when the tokeniser split an English contraction. These pass
# every shape test — they are ordinary letters — so they have to be named.
# "won" and "haven" are real words too, but at ranks 163 and 304 their counts
# come from "won't" and "haven't", so the frequency would be a fiction either
# way.
CONTRACTION_STEMS = {
    'en': {
        'don', 'didn', 'doesn', 'isn', 'wasn', 'weren', 'aren', 'ain',
        'hasn', 'haven', 'hadn', 'wouldn', 'couldn', 'shouldn', 'won', 'em',
    },
}

# Genuine words that end in an apostrophe, which the elision rule would
# otherwise reject. Italian "po'" is the apocope of "poco", written this way.
APOSTROPHE_WORDS = {'it': {"po'"}}

# Italian subtitles write a final stressed vowel as vowel + apostrophe when the
# encoding cannot carry the accent: "perche'" for "perché", "piu'" for "più".
# These are not elisions but the same word spelled twice, and the corpus counts
# them separately, so both spellings compete for a place in the thousand.
FINAL_VOWEL_ACCENTS = {'a': 'àá', 'e': 'èé', 'i': 'ìí', 'o': 'òó', 'u': 'ùú'}

def resolve_ascii_accent(token, counts):
    """The accented spelling of an apostrophe-for-accent token, if that is what
    it is. Elisions drop a vowel and so leave a consonant before the
    apostrophe, which is what separates "piu'" from "dell'". The accented form
    also has to be the commoner spelling: that is what tells "e'" -> "è" apart
    from "o'", where the corpus has a stray "ò" that means nothing."""
    stem = token[:-1]
    if not stem or stem[-1].lower() not in FINAL_VOWEL_ACCENTS:
        return None
    own = counts.get(token, 0)
    variants = [
        (counts[stem[:-1] + accent], stem[:-1] + accent)
        for accent in FINAL_VOWEL_ACCENTS[stem[-1].lower()]
        if stem[:-1] + accent in counts
    ]
    best = max(variants, default=None)
    return best[1] if best and best[0] > own else None

def is_word(lang, token):
    if not TOKEN_RE.fullmatch(token):
        return False
    if any(ch.isdigit() for ch in token):
        return False
    if token in APOSTROPHE_WORDS.get(lang, ()):
        return True
    # An apostrophe at either end means the token was cut from its host.
    if token[0] in "'’" or token[-1] in "'’":
        return False
    if token in CONTRACTION_STEMS.get(lang, ()):
        return False
    if '-' in token:
        return token in HYPHENATED_WORDS.get(lang, ())
    if len(token) == 1:
        return token in SINGLE_LETTER_WORDS.get(lang, ())
    return True

def fetch(lang):
    with urlopen(URL.format(lang=lang)) as r:
        lines = r.read().decode('utf-8').splitlines()
    rows = [line.rsplit(' ', 1) for line in lines if ' ' in line]
    counts = {word: int(count) for word, count in rows}

    # Fold each apostrophe-for-accent spelling into the accented word before
    # ranking, so the pair is counted once, as one word.
    folded = {}
    for word in counts:
        if word.endswith("'") and word not in APOSTROPHE_WORDS.get(lang, ()):
            accented = resolve_ascii_accent(word, counts)
            if accented:
                folded[accented] = folded.get(accented, 0) + counts[word]

    words = [
        (word, counts[word] + folded.get(word, 0))
        for word in counts
        if is_word(lang, word)
    ]
    # Read as deep into the 50k list as it takes: rejecting fragments has to
    # pull real words up into the thousand, not leave the list short.
    words.sort(key=lambda pair: -pair[1])
    if len(words) < 1000:
        raise RuntimeError(f'{lang}: only {len(words)} usable words in the source list')
    return words[:1000]

# Hand-written glosses, as (gloss, part of speech), for words no dictionary
# lookup gets right on its own. These are almost all function words: they are
# the most frequent entries in every corpus, so a learner meets them first and
# often, and they are exactly the words whose meaning lives in the grammar
# rather than in a translation. Anything not listed here is taken from the
# dictionary entries, which handle ordinary vocabulary well.
#
# Most of these correct a homograph: asked in isolation, the service answers
# for the commoner dictionary headword rather than the grammatical word that
# earned the frequency rank — Dutch "ben" is "am", not "basket"; Italian "sei"
# is "you are", not "six"; Swedish "ska" is "shall", not "school". A slash
# means the form genuinely carries both senses in the corpus.
GLOSS_OVERRIDES = {
    'pl': {
        'jest': ('is', 'verb'),
        'są': ('are', 'verb'),
        'do': ('to', 'preposition'),
        'czy': ('whether', 'particle'),
        'się': ('-self (reflexive)', 'pronoun'),
        'tego': ('of this', 'pronoun'),
        'nic': ('nothing', 'pronoun'),
        'proszę': ('please', 'interjection'),
        'pan': ('sir / you (formal)', 'noun'),
    },
    'nl': {
        'is': ('is', 'verb'),
        'was': ('was', 'verb'),
        'ben': ('am', 'verb'),
        'bent': ('you are', 'verb'),
        'kan': ('can', 'verb'),
        'moet': ('must', 'verb'),
        'wil': ('want', 'verb'),
        'zou': ('would', 'verb'),
        'heeft': ('has', 'verb'),
        'had': ('had', 'verb'),
        'zijn': ('to be / his', 'verb'),
        'haar': ('her', 'pronoun'),
        'wel': ('indeed', 'adverb'),
        'als': ('if / as', 'conjunction'),
        'wat': ('what', 'pronoun'),
        'op': ('on', 'preposition'),
        'uit': ('out of', 'preposition'),
    },
    'fr': {
        'a': ('has', 'verb'),
        'as': ('have', 'verb'),
        'ai': ('I have', 'verb'),
        'était': ('was', 'verb'),
        'du': ('of the', 'article'),
        'des': ('some / of the', 'article'),
        'au': ('to the', 'preposition'),
        'y': ('there', 'pronoun'),
        'il': ('he', 'pronoun'),
        'elle': ('she', 'pronoun'),
        'on': ('one / we', 'pronoun'),
    },
    'de': {
        'ist': ('is', 'verb'),
        'war': ('was', 'verb'),
        'sind': ('are', 'verb'),
        'hat': ('has', 'verb'),
        'habe': ('I have', 'verb'),
        'sie': ('she / they', 'pronoun'),
        'ihr': ('her / you (pl.)', 'pronoun'),
        'wie': ('how / as', 'conjunction'),
    },
    'es': {
        'es': ('is', 'verb'),
        'está': ('is', 'verb'),
        'que': ('that', 'conjunction'),
        'qué': ('what', 'pronoun'),
        'si': ('if', 'conjunction'),
        'sí': ('yes', 'adverb'),
        'lo': ('it / the', 'pronoun'),
        'del': ('of the', 'preposition'),
        'al': ('to the', 'preposition'),
        'bien': ('well', 'adverb'),
        'su': ('his / her / your', 'pronoun'),
    },
    'it': {
        'sei': ('you are', 'verb'),
        'sono': ('I am / they are', 'verb'),
        'ho': ('I have', 'verb'),
        'ha': ('has', 'verb'),
        'hai': ('you have', 'verb'),
        'del': ('of the', 'preposition'),
        'al': ('to the', 'preposition'),
        'si': ('oneself', 'pronoun'),
        'ci': ('us / there', 'pronoun'),
        'cosa': ('what / thing', 'noun'),
    },
    'sv': {
        'ska': ('shall', 'verb'),
        'vet': ('know', 'verb'),
        'var': ('was / where', 'verb'),
        'vad': ('what', 'pronoun'),
        'man': ('one (impersonal)', 'pronoun'),
        'nu': ('now', 'adverb'),
        'nej': ('no', 'interjection'),
        'ja': ('yes', 'interjection'),
        'sig': ('oneself', 'pronoun'),
        'om': ('if / about', 'conjunction'),
        'för': ('for', 'preposition'),
        'till': ('to', 'preposition'),
    },
}

# Google's part-of-speech names, mapped onto the vocabulary the Polish branch
# already produces through Morfeusz so the two agree.
POS_ALIASES = {
    'auxiliary verb': 'verb', 'exclamation': 'interjection', 'numeral': 'number',
    'phrase': 'word', 'abbreviation': 'word', 'prefix': 'word', 'suffix': 'word',
}

def clean_gloss(gloss, word):
    """Trim the service's stray punctuation and undo the arbitrary capitals it
    returns for short tokens — "THE" for "le", "GOOD" for "bien"."""
    gloss = gloss.strip().strip('"“”').rstrip('.!?,;:').strip()
    if not gloss:
        return None
    if word[:1].isupper() or gloss == 'I':
        return gloss
    # "THE" for "le", "Today" for "aujourd'hui", "You are" for "jesteś": asked
    # about a single short token the service capitalises as though it were a
    # sentence. The source corpora are lowercased throughout, so a capital in
    # the gloss never carries information worth keeping.
    parts = gloss.lower().split(' ')
    return ' '.join('I' if part == 'i' else part for part in parts)

def request_translation(word, source, attempts=4):
    """Ask for both the plain translation and the dictionary entries. Raises
    rather than returning the input word: a gloss equal to its own headword is
    indistinguishable from a successful translation, and the previous silent
    fallback wrote 77 of them into French alone."""
    params = urlencode([('client', 'gtx'), ('sl', source), ('tl', 'en'),
                        ('dt', 't'), ('dt', 'bd'), ('q', word)])
    url = 'https://translate.googleapis.com/translate_a/single?' + params
    last = None
    for attempt in range(attempts):
        try:
            with urlopen(url, timeout=20) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            last = error
            time.sleep(2 ** attempt)
    raise RuntimeError(f'could not translate {word!r} from {source}: {last}')

def translate_one(word, source):
    """The primary English gloss and part of speech for a single word.

    The dictionary entries are preferred over the plain translation because a
    bare word carries no context, and the plain result guesses badly without
    it: French "est" comes back as "East" when the dictionary knows it is the
    auxiliary "is", and "moyen" as "AVERAGE" when the leading sense is the noun
    "means". Entries arrive ordered by how common that part of speech is, so
    the first sense of the first entry is the best single answer available."""
    payload = request_translation(word, source)
    entries = payload[1] if len(payload) > 1 and payload[1] else None
    if entries:
        part_of_speech, senses = entries[0][0], entries[0][1]
        for sense in senses:
            gloss = clean_gloss(sense, word)
            if gloss:
                return gloss, POS_ALIASES.get(part_of_speech, part_of_speech)
    plain = ''.join(part[0] for part in payload[0] if part[0])
    return clean_gloss(plain, word), 'word'

def translate(words, source):
    if source == 'en':
        return [(word, 'word') for word in words]
    # Translate each entry independently. Newline-separated batches caused the
    # service to merge or shift short subtitle tokens, corrupting later glosses.
    with ThreadPoolExecutor(max_workers=12) as pool:
        return list(pool.map(lambda word: translate_one(word, source), words))

def hint(tag):
    bits=tag.split(':')
    labels={'sg':'singular','pl':'plural','nom':'nominative','gen':'genitive','dat':'dative',
      'acc':'accusative','inst':'instrumental','loc':'locative','voc':'vocative','pri':'I/we',
      'sec':'you','ter':'he/she/they','praet':'past','fin':'present','impt':'imperative',
      'inf':'infinitive','cond':'conditional','m1':'masc. personal','m2':'masculine','m3':'masculine',
      'f':'feminine','n':'neuter'}
    found=[]
    for b in bits:
        for atom in b.split('.'):
            if atom in labels and labels[atom] not in found: found.append(labels[atom])
    return ' · '.join(found[:3]) or bits[0]

def polish_info(word, morph):
    analyses=morph.analyse(word)
    if not analyses: return ('word', word, [])
    interp=analyses[0][2]
    lemma=interp[1].split(':')[0]
    tag=interp[2]
    kind=tag.split(':')[0]
    pos={'subst':'noun','depr':'noun','ger':'noun','fin':'verb','inf':'verb','praet':'verb',
      'impt':'verb','imps':'verb','bedzie':'verb','winien':'verb','pact':'verb','ppas':'verb',
      'adj':'adjective','adja':'adjective','adjp':'adjective','adv':'adverb','prep':'preposition',
      'conj':'conjunction','comp':'conjunction','num':'number','ppron12':'pronoun','ppron3':'pronoun',
      'siebie':'pronoun','pred':'particle','qub':'particle','interj':'interjection'}.get(kind,'word')
    generated=morph.generate(lemma)
    unique=[]; seen={word}
    # Prefer useful finite/case forms and keep the payload compact.
    preferred=('nom','gen','dat','acc','inst','loc','voc','fin','praet','impt','bedzie')
    generated.sort(key=lambda x: (not any(p in x[2].split(':') for p in preferred), len(x[0])))
    for form, _, ftag, *_ in generated:
        if form.lower() in seen or not re.fullmatch(r"[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ'-]+", form): continue
        seen.add(form.lower()); unique.append({'form':form,'hint':hint(ftag)})
        if len(unique)==8: break
    return pos, lemma, unique

def main():
    # Imported here rather than at module scope so the tokenising rules above
    # can be tested without the native Morfeusz build installed.
    import morfeusz2
    morph=morfeusz2.Morfeusz(generate=True)
    all_data={}
    for lang in LANGS:
        rows=fetch(lang); words=[w for w,_ in rows]; translations=translate(words,lang)
        entries=[]
        unglossed=[]
        for rank, ((word,count), (english, glossed_pos)) in enumerate(zip(rows,translations),1):
            override=GLOSS_OVERRIDES.get(lang,{}).get(word)
            if override: english, glossed_pos = override
            # Morfeusz gives Polish a real analysis; every other language takes
            # the part of speech from the dictionary entry that produced the
            # gloss, which beats the flat 'word' every non-Polish entry used to
            # carry.
            if lang=='pl': rawpos, base, forms=polish_info(word,morph)
            else: rawpos, base, forms=glossed_pos or 'word',word,[]
            if not english: unglossed.append(f'#{rank} {word}')
            entries.append({'rank':rank,'lemma':word,'base':base,'pos':rawpos,'en':english or word,
              'frequency':count,'forms':forms})
        if unglossed:
            raise RuntimeError(f'{lang}: no gloss for {len(unglossed)} words: {", ".join(unglossed[:10])}')
        all_data[lang]=entries
        print(f'  {lang}: 1000 words glossed')
    write_corpora(all_data)

def write_corpora(all_data):
    # One word per line so the generated diffs stay reviewable. Provenance and
    # licensing live in src/data/PROVENANCE.md, since JSON carries no comments.
    out_dir=ROOT/'src/data/frequency'
    out_dir.mkdir(parents=True, exist_ok=True)
    for lang in LANGS:
        body=',\n'.join('  '+json.dumps(entry,ensure_ascii=False,separators=(',',':'))
          for entry in all_data[lang])
        (out_dir/f'{lang}.json').write_text(f'[\n{body}\n]\n',encoding='utf-8')

if __name__=='__main__': main()
