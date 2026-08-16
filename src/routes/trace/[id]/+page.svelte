<script lang="ts">
  let { data } = $props();
  const snap = data.snap;
</script>

{#if !snap}
  <p>Unknown run.</p>
{:else}
  <h1>Run trace</h1>
  <p class="mono">{snap.project.id} · {snap.project.mode} · {snap.project.status}</p>
  <table>
    <thead>
      <tr>
        <th>Direction</th>
        <th>Provider job</th>
        <th>State</th>
        <th>Hash</th>
        <th>Attempt</th>
      </tr>
    </thead>
    <tbody>
      {#each snap.jobs as job}
        {@const dir = snap.directions.find((d) => d.id === job.directionId)}
        <tr>
          <td>{dir?.label}</td>
          <td class="mono">{job.providerJobId}</td>
          <td class="mono">{job.providerStatus}</td>
          <td class="mono">{job.requestHash.slice(0, 12)}</td>
          <td>{job.attempt}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <h2>Webhook receipts</h2>
  {#if snap.receipts.length === 0}
    <p>None. Replay uses polling unless a webhook is posted to <code>/api/webhooks/krea</code>.</p>
  {:else}
    <ul>
      {#each snap.receipts as r}
        <li class="mono">{r.receivedAt} · {r.providerJobId} · {r.status} · duplicate={String(r.duplicate)}</li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th, td { border-bottom: 1px solid var(--line); text-align: left; padding: 0.4rem 0.3rem; }
  .mono { font-family: var(--mono); font-size: 0.8rem; }
</style>
