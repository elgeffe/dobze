<script lang="ts">
  import TabBar from './TabBar.svelte';
  import StateIndicator from './StateIndicator.svelte';
  import { appStore, progressFor } from '../store';
  import { bridgeOf, contextFor, wordsFor } from '../data';
  import { nextDueHint } from '../fsrs';
  import { buildReviewQueue, rateWord } from '../review';

  const initialState = appStore.snapshot();
  const initialLanguage = initialState.settings.language;
  let language = $derived($appStore.settings.language);
  let sessionLanguage = $state(initialLanguage);
  let queue = $state(buildReviewQueue(initialState, initialLanguage));
  let index = $state(0);
  let revealed = $state(false);
  let key = $derived(queue[index]);
  let rank = $derived(key ? Number(key.split(':')[1]) : 0);
  let word = $derived(wordsFor(language).find((item) => item.rank === rank));
  let progress = $derived(key ? progressFor($appStore, key) : undefined);
  let context = $derived(word ? contextFor(word, language, $appStore.settings.homeLanguage) : null);

  $effect(() => {
    if (language !== sessionLanguage) {
      sessionLanguage = language;
      queue = buildReviewQueue($appStore, language);
      index = 0;
      revealed = false;
    }
  });

  function rate(rating: 1 | 2 | 3 | 4) {
    if (!key || !progress) return;
    appStore.update((state) => { state.words[key] = rateWord(progressFor(state, key), rating); });
    index += 1;
    revealed = false;
  }
</script>

{#if word && progress && context}
  <main class="screen no-tabs">
    <div class="review-head">
      <div class="serif italic review-count">Review · {index + 1} of {queue.length}</div>
      <a href="#/hub" class="mono top-action" aria-label="Exit review">ESC</a>
    </div>
    <div class="review-rule"></div>
    <div class="review-progress" aria-label={`Card ${index + 1} of ${queue.length}`}>
      {#each queue as _, itemIndex}<i class:done={itemIndex <= index}></i>{/each}
    </div>
    <div class="card-stack">
      {#if !revealed}
        <button class="review-card front" onclick={() => revealed = true}>
          <span class="review-card-meta">
            <span class="review-card-mono">#{String(word.rank).padStart(3, '0')} · {word.pos}</span>
            <StateIndicator state={progress.state} size="glyph" />
          </span>
          <span class="review-card-front-body">
            <span class="lemma">{word.lemma}</span>
            <span class="serif italic reveal-hint">tap to reveal</span>
          </span>
          <span class="review-tap-hint">Show answer</span>
        </button>
      {:else}
        <article class="review-card">
          <div class="review-card-meta">
            <div class="review-card-mono">#{String(word.rank).padStart(3, '0')} · {word.pos}</div>
            <StateIndicator state={progress.state} size="glyph" />
          </div>
          <div class="review-card-back-body">
            <div class="lemma">{word.lemma}</div>
            <div class="bridge">{bridgeOf(word, language, $appStore.settings.homeLanguage)}</div>
          </div>
          <div class="review-context">
            <div class="example-quote">{context.example}</div>
            {#if context.translation}<div class="context-translation">{context.translation}</div>{/if}
            {#if context.note}<div class="context-note">{context.note}</div>{/if}
          </div>
          {#if word.base !== word.lemma}
            <div class="word-family"><div class="word-family-title">Dictionary form</div><div>{word.base}</div></div>
          {/if}
        </article>
      {/if}
    </div>
    {#if revealed}
      <div class="rating-row" aria-label="Rate your recall">
        {#each [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']] as rating}
          <button
            class="rate-btn"
            class:again={rating[0] === 1}
            class:hard={rating[0] === 2}
            class:good={rating[0] === 3}
            class:easy={rating[0] === 4}
            onclick={() => rate(rating[0] as 1 | 2 | 3 | 4)}
          >
            <div class="label">{rating[1]}</div>
            <div class="sub">{nextDueHint(progress.fsrs, rating[0] as 1 | 2 | 3 | 4)}</div>
          </button>
        {/each}
      </div>
    {/if}
  </main>
{:else}
  <main class="screen">
    <div class="masthead">
      <div class="eyebrow">Review</div>
      <h1 class="masthead-title done-title">{queue.length ? 'All done.' : 'Nothing due.'}</h1>
      <div class="masthead-sub">{queue.length ? 'Cards will reappear when their interval ends.' : 'You have reviewed every available word. Come back when the next card is due.'}</div>
    </div>
    <div class="screen-pad done-action"><a class="btn-primary" href="#/list">Browse the list</a></div>
    <TabBar active="review" />
  </main>
{/if}

<style>
  .review-count { font-size: 13px; color: var(--ink3); }
  .review-rule { height: 1px; background: var(--ink); margin: 8px 24px 0; }
  .review-card-meta, .review-card-front-body, .review-tap-hint { display: flex; }
  .review-card-front-body { flex-direction: column; }
  .review-tap-hint { display: block; }
  .reveal-hint { font-size: 14px; color: var(--ink3); }
  .done-title { margin: 4px 0 0; }
  .done-action { padding-top: 32px; }
</style>
