<script lang="ts">
  import { TARGET_LANGUAGES, languageProfile } from '../data';
  import { appStore } from '../store';
  import type { Language } from '../types';

  const choices = TARGET_LANGUAGES.map((code) => ({ code, ...languageProfile(code) }));

  let { compact = false, onchange }: { compact?: boolean; onchange?: () => void } = $props();

  function select(language: Language) {
    appStore.setLanguage(language);
    onchange?.();
  }
</script>

<div class:language-grid={compact}>
  {#each choices as choice}
    <button class="choice-card" class:compact class:selected={$appStore.settings.language === choice.code}
      aria-pressed={$appStore.settings.language === choice.code} onclick={() => select(choice.code)}>
      <span class="choice-flag" aria-hidden="true">{choice.flag}</span>
      <span class="choice-copy"><span class="choice-title">{choice.endonym}</span><span class="choice-sub">{choice.english}</span></span>
      {#if $appStore.settings.language === choice.code}<span class="check" aria-hidden="true">✓</span>{/if}
    </button>
  {/each}
</div>

<style>
  .choice-copy, .choice-title, .choice-sub { display: block; }
  .choice-copy { flex: 1; }
  .language-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .choice-card.compact { margin: 0; min-height: 66px; padding: 10px 12px; }
  .compact .choice-flag { font-size: 22px; }
  .compact .choice-title { font-size: 15px; }
  .compact .choice-sub { font-size: 10px; }
  @media (max-width: 340px) { .language-grid { grid-template-columns: 1fr; } }
</style>
