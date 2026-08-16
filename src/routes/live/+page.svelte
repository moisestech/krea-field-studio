<script lang="ts">
  let { data } = $props();
</script>

<h1>Live mode</h1>
<p class="mode">LIVE · gated</p>
<p>
  Live generation uses <code>KreaGenerationProvider</code> against
  <code>POST /generate/image/krea/krea-2/medium</code> and
  <code>POST /generate/video/kling/kling-2.5</code>. Tokens stay on the server.
</p>
<ul>
  <li>API key configured: {data.liveConfigured ? 'yes' : 'no'}</li>
  <li>Postgres URL: {data.hasDatabase ? 'yes' : 'no (in-memory ledger)'}</li>
</ul>
{#if !data.liveConfigured}
  <p>
    Set <code>KREA_API_KEY</code> and confirm USD API balance at
    <a href="https://www.krea.ai/app/api/">krea.ai/app/api</a>
    (separate from app compute units). Until then, use
    <a href="/replay">replay</a>.
  </p>
{:else}
  <p>
    Key is present. Public replay remains the default demo so reviewers never spend your balance by accident.
    Trigger a recorded run from a private session, then replace fixture stills with the permitted outputs.
  </p>
{/if}

<style>
  .mode { font-family: var(--mono); color: var(--coral); }
</style>
