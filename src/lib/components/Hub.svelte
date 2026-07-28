<script lang="ts">
  import TabBar from './TabBar.svelte';
  import { appStore } from '../store';
  import { dueCards } from '../fsrs';
  import { languageName, wordsFor } from '../data';
  import { recognizedPercent, stateCounts } from '../progress';

  const dateLabel = (date = new Date()) =>
    `${date.toLocaleDateString('en', { weekday: 'long' })} · ${date.getDate()} ${date.toLocaleDateString('en', { month: 'short' })}`;

  let language = $derived($appStore.settings.language);
  let words = $derived(wordsFor(language));
  let counts = $derived(stateCounts($appStore, language, words));
  let recognized = $derived(counts.known + counts.recognized);
  let percentage = $derived(recognizedPercent(counts, words.length));
  let due = $derived(dueCards($appStore.words).filter((key) => key.startsWith(`${language}:`)).length);
  let ready = $derived(Math.min(20, due + counts.new));
</script>

<main class="screen">
  <div class="masthead">
    <div class="masthead-row">
      <div class="serif italic date">{dateLabel()}</div>
      <a href="#/settings" class="mono settings-link">SETTINGS</a>
    </div>
    <div class="masthead-rule"></div>
    <div class="masthead-title">Dobze.</div>
    <div class="masthead-sub">Learning {languageName(language)}</div>
  </div>
  <section class="review-hero">
    <div class="eyebrow">Your daily practice</div>
    <h1>Make the words stick.</h1>
    <p>Review adapts to your memory. Difficult and new words return often; well-known words wait longer.</p>
    <a class="btn-primary" href="#/review">Start review · {ready} words</a>
  </section>
  <a class="coverage-card" href="#/coverage">
    <div class="eyebrow">Local progress</div>
    <div class="coverage-row">
      <div class="inkwell"><span class="inkwell-fill" style:height={`${percentage}%`}></span></div>
      <div>
        <div class="coverage-num">{percentage}<span class="coverage-pct">%</span></div>
        <div class="coverage-meta">{recognized} of {words.length.toLocaleString()} recognized</div>
      </div>
    </div>
  </a>
  <div class="section">
    <a class="row-tile" href="#/list">
      <div class="row-tile-body">
        <div class="row-tile-title">Explore all {words.length.toLocaleString()} words</div>
        <div class="row-tile-sub">
          {language === 'pl' ? 'Including Polish word families and grammatical forms' : 'Ranked by real subtitle frequency'}
        </div>
      </div>
      <div class="row-tile-arrow">→</div>
    </a>
  </div>
  <TabBar active="hub" />
</main>

<style>
  .date { font-size: 14px; color: var(--ink3); }
  .settings-link { font-size: 11px; color: var(--ink3); }
  .coverage-meta { text-align: left; }
</style>
