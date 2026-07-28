<script lang="ts">
  import type { WordState } from '../types';
  let { state, size = 'dot' }: { state: WordState; size?: 'dot' | 'glyph' } = $props();
</script>

<span
  class={size === 'dot' ? `state-dot s-${state}` : `state-glyph s-${state}`}
  aria-label={`State: ${state}`}
  role="img"
><i></i></span>
