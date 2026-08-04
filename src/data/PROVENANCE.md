# Corpus provenance and licences

Everything in this directory is generated. Do not edit by hand — regenerate
with the builders in `scripts/` instead.

## `frequency/<lang>.json`

The 1,000 most frequent subtitle tokens per language, one array entry per word
ranked by corpus frequency.

- **Source:** [FrequencyWords](https://github.com/hermitdave/FrequencyWords)
  OpenSubtitles 2018 corpora.
- **Licence:** CC BY-SA 4.0.
- **Built by:** `scripts/build-frequency-data.py`.

Polish `forms` and `base` lemmas are derived offline with
[Morfeusz 2](https://morfeusz.sgjp.pl/).

## `content/<lang>.json`

Learning content keyed by frequency rank: the English gloss plus an example
sentence and its direct translation.

- **Source:** [Tatoeba](https://tatoeba.org/) sentence pairs, taken from the
  OPUS Tatoeba `v2023-04-12` language-pair archives.
- **Licence:** CC BY 2.0 FR.
- **Built by:** `scripts/build-tatoeba-content.py`.

Entries that Tatoeba does not cover keep a source-language example and
deliberately leave the translation blank for later human curation; automatic
sentence translations are never generated.

## Validation

`src/data/corpus.test.ts` checks every file in this directory against the
types in `src/lib/types.ts` — entry counts, rank contiguity, required fields,
and gloss sanity. The data is checked in, so this runs in CI rather than at
application start.
