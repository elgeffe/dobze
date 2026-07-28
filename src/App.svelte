<script lang="ts">
  import { onMount } from 'svelte';
  import Coverage from './lib/components/Coverage.svelte';
  import Hub from './lib/components/Hub.svelte';
  import Onboarding from './lib/components/Onboarding.svelte';
  import Review from './lib/components/Review.svelte';
  import Settings from './lib/components/Settings.svelte';
  import WordDetail from './lib/components/WordDetail.svelte';
  import WordList from './lib/components/WordList.svelte';
  import { navigate, route, startRouter } from './lib/router';
  import { appStore } from './lib/store';

  onMount(() => {
    const stop = startRouter();
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
    }
    return stop;
  });

  $effect(() => {
    if (!$appStore.settings.onboarded && $route.name !== 'onboarding') navigate('/onboarding/1');
  });
</script>

<svelte:head>
  <title>Dobze · local-first language practice</title>
  <meta name="description" content="Private, adaptive vocabulary practice for Polish, English, and Dutch." />
</svelte:head>

{#if $route.name === 'onboarding'}
  <Onboarding step={$route.step} />
{:else if $route.name === 'hub'}
  <Hub />
{:else if $route.name === 'coverage'}
  <Coverage />
{:else if $route.name === 'list'}
  <WordList />
{:else if $route.name === 'word'}
  <WordList />
  <WordDetail rank={$route.rank} />
{:else if $route.name === 'review'}
  <Review />
{:else if $route.name === 'settings'}
  <Settings />
{/if}
