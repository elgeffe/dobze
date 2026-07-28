<script lang="ts">
  import { appStore } from '../store';
  import { navigate } from '../router';
  import type { Language } from '../types';

  let { step }: { step: number } = $props();
  const choices: { code: Language; title: string; sub: string; flag: string }[] = [
    { code: 'pl', title: 'Polski', sub: 'Polish', flag: 'PL' },
    { code: 'en', title: 'English', sub: 'English', flag: 'EN' },
    { code: 'nl', title: 'Nederlands', sub: 'Dutch', flag: 'NL' },
  ];
</script>

<main class="screen no-tabs">
  <div class="onb-progress" aria-label={`Onboarding step ${step} of 3`}>
    {#each [1, 2, 3] as item}
      <i class:active={item === step} class:done={item < step}></i>
    {/each}
  </div>
  <div class="onb-pad">
    {#if step === 1}
      <div class="onb-eyebrow">Choose a language</div>
      <div class="onb-title">What are you<br />learning?</div>
      {#each choices as choice}
        <button
          class="choice-card"
          class:selected={$appStore.settings.language === choice.code}
          aria-pressed={$appStore.settings.language === choice.code}
          onclick={() => appStore.setLanguage(choice.code)}
        >
          <span class="choice-flag">{choice.flag}</span>
          <span style="flex: 1">
            <span class="choice-title">{choice.title}</span>
            <span class="choice-sub">{choice.sub}</span>
          </span>
          {#if $appStore.settings.language === choice.code}<span class="check">✓</span>{/if}
        </button>
      {/each}
      <button class="btn-primary" onclick={() => navigate('/onboarding/2')}>Continue</button>
    {:else if step === 2}
      <div class="onb-eyebrow">Choose your home language</div>
      <div class="onb-title">Translate words<br />into…</div>
      <p class="onb-sub">Meanings, example translations, and grammar notes will use this language.</p>
      {#each choices as choice}
        <button
          class="choice-card"
          class:selected={$appStore.settings.homeLanguage === choice.code}
          aria-pressed={$appStore.settings.homeLanguage === choice.code}
          onclick={() => appStore.setHomeLanguage(choice.code)}
        >
          <span class="choice-flag">{choice.flag}</span>
          <span style="flex: 1">
            <span class="choice-title">{choice.title}</span>
            <span class="choice-sub">{choice.sub}</span>
          </span>
          {#if $appStore.settings.homeLanguage === choice.code}<span class="check">✓</span>{/if}
        </button>
      {/each}
      <button class="btn-primary" onclick={() => navigate('/onboarding/3')}>Continue</button>
    {:else}
      <div class="onb-eyebrow">Ready</div>
      <div class="onb-title">Review what<br />matters.</div>
      <p class="onb-sub">Start with the most frequent words. Your ratings stay on this device and decide what comes back next.</p>
      <button class="btn-primary finish" onclick={() => { appStore.completeOnboarding(); navigate('/review'); }}>
        Start first review
      </button>
    {/if}
  </div>
</main>

<style>
  .choice-title, .choice-sub { display: block; }
  .finish { margin-top: 60px; }
</style>
