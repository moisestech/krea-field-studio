<script lang="ts">
  import { UNOFFICIAL } from '$lib/fixtures/constants';
  let { children } = $props();
</script>

<svelte:head>
  <title>Krea Field Studio — unofficial proof of work</title>
  <meta name="description" content="Unofficial Krea-powered field workflow: brief to approved proposal and product field note. Not affiliated with Krea." />
  <meta name="robots" content="index,follow" />
</svelte:head>

<div class="shell">
  <header class="top">
    <a class="mark" href="/">Krea Field Studio</a>
    <p class="badge">UNOFFICIAL PROOF OF WORK</p>
    <nav>
      <a href="/replay">Replay</a>
      <a href="/failure">Failure mode</a>
      <a href="/live">Live</a>
      <a href="/replay/proposal">Proposal</a>
      <a href="/replay/trace">Run trace</a>
    </nav>
  </header>
  {@render children()}
  <footer>
    <p>{UNOFFICIAL}</p>
    <p>Creative previsualization, not spatial validation. No CAD, scale, or permitting claims.</p>
  </footer>
</div>

<style>
  .shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 1.25rem 1.5rem 4rem;
  }
  .top {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem 1rem;
    align-items: baseline;
    border-bottom: 1px solid var(--line);
    padding-bottom: 1rem;
    margin-bottom: 2rem;
  }
  .mark {
    font-family: var(--serif);
    font-size: 1.6rem;
    text-decoration: none;
  }
  .badge {
    margin: 0;
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--coral);
    grid-column: 2;
    justify-self: end;
  }
  nav {
    grid-column: 1 / -1;
    display: flex;
    gap: 1rem;
    font-size: 0.92rem;
  }
  nav a {
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  nav a:hover {
    border-bottom-color: var(--ink);
  }
  footer {
    margin-top: 4rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    font-size: 0.85rem;
    color: #444;
  }
</style>
