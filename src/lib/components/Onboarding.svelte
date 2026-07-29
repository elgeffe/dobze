<script lang="ts">
  import { appStore } from '../store';
  import { navigate } from '../router';
  import LanguagePicker from './LanguagePicker.svelte';

  let { step }: { step: number } = $props();
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
      <LanguagePicker />
      <div class="floating-actions"><button class="btn-primary" onclick={() => navigate('/onboarding/2')}>Continue</button></div>
    {:else if step === 2}
      <div class="onb-eyebrow">Your translation bridge</div>
      <div class="onb-title">English is the<br />Rosetta stone.</div>
      <p class="onb-sub">Every word meaning and example translation uses English, so learning stays consistent across languages.</p>
      <div class="floating-actions"><button class="btn-primary" onclick={() => navigate('/onboarding/3')}>Continue</button></div>
    {:else}
      <div class="onb-eyebrow">Ready</div>
      <div class="onb-title">Review what<br />matters.</div>
      <p class="onb-sub">Start with the most frequent words. Your ratings stay on this device and decide what comes back next.</p>
      <div class="floating-actions"><button class="btn-primary" onclick={() => { appStore.completeOnboarding(); navigate('/review'); }}>Start first review</button></div>
    {/if}
  </div>
</main>

<style>
  .onb-pad { padding-bottom: 104px; }
</style>
