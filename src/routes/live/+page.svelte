<script lang="ts">
  let { data } = $props();
</script>

<h1>Live mode</h1>
<p class="mode">PLANNED · operator-local</p>
<p>
  The Krea provider is implemented. Public visitors never trigger paid inference.
  Replay is the default demo. There is no public live-generation form.
</p>
<ul>
  <li>Public path: <a href="/replay">/replay</a> (fixtures, no key, no spend)</li>
  <li>Provider: <code>KreaGenerationProvider</code> against documented Krea 2 Medium</li>
  <li>Operator command: <code>npm run live:plan</code> then <code>npm run live:record</code></li>
  <li>Acknowledgement required: <code>KREA_LIVE_ACK=SPEND_UNDER_1_USD</code></li>
  <li>Cap: six image jobs, motion off, estimated under $1</li>
  <li>Server key present in this environment: {data.liveConfigured ? 'yes' : 'no'}</li>
  <li>Postgres URL: {data.hasDatabase ? 'yes' : 'no (replay uses in-memory ledger)'}</li>
</ul>
<p>
  Runbook: <a href="https://github.com/moisestech/krea-field-studio/blob/main/docs/LIVE_RUNBOOK.md">docs/LIVE_RUNBOOK.md</a>.
  Until a reviewed live artifact exists, do not call this integration verified live.
</p>
<p>
  API balance is a separate USD wallet from app compute units.
  <a href="https://www.krea.ai/app/api/">Top up</a> only if you are the operator about to record.
</p>

<style>
  .mode { font-family: var(--mono); color: var(--coral); }
</style>
