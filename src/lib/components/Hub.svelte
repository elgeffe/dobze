<script lang="ts">
  import TabBar from './TabBar.svelte';
  import { appStore } from '../store';
  import { dueCards } from '../fsrs';
  import { languageName, wordsFor } from '../data';
  import { recognizedPercent, stateCounts } from '../progress';
  import LanguagePicker from './LanguagePicker.svelte';

  let choosingLanguage = $state(false);

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
      <a href="#/hub" class="brand-home" aria-label="Dobze home">
        <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="currentColor"></circle>
          <path d="M5.65 13.5a6.5 6.5 0 0 0 12.7 0Z" fill="var(--paper)"></path>
        </svg>
        <span>Dobze.</span>
      </a>
      <a href="#/settings" class="mono top-action" aria-label="Open settings">SETTINGS</a>
    </div>
    <div class="masthead-rule"></div>
    <div class="masthead-title">Dobze.</div>
    <div class="masthead-sub">Learning {languageName(language)}</div>
  </div>
  <section class="language-switcher">
    <button class="language-switch-trigger" aria-expanded={choosingLanguage} onclick={() => choosingLanguage = !choosingLanguage}>
      <span><span class="eyebrow">Learning language</span><strong>{languageName(language)}</strong></span>
      <span class="switch-label">{choosingLanguage ? 'CLOSE' : 'CHANGE'} <span aria-hidden="true">{choosingLanguage ? '−' : '+'}</span></span>
    </button>
    {#if choosingLanguage}
      <div class="language-options"><LanguagePicker compact onchange={() => choosingLanguage = false} /><p>Your progress is saved separately for every language.</p></div>
    {/if}
  </section>
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
  .brand-home { color: var(--ink); }
  .coverage-meta { text-align: left; }
  .language-switcher { margin: 18px 16px 0; border: 1px solid var(--rule); border-radius: 16px; background: var(--card); box-shadow: var(--shadow1); overflow: hidden; }
  .language-switch-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 13px 16px; text-align: left; }
  .language-switch-trigger strong { display: block; margin-top: 2px; font-size: 17px; font-weight: 400; }
  .switch-label { font-family: var(--mono); font-size: 10px; letter-spacing: .35px; color: var(--accent-ink); }
  .language-options { padding: 0 10px 10px; border-top: 1px solid var(--rule); }
  .language-options :global(.language-grid) { margin-top: 10px; }
  .language-options p { margin: 10px 4px 2px; color: var(--ink3); font: italic 12px/1.3 var(--serif); }
</style>
