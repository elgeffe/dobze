<script lang="ts">
  import TabBar from './TabBar.svelte';
  import { appStore } from '../store';

  let message = $state('');
  let importInput: HTMLInputElement;

  function notify(text: string) {
    message = text;
    window.setTimeout(() => { if (message === text) message = ''; }, 1800);
  }

  function exportProgress() {
    const blob = new Blob([appStore.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dobze-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify('Downloaded');
  }

  async function importProgress() {
    const file = importInput.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      notify('File is too large');
      return;
    }
    const ok = appStore.importJSON(await file.text());
    notify(ok ? 'Imported' : 'Invalid progress file');
    importInput.value = '';
  }
</script>

<main class="screen">
  <div class="masthead">
    <div class="settings-nav"><a href="#/hub" class="top-action" aria-label="Exit settings and return home">← HOME</a></div>
    <h1 class="masthead-title settings-title">Settings</h1>
    <div class="masthead-sub">v1.0 · offline · local-first</div>
  </div>
  <div class="settings-wrap">
    <section class="settings-group">
      <h2 class="label">Direction</h2>
      <div class="settings-card">
        <div class="settings-row"><span class="title">Translate into</span><span class="detail">English</span></div>
      </div>
    </section>
    <section class="settings-group">
      <h2 class="label">Data</h2>
      <div class="settings-card">
        <button class="settings-row" onclick={exportProgress}><span class="title">Export progress</span><span class="detail">JSON</span><span class="arrow">›</span></button>
        <button class="settings-row" onclick={() => importInput.click()}><span class="title">Import progress</span><span class="arrow">›</span></button>
        <input class="visually-hidden" bind:this={importInput} type="file" accept="application/json" onchange={importProgress} />
        <button class="settings-row danger" onclick={() => {
          if (window.confirm('Reset all progress? This cannot be undone.')) { appStore.reset(); notify('Reset'); }
        }}><span class="title">Reset progress</span><span class="arrow">›</span></button>
      </div>
    </section>
    <section class="settings-group">
      <h2 class="label">Credits</h2>
      <div class="settings-card">
        <div class="settings-row"><span class="title">Corpus source</span><span class="detail">FrequencyWords · CC BY-SA 4.0</span></div>
        <div class="settings-row"><span class="title">Example sentences</span><a class="detail" href="https://tatoeba.org/" target="_blank" rel="noreferrer">Tatoeba · CC BY 2.0 FR</a></div>
        <div class="settings-row"><span class="title">Version</span><span class="detail">1.0.0</span></div>
      </div>
    </section>
  </div>
  {#if message}<div class="toast" role="status" aria-live="polite">{message}</div>{/if}
  <TabBar active="hub" />
</main>

<style>
  .settings-title { margin: 0; font-weight: 400; }
  .settings-nav { display: flex; margin-bottom: 20px; }
  .settings-wrap { padding: 20px 16px 0; }
  .settings-group .label { margin: 0; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
</style>
