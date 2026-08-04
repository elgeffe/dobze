#!/usr/bin/env python3
"""Build contextual learning content from aligned Tatoeba sentence pairs.

The script intentionally keeps the checked-in frequency ranks and meaning
glosses stable. It replaces example sentences with real corpus sentences where
possible and retains the existing curated content only when Tatoeba has no
usable direct translation for a language pair.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.request
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "tatoeba"
CONTENT_DIR = ROOT / "src" / "data" / "content"
FREQUENCY_DIR = ROOT / "src" / "data" / "frequency"
LANGUAGES = ("pl", "en", "nl", "fr", "de", "es", "it", "sv")
PAIR_VERSION = "v2023-04-12"
PAIR_NAMES = ("en-pl", "en-nl", "en-fr", "de-en", "en-es", "en-it", "en-sv")
PAIR_URL = (
    "https://object.pouta.csc.fi/OPUS-Tatoeba/"
    f"{PAIR_VERSION}/moses/{{pair}}.txt.zip"
)
TOKEN_RE = re.compile(r"[^\W_]+(?:['’][^\W_]+)*", re.UNICODE)
META_PATTERNS = (
    "often appears in everyday",
    "komt vaak voor in alledaagse",
    "często pojawia się w codziennych",
    "the english word",
    "het nederlandse woord",
    "nauczycielka powiedziała",
)
ENGLISH_MATCH_FORMS = {
    "'s": ("it's", "he's", "she's", "that's", "what's", "there's"),
    "'t": ("don't", "can't", "won't", "isn't", "didn't"),
    "'m": ("i'm",),
    "don": ("don't",),
    "'re": ("you're", "we're", "they're"),
    "'ll": ("i'll", "you'll", "we'll", "they'll"),
    "'ve": ("i've", "we've", "they've"),
    "'d": ("i'd", "you'd", "we'd", "they'd"),
    "didn": ("didn't",),
    "doesn": ("doesn't",),
    "isn": ("isn't",),
    "wasn": ("wasn't",),
    "wouldn": ("wouldn't",),
    "couldn": ("couldn't",),
    "aren": ("aren't",),
    "ain": ("ain't",),
    "em": ("'em", "them"),
    "shouldn": ("shouldn't",),
    "'cause": ("'cause", "because"),
    "weren": ("weren't",),
    "hasn": ("hasn't",),
}
CURATED_EXAMPLES = {
    "en": {
        "'am": "I am ready to leave now.",
        "ha": "Ha, I knew you were joking.",
        "chuckles": "She chuckles whenever he tells that story.",
        "buddy": "Hey, buddy, wait for me.",
        "i-i": "I-I didn't know what to say.",
        "lieutenant": "The lieutenant checked the map before dawn.",
        "lt": "Lt. Harris reported for duty.",
        "mm": "Mm, this soup smells wonderful.",
        "mm-hmm": "Mm-hmm, I understand what you mean.",
        "sighs": "He sighs whenever the train is late.",
        "whoa": "Whoa, slow down before someone gets hurt.",
    },
    "nl": {
        "agenten": "De agenten wachten buiten.",
        "jawel": "Jawel, ik heb het zelf gezien.",
        "kolonel": "De kolonel gaf een duidelijk bevel.",
        "luitenant": "De luitenant meldde zich bij de commandant.",
        "miss": "Miss Nederland bezocht de tentoonstelling.",
        "mrs": "Mrs. Jones woont naast ons.",
        "shit": "Shit, ik ben mijn sleutels vergeten.",
        "sir": "Sir David sprak tijdens de ceremonie.",
    },
    "pl": {
        "fbi": "FBI prowadzi w tej sprawie dochodzenie.",
        "frank": "Frank czeka na nas przed hotelem.",
        "kapitanie": "Kapitanie, statek jest gotowy do wypłynięcia.",
        "michael": "Michael zadzwonił do mnie rano.",
        "okay": "Okay, spotkajmy się o szóstej.",
        "pa": "Pa, do zobaczenia jutro!",
        "panno": "Panno Kowalska, proszę wejść.",
        "racja": "Masz rację w tej sprawie.",
        "szefie": "Szefie, raport jest już gotowy.",
        "taa": "Taa, na pewno ci uwierzę.",
        "uh": "Uh, nie wiem, co powiedzieć.",
    },
}
MEANING_OVERRIDES = {
    "en": {
        "'s": {"en": "is / has / possessive ’s", "pl": "jest / ma / końcówka dzierżawcza", "nl": "is / heeft / bezits-s"},
        "'t": {"en": "not (contraction ending)", "pl": "nie (końcówka skrótu)", "nl": "niet (samentrekking)"},
        "'m": {"en": "am", "pl": "jestem", "nl": "ben"},
        "don": {"en": "do not (in “don’t”)", "pl": "nie", "nl": "niet"},
        "'re": {"en": "are", "pl": "jesteś / jesteście / są", "nl": "bent / zijn"},
        "'ll": {"en": "will", "pl": "będzie / będę", "nl": "zal / zullen"},
        "'ve": {"en": "have", "pl": "mam / mamy / mają", "nl": "heb / hebben"},
        "'d": {"en": "would / had", "pl": "by / miał", "nl": "zou / had"},
        "didn": {"en": "did not (in “didn’t”)", "pl": "nie zrobił", "nl": "deed niet"},
        "doesn": {"en": "does not (in “doesn’t”)", "pl": "nie robi", "nl": "doet niet"},
        "isn": {"en": "is not (in “isn’t”)", "pl": "nie jest", "nl": "is niet"},
        "wasn": {"en": "was not (in “wasn’t”)", "pl": "nie był", "nl": "was niet"},
        "wouldn": {"en": "would not (in “wouldn’t”)", "pl": "nie zrobiłby", "nl": "zou niet"},
        "couldn": {"en": "could not (in “couldn’t”)", "pl": "nie mógł", "nl": "kon niet"},
        "aren": {"en": "are not (in “aren’t”)", "pl": "nie są", "nl": "zijn niet"},
        "ain": {"en": "am / is / are not (informal)", "pl": "nie jestem / nie jest / nie są", "nl": "ben / is / zijn niet"},
        "em": {"en": "them (informal ’em)", "pl": "ich", "nl": "ze / hen"},
        "shouldn": {"en": "should not (in “shouldn’t”)", "pl": "nie powinien", "nl": "zou niet moeten"},
        "'cause": {"en": "because", "pl": "ponieważ / bo", "nl": "omdat"},
        "weren": {"en": "were not (in “weren’t”)", "pl": "nie byli", "nl": "waren niet"},
        "hasn": {"en": "has not (in “hasn’t”)", "pl": "nie ma", "nl": "heeft niet"},
        "'am": {"en": "am", "pl": "jestem", "nl": "ben"},
    },
}


@dataclass(frozen=True)
class SentencePair:
    row: int
    source: str
    target: str


def download_archives() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    for pair in PAIR_NAMES:
        destination = CACHE / f"{pair}.txt.zip"
        if destination.exists():
            continue
        print(f"Downloading {pair} Tatoeba archive…", file=sys.stderr)
        urllib.request.urlretrieve(PAIR_URL.format(pair=pair), destination)


def load_frequency_words() -> dict[str, list[dict]]:
    result = {}
    for language in LANGUAGES:
        path = FREQUENCY_DIR / f"{language}.json"
        if not path.exists():
            raise RuntimeError(f"Unable to read {language} frequency data")
        result[language] = json.loads(path.read_text(encoding="utf-8"))
    return result


def load_existing_content() -> dict[str, dict[str, dict]]:
    result = {}
    for language in LANGUAGES:
        path = CONTENT_DIR / f"{language}.json"
        result[language] = (
            json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        )
    return result


def pair_rows(pair_name: str) -> tuple[list[str], list[str], list[tuple[str, str]]]:
    left, right = pair_name.split("-")
    archive = CACHE / f"{pair_name}.txt.zip"
    with zipfile.ZipFile(archive) as zipped:
        left_lines = zipped.read(
            f"Tatoeba.{pair_name}.{left}"
        ).decode("utf-8").splitlines()
        right_lines = zipped.read(
            f"Tatoeba.{pair_name}.{right}"
        ).decode("utf-8").splitlines()
    if len(left_lines) != len(right_lines):
        raise RuntimeError(f"Mismatched {pair_name} sentence files")
    return left_lines, right_lines, list(zip(left_lines, right_lines))


def tokens(text: str) -> set[str]:
    return {token.casefold().replace("’", "'") for token in TOKEN_RE.findall(text)}


def acceptable(source: str, target: str) -> bool:
    source_tokens = TOKEN_RE.findall(source)
    target_tokens = TOKEN_RE.findall(target)
    if not 3 <= len(source_tokens) <= 16:
        return False
    if not 1 <= len(target_tokens) <= 22:
        return False
    lowered = source.casefold()
    if any(pattern in lowered for pattern in META_PATTERNS):
        return False
    if "http://" in lowered or "https://" in lowered or "www." in lowered:
        return False
    if any(character in source for character in "{}[]<>"):
        return False
    return True


def sentence_score(pair: SentencePair) -> tuple[int, int, int, int]:
    source_tokens = TOKEN_RE.findall(pair.source)
    punctuation_penalty = sum(pair.source.count(char) for char in '"“”«»;:')
    digit_penalty = 8 if any(char.isdigit() for char in pair.source) else 0
    shout_penalty = 3 if pair.source.count("!") else 0
    return (
        abs(len(source_tokens) - 7) + digit_penalty + shout_penalty,
        punctuation_penalty,
        len(pair.source),
        pair.row,
    )


def build_indexes(words):
    indexes: dict[tuple[str, str], dict[str, list[SentencePair]]] = {}
    for pair_name in PAIR_NAMES:
        left, right = pair_name.split("-")
        _, _, rows = pair_rows(pair_name)
        for source_language, target_language, reverse in (
            (left, right, False),
            (right, left, True),
        ):
            index: dict[str, list[SentencePair]] = defaultdict(list)
            wanted = {
                form
                for word in words[source_language]
                for form in (
                    ENGLISH_MATCH_FORMS.get(word["lemma"].casefold(), (word["lemma"].casefold(),))
                    if source_language == "en" else (word["lemma"].casefold(),)
                )
            }
            for row_number, (left_text, right_text) in enumerate(rows):
                source, target = (
                    (right_text, left_text) if reverse else (left_text, right_text)
                )
                if not acceptable(source, target):
                    continue
                pair = SentencePair(row_number, source.strip(), target.strip())
                for token in tokens(source) & wanted:
                    # A few function words occur in millions of rows. A broad
                    # sample is ample for scoring and keeps generation bounded.
                    if len(index[token]) < 200:
                        index[token].append(pair)
            for candidates in index.values():
                candidates.sort(key=sentence_score)
            indexes[(source_language, target_language)] = index
    return indexes


def select_candidate(
    indexes,
    source_language: str,
    target_language: str,
    lemma: str,
    used: set[tuple[str, str, int]],
) -> SentencePair | None:
    normalized = lemma.casefold().replace("’", "'")
    matching_forms = (
        ENGLISH_MATCH_FORMS.get(normalized, (normalized,))
        if source_language == "en"
        else (normalized,)
    )
    candidates = [
        candidate
        for form in matching_forms
        for candidate in indexes[(source_language, target_language)].get(form, [])
    ]
    candidates.sort(key=sentence_score)
    for candidate in candidates:
        key = (source_language, target_language, candidate.row)
        if key not in used:
            used.add(key)
            return candidate
    return candidates[0] if candidates else None


def fallback_context(
    existing: dict,
    source_language: str,
    home_language: str,
    source_candidate: SentencePair | None,
    lemma: str,
) -> dict:
    existing_examples = [
        context.get("example", "")
        for context in existing.get("contexts", {}).values()
        if context.get("example")
    ]
    curated_example = CURATED_EXAMPLES.get(source_language, {}).get(lemma, "")
    example = (
        source_candidate.source
        if source_candidate
        else curated_example
        or existing.get("example", "")
        or (existing_examples[0] if existing_examples else "")
        or lemma
    )
    return {
        "example": example,
        # Missing direct corpus translations are deliberately left blank. They
        # must not be filled with automatic translation.
        "translation": example if home_language == source_language else "",
        "source": "tatoeba" if source_candidate else "curated",
    }


def write_content(language: str, entries: dict[int, dict]) -> None:
    # One entry per line: the files are large and generated, so readable diffs
    # matter more than the bytes pretty-printing would cost. Provenance and
    # licensing live in src/data/PROVENANCE.md, since JSON carries no comments.
    ranks = sorted(entries)
    lines = ["{"]
    for index, rank in enumerate(ranks):
        payload = json.dumps(entries[rank], ensure_ascii=False, separators=(",", ":"))
        comma = "," if index < len(ranks) - 1 else ""
        lines.append(f'  "{rank}": {payload}{comma}')
    lines.append("}")
    lines.append("")
    (CONTENT_DIR / f"{language}.json").write_text("\n".join(lines), encoding="utf-8")


def validate_entries(language: str, entries: dict[int, dict]) -> None:
    if len(entries) != 1000:
        raise RuntimeError(f"{language}: expected 1,000 entries")
    for rank, entry in entries.items():
        contexts = entry.get("contexts", {})
        if set(contexts) != {"en"}:
            raise RuntimeError(f"{language} #{rank}: incomplete contexts")
        for home_language, context in contexts.items():
            if not context.get("example"):
                raise RuntimeError(f"{language} #{rank}: missing example")
            if home_language == language:
                if context["translation"] != context["example"]:
                    raise RuntimeError(
                        f"{language} #{rank}: source-language context mismatch"
                    )
            elif context["source"] == "curated" and context["translation"]:
                raise RuntimeError(
                    f"{language} #{rank}: curated translation must stay blank"
                )
            if context["source"] == "curated":
                lowered = context["example"].casefold()
                if any(pattern in lowered for pattern in META_PATTERNS):
                    raise RuntimeError(
                        f"{language} #{rank}: meta fallback remains"
                    )


def main() -> None:
    download_archives()
    words = load_frequency_words()
    existing = load_existing_content()
    indexes = build_indexes(words)
    used: set[tuple[str, str, int]] = set()
    report = {language: 0 for language in LANGUAGES}

    for language in LANGUAGES:
        generated: dict[int, dict] = {}
        for word in words[language]:
            rank = word["rank"]
            lemma = word["lemma"]
            old_entry = existing[language].get(str(rank), {})
            contexts = {}
            target_language = "en" if language != "en" else "fr"
            source_candidate = select_candidate(
                indexes,
                language,
                target_language,
                lemma,
                used,
            )
            if source_candidate:
                contexts["en"] = {"example": source_candidate.source,
                    "translation": source_candidate.source if language == "en" else source_candidate.target,
                    "source": "tatoeba"}
                report[language] += 1
            else:
                contexts["en"] = fallback_context(old_entry, language, "en", source_candidate, lemma)

            meaning = {"en": MEANING_OVERRIDES.get(language, {}).get(lemma, {}).get("en", word.get("en", lemma))}
            entry = {
                "meaning": meaning,
                "contexts": contexts,
            }
            if old_entry.get("note"):
                entry["note"] = old_entry["note"]
            generated[rank] = entry
        validate_entries(language, generated)
        write_content(language, generated)

    print("Tatoeba coverage by learning language -> English:")
    for language in LANGUAGES:
        print(f"  {language}: {report[language]}/1000")


if __name__ == "__main__":
    main()
