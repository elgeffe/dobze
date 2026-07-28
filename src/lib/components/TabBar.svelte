<script lang="ts">
  let { active }: { active: 'hub' | 'review' | 'list' } = $props();
  const tabs = [
    { id: 'hub', label: 'Home', href: '#/hub' },
    { id: 'review', label: 'Review', href: '#/review' },
    { id: 'list', label: 'Words', href: '#/list' },
  ] as const;
</script>

<nav class="tabbar" aria-label="Primary navigation">
  {#each tabs as tab}
    <a href={tab.href} class:active={tab.id === active} aria-current={tab.id === active ? 'page' : undefined}>
      {tab.label}
    </a>
  {/each}
</nav>
