<script lang="ts">
  let { data } = $props();
  const snap = data.snap;
  const selected = snap?.directions.find((d) => d.status === 'selected');
  const selectedJob = snap?.jobs.find((j) => j.directionId === selected?.id);
  const site = snap?.assets.find((a) => a.kind === 'site');
  const art = snap?.assets.find((a) => a.kind === 'artwork');
</script>

{#if !snap}
  <p>Unknown run.</p>
{:else}
  <article class="board">
    <p class="mode">{snap.project.mode.toUpperCase()}</p>
    <h1>{snap.project.title}</h1>
    <p>{snap.brief.goal}</p>
    <p class="warn">Creative previsualization, not spatial validation. This board does not verify scale, structure, or permitting.</p>
    <div class="pair">
      <figure><img src={site?.url} alt="Site still" /><figcaption>Site</figcaption></figure>
      <figure><img src={art?.url} alt="Artwork still" /><figcaption>Artwork</figcaption></figure>
    </div>
    {#if selectedJob?.resultUrls[0]}
      <figure>
        <img src={selectedJob.resultUrls[0]} alt={selected?.label ?? 'Selected direction'} />
        <figcaption>Selected · {selected?.label} · {selected?.lane}</figcaption>
      </figure>
      <p>{selected?.rationale}</p>
    {/if}
    <h2>Provenance</h2>
    <ul class="mono">
      <li>Model: image/krea/krea-2/medium</li>
      <li>Project: {snap.project.id}</li>
      <li>Jobs: {snap.jobs.map((j) => j.providerJobId).join(', ') || 'none yet'}</li>
    </ul>
    <p><a href="/trace/{snap.project.id}">Inspect run trace</a> · <a href="/replay">Return to replay</a></p>
  </article>
{/if}

<style>
  .board { max-width: 820px; }
  .mode { font-family: var(--mono); color: var(--coral); }
  .warn { border-left: 3px solid var(--coral); padding-left: 0.75rem; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  img { width: 100%; }
  .mono { font-family: var(--mono); font-size: 0.85rem; }
  @media print { nav, footer, header { display: none !important; } }
</style>
