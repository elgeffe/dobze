<script lang="ts">
  import TabBar from './TabBar.svelte';
  import { appStore } from '../store';
  import { wordsFor } from '../data';
  import { recognizedPercent, stateCounts } from '../progress';

  let language = $derived($appStore.settings.language);
  let words = $derived(wordsFor(language));
  let counts = $derived(stateCounts($appStore, language, words));
  let percentage = $derived(recognizedPercent(counts, words.length));
  let tiers = $derived([
    { name: 'Top 100', min: 1, max: 100 },
    { name: '100 – 500', min: 101, max: 500 },
    { name: '500 – 1,000', min: 501, max: 1000 },
  ].map((tier) => {
    const slice = words.filter((word) => word.rank >= tier.min && word.rank <= tier.max);
    const known = slice.filter((word) => ['known', 'recognized'].includes($appStore.words[`${language}:${word.rank}`]?.state)).length;
    return { ...tier, count: `${known} / ${slice.length}`, percentage: slice.length ? Math.round(known / slice.length * 100) : 0 };
  }));
</script>

<main class="screen">
  <div class="masthead">
    <div class="masthead-row">
      <div class="serif italic muted">Your progress</div>
      <a href="#/hub" class="mono back">BACK</a>
    </div>
    <div class="masthead-rule"></div>
  </div>
  <div class="screen-pad coverage-summary">
    <div class="large-inkwell" aria-label={`${percentage}% recognized`}>
      <span style:height={`${percentage}%`}></span>
    </div>
    <div>
      <div class="big-number">{percentage}<small>%</small></div>
      <div class="summary-copy">recognised in the<br />top one thousand.</div>
    </div>
  </div>
  <section class="section">
    <div class="eyebrow tier-label">By frequency tier</div>
    {#each tiers as tier}
      <div class="tier-row">
        <div class="small-inkwell"><span style:height={`${tier.percentage}%`}></span></div>
        <div class="tier-row-body">
          <div class="tier-row-head">
            <div class="tier-row-name">{tier.name}</div>
            <div class="tier-values"><span class="tier-row-pct">{tier.percentage}%</span><span class="tier-row-count">{tier.count}</span></div>
          </div>
          <div class="tier-bar"><i style:width={`${tier.percentage}%`}></i></div>
        </div>
      </div>
    {/each}
  </section>
  <section class="state-section">
    <div class="eyebrow state-label">By state</div>
    <div class="state-strip" aria-label="Word state distribution">
      <i style={`flex:${counts.known};background:var(--state-known)`}></i>
      <i style={`flex:${counts.recognized};background:var(--state-recognized)`}></i>
      <i style={`flex:${counts.heard};background:var(--state-heard)`}></i>
      <i style={`flex:${counts.new};background:var(--state-new)`}></i>
    </div>
    <div class="state-strip-row">
      <span>K · {counts.known}</span><span>R · {counts.recognized}</span>
      <span>H · {counts.heard}</span><span>N · {counts.new}</span>
    </div>
  </section>
  <TabBar active="hub" />
</main>

<style>
  .muted { font-size: 13px; color: var(--ink3); }
  .back { font-size: 10px; color: var(--ink3); }
  .coverage-summary { padding-top: 8px; display: flex; align-items: center; gap: 18px; }
  .large-inkwell { width: 104px; height: 104px; border-radius: 50%; border: 2px solid var(--ink); position: relative; overflow: hidden; flex: none; }
  .large-inkwell span, .small-inkwell span { position: absolute; inset-inline: 0; bottom: 0; background: var(--ink); }
  .big-number { font-size: 76px; line-height: .85; letter-spacing: -2.5px; }
  .big-number small { font-size: 28px; }
  .summary-copy { font-style: italic; font-size: 13px; color: var(--ink2); margin-top: 8px; }
  .tier-label { margin-bottom: 14px; }
  .tier-values { display: flex; align-items: baseline; gap: 6px; }
  .state-section { margin: 14px 24px 0; }
  .state-label { margin-bottom: 10px; }
</style>
