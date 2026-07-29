<script lang="ts">
  import { appStore } from '../store';
  import type { Language } from '../types';

  const choices: { code: Language; title: string; sub: string; flag: string }[] = [
    { code: 'pl', title: 'Polski', sub: 'Polish', flag: '🇵🇱' },
    { code: 'nl', title: 'Nederlands', sub: 'Dutch', flag: '🇳🇱' },
    { code: 'fr', title: 'Français', sub: 'French', flag: '🇫🇷' },
    { code: 'de', title: 'Deutsch', sub: 'German', flag: '🇩🇪' },
    { code: 'es', title: 'Español', sub: 'Spanish', flag: '🇪🇸' },
    { code: 'it', title: 'Italiano', sub: 'Italian', flag: '🇮🇹' },
    { code: 'sv', title: 'Svenska', sub: 'Swedish', flag: '🇸🇪' },
  ];

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
      <span class="choice-copy"><span class="choice-title">{choice.title}</span><span class="choice-sub">{choice.sub}</span></span>
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
