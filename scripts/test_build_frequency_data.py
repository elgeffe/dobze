#!/usr/bin/env python3
"""Rules that decide what counts as a word in the shipped corpora.

The OpenSubtitles lists are tokenised rather than lemmatised, so these rules
are the only thing standing between the app and a vocabulary list full of
fragments. Run with: python3 -m unittest discover -s scripts
"""
import importlib.util
import unittest
from pathlib import Path

# The builder's filename contains hyphens, so it cannot be imported by name.
spec = importlib.util.spec_from_file_location(
    'build_frequency_data', Path(__file__).resolve().parent / 'build-frequency-data.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ElisionsAndFragments(unittest.TestCase):
    def test_rejects_french_elisions(self):
        for token in ("c'", "l'", "j'", "d'", "qu'", "n'", "t'", "m'", "s'",
                      "quelqu'", "jusqu'"):
            self.assertFalse(build.is_word('fr', token), token)

    def test_keeps_french_words_that_contain_an_apostrophe(self):
        self.assertTrue(build.is_word('fr', "aujourd'hui"))

    def test_rejects_italian_elisions(self):
        for token in ("l'", "un'", "dell'", "all'", "nell'", "quest'", "anch'",
                      "gliel'", "nient'"):
            self.assertFalse(build.is_word('it', token), token)

    def test_keeps_italian_apocope(self):
        self.assertTrue(build.is_word('it', "po'"))

    def test_rejects_english_contraction_tails_and_stems(self):
        for token in ("'s", "'t", "'ll", "'ve", "'re", "don", "didn", "isn",
                      "wasn", "couldn", "em"):
            self.assertFalse(build.is_word('en', token), token)

    def test_keeps_english_words_the_stems_resemble(self):
        for token in ('can', 'cause', 'round', 'do', 'is'):
            self.assertTrue(build.is_word('en', token), token)


class HyphenatedForms(unittest.TestCase):
    def test_rejects_inverted_questions_and_enclitic_imperatives(self):
        for token in ('est-ce', 'avez-vous', 'a-t-il', 'dis-moi', 'vas-y',
                      'puis-je', 'allez-vous', 'tais-toi'):
            self.assertFalse(build.is_word('fr', token), token)

    def test_keeps_hyphenated_lexemes(self):
        for token in ('peut-être', 'rendez-vous', 'moi-même', 'grand-mère',
                      'après-midi', 'week-end', 'celui-là'):
            self.assertTrue(build.is_word('fr', token), token)

    def test_rejects_english_filler(self):
        for token in ('mm-hmm', 'i-i', 'uh-huh'):
            self.assertFalse(build.is_word('en', token), token)


class SingleLetters(unittest.TestCase):
    def test_keeps_real_single_letter_words(self):
        for lang, token in (('pl', 'w'), ('pl', 'i'), ('pl', 'z'), ('fr', 'à'),
                            ('fr', 'y'), ('es', 'y'), ('it', 'è'), ('sv', 'i'),
                            ('nl', 'u'), ('en', 'a')):
            self.assertTrue(build.is_word(lang, token), f'{lang}:{token}')

    def test_rejects_tokenizer_debris(self):
        for lang, token in (('pl', 'c'), ('pl', 't'), ('en', 'l'), ('en', 'o'),
                            ('nl', 'z'), ('fr', 'h'), ('de', 's'), ('sv', 'l')):
            self.assertFalse(build.is_word(lang, token), f'{lang}:{token}')


class AsciiAccents(unittest.TestCase):
    # Counts modelled on the real Italian list, where the accented spelling of
    # a genuine pair outnumbers the ASCII one by more than tenfold.
    COUNTS = {"e'": 77610, 'è': 2559257, "piu'": 29996, 'più': 424219,
              "perche'": 27909, 'perché': 417508, "i'": 29982, 'ì': 627,
              "o'": 9803, 'ò': 120, "dell'": 100000, "l'": 900000}

    def test_resolves_apostrophe_for_accent_spellings(self):
        for token, expected in (("e'", 'è'), ("piu'", 'più'), ("perche'", 'perché')):
            self.assertEqual(build.resolve_ascii_accent(token, self.COUNTS), expected)

    def test_leaves_elisions_alone(self):
        for token in ("dell'", "l'"):
            self.assertIsNone(build.resolve_ascii_accent(token, self.COUNTS))

    def test_ignores_an_accented_form_rarer_than_the_token(self):
        # "ì" and "ò" exist in the corpus as noise; "i'" and "o'" are not them.
        for token in ("i'", "o'"):
            self.assertIsNone(build.resolve_ascii_accent(token, self.COUNTS))


if __name__ == '__main__':
    unittest.main()
