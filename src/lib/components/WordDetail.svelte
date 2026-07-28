<script lang="ts">
  import { onMount } from 'svelte';
  import StateIndicator from './StateIndicator.svelte';
  import { appStore } from '../store';
  import { bridgeOf, contextFor, formsFor, STATE_LABEL, STATE_ORDER, wordsFor } from '../data';
  import { navigate } from '../router';

  let { rank }: { rank: number } = $props();
  let language = $derived($appStore.settings.language);
  let word = $derived(wordsFor(language).find((item) => item.rank === rank));
  let progress = $derived($appStore.words[`${language}:${rank}`]);
  let context = $derived(word ? contextFor(word, language, $appStore.settings.homeLanguage) : null);

  onMount(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') navigate('/list'); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  });
</script>

{#if word && progress && context}
  <button class="scrim" aria-label="Close word details" onclick={() => navigate('/list')}></button>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="word-title">
    <div class="sheet-handle"></div>
    <div class="detail-head">
      <div>
        <div class="detail-rank">#{String(word.rank).padStart(3, '0')} · {word.pos}</div>
        <h2 class="detail-lemma" id="word-title">{word.lemma}</h2>
        <div class="detail-bridge">{bridgeOf(word, language, $appStore.settings.homeLanguage)}</div>
      </div>
      <StateIndicator state={progress.state} size="glyph" />
    </div>
    <hr class="hr-rule" />
    <div class="eyebrow context-label">In context</div>
    <div class="example-quote">{context.example}</div>
    {#if context.translation}<div class="context-translation">{context.translation}</div>{/if}
    {#if context.note}<div class="context-note">{context.note}</div>{/if}
    {#if word.base !== word.lemma}<div class="dictionary-form">Dictionary form: {word.base}</div>{/if}
    {#if formsFor(word, language)?.length}
      <div class="word-family">
        <div class="word-family-title">Polish transformations</div>
        <div class="forms-row details-forms">
          {#each formsFor(word, language) ?? [] as form}
            <span class="form-chip seen"><span class="form-text">{form.form}</span><span class="form-hint">{form.hint}</span></span>
          {/each}
        </div>
      </div>
    {/if}
    <div class="eyebrow recognition-label">Recognition</div>
    <div class="state-stepper">
      {#each STATE_ORDER as state, index}
        {@const currentIndex = STATE_ORDER.indexOf(progress.state)}
        <button
          class:current={index === currentIndex}
          class:past={index < currentIndex}
          aria-pressed={index === currentIndex}
          onclick={() => appStore.setWordState(language, word.rank, state)}
        >{STATE_LABEL[state]}</button>
      {/each}
    </div>
  </div>
{:else}
  <div class="sheet" role="dialog" aria-modal="true">
    <h2>Word not found</h2>
    <button class="btn-primary" onclick={() => navigate('/list')}>Back to words</button>
  </div>
{/if}

<style>
  .scrim { width: 100%; }
  .detail-lemma { margin: 2px 0 0; font-weight: 400; }
  .context-label { margin-bottom: 8px; }
  .details-forms { padding-left: 0; }
  .recognition-label { margin: 18px 0 10px; }
</style>
