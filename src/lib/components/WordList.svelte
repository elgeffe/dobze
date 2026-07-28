<script lang="ts">
  import TabBar from './TabBar.svelte';
  import StateIndicator from './StateIndicator.svelte';
  import { appStore } from '../store';
  import { bridgeOf, formsFor, wordsFor } from '../data';
  import { navigate } from '../router';
  import type { WordState } from '../types';

  let filter = $state<'all' | WordState>('all');
  let visible = $state(120);
  let language = $derived($appStore.settings.language);
  let allWords = $derived(wordsFor(language));
  let filtered = $derived(filter === 'all'
    ? allWords
    : allWords.filter((word) => ($appStore.words[`${language}:${word.rank}`]?.state ?? 'new') === filter));
  let shown = $derived(filtered.slice(0, visible));
</script>

<main class="screen">
  <div class="masthead">
    <div class="eyebrow">Browse</div>
    <h1 class="masthead-title list-title">By tier</h1>
    <div class="masthead-sub">Earlier ranks cover more conversation.</div>
  </div>
  <div class="filters filter-row" aria-label="Filter words">
    {#each ['all', 'new', 'heard', 'recognized', 'known'] as option}
      <button
        class="chip"
        class:active={filter === option}
        aria-pressed={filter === option}
        onclick={() => { filter = option as typeof filter; visible = 120; }}
      >{option[0].toUpperCase() + option.slice(1)}</button>
    {/each}
  </div>
  {#if shown.length}
    <div class="tier-group word-group">
      {#each shown as word}
        {@const progress = $appStore.words[`${language}:${word.rank}`]}
        <button class="list-row" onclick={() => navigate(`/word/${word.rank}`)}>
          <span class="list-row-main">
            <StateIndicator state={progress?.state ?? 'new'} />
            <span class="list-rank">{String(word.rank).padStart(3, '0')}</span>
            <span class="list-body">
              <span class="list-lemma">{word.lemma}</span>
              <span class="list-bridge">{bridgeOf(word, language, $appStore.settings.homeLanguage)}</span>
            </span>
            <span class="list-pos">{word.pos}</span>
          </span>
          {#if formsFor(word, language)?.length}
            <span class="forms-row">
              {#each formsFor(word, language) ?? [] as form}
                <span class="form-chip seen"><span class="form-text">{form.form}</span><span class="form-hint">{form.hint}</span></span>
              {/each}
            </span>
          {/if}
        </button>
      {/each}
    </div>
    {#if visible < filtered.length}
      <div class="load-more"><button class="chip" onclick={() => visible += 120}>Show more · {filtered.length - visible} remaining</button></div>
    {/if}
  {:else}
    <div class="empty-state">
      <div class="glyph"></div>
      <h3>No {filter} words yet.</h3>
      <p>Try a different filter, or start a review to build your progress.</p>
    </div>
  {/if}
  <TabBar active="list" />
</main>

<style>
  .list-title { margin: 4px 0 0; }
  .filter-row { margin-top: 14px; }
  .word-group { margin-top: 8px; }
  .list-row-main, .list-body, .list-lemma, .list-bridge { display: flex; }
  .list-body { flex-direction: column; }
  .load-more { padding: 20px 24px 100px; text-align: center; }
</style>
