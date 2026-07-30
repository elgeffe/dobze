<script lang="ts">
  import { applyUpdate, online, updateReady } from '../offline';

  // Both notices float below the Dynamic Island / status bar, so they never
  // sit under the cut-out where iOS would clip them.
  let notice = $state<'offline' | 'online' | ''>('');
  let dismissed = $state(false);
  let previous = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const isOnline = $online;
    if (isOnline === previous) return;
    previous = isOnline;
    notice = isOnline ? 'online' : 'offline';
    clearTimeout(timer);
    timer = setTimeout(() => { notice = ''; }, 3600);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if ($updateReady) dismissed = false;
  });
</script>

<div class="status-stack">
  {#if notice}
    <p class="status-pill" class:offline={notice === 'offline'} role="status" aria-live="polite">
      {notice === 'offline' ? 'Offline · everything still works' : 'Back online'}
    </p>
  {/if}
  {#if $updateReady && !dismissed}
    <div class="update-banner" role="status" aria-live="polite">
      <span class="update-copy">
        <span class="update-title">A new version is ready</span>
        <span class="update-sub">Already downloaded.</span>
      </span>
      <button class="update-action" onclick={applyUpdate}>Reload</button>
      <button class="update-dismiss" aria-label="Dismiss update notice" onclick={() => dismissed = true}>×</button>
    </div>
  {/if}
</div>

<style>
  /* Above the tab bar and clear of the home indicator. The masthead sits
     directly under the Dynamic Island, so notices float from the bottom
     rather than covering the brand. */
  .status-stack {
    position: fixed;
    z-index: 120;
    bottom: calc(var(--safe-bottom) + 88px);
    left: calc(var(--safe-left) + 12px);
    right: calc(var(--safe-right) + 12px);
    max-width: 436px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .status-stack > * { pointer-events: auto; }

  .status-pill {
    margin: 0 auto;
    padding: 7px 14px;
    border-radius: 99px;
    background: var(--ink);
    color: var(--paper);
    font: 500 12px var(--sans);
    letter-spacing: .2px;
    box-shadow: var(--shadow2);
    animation: status-in .24s cubic-bezier(.2,.8,.2,1);
  }
  .status-pill.offline { background: var(--accent-ink); }

  .update-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 14px;
    border-radius: 14px;
    background: var(--card);
    border: 1px solid var(--rule);
    box-shadow: var(--shadow2);
    animation: status-in .24s cubic-bezier(.2,.8,.2,1);
  }
  .update-copy { flex: 1; min-width: 0; }
  .update-title { display: block; font: 15px var(--serif); letter-spacing: -.2px; }
  .update-sub { display: block; font: italic 12px var(--serif); color: var(--ink3); margin-top: 1px; }
  .update-action {
    flex-shrink: 0;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 10px;
    background: var(--ink);
    color: var(--paper);
    font: 600 13px var(--sans);
  }
  .update-dismiss {
    flex-shrink: 0;
    width: 32px; height: 36px;
    font: 20px var(--sans);
    color: var(--ink3);
  }

  @keyframes status-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
</style>
