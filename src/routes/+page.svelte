<script lang="ts">
  const loopFrames = [
    'Brief + owned assets',
    'Three lanes',
    'Human approval',
    'Async Krea states',
    'Compare, no auto-rank',
    'Proposal + field note'
  ];
</script>

<section class="hero">
  <p class="kicker">UNOFFICIAL PROOF OF WORK</p>
  <h1>Client brief to approved proposal — with the human still in charge.</h1>
  <p class="lede">
    An unofficial Krea-powered field workflow: map three creative lanes, approve the spend,
    watch real job states, compare, refine, export a board, and write a product field note.
  </p>
  <div class="loop" aria-hidden="true">
    {#each loopFrames as frame, i}
      <span style="animation-delay: {i * 0.45}s">{frame}</span>
    {/each}
  </div>
  <p>
    <a class="primary" href="/replay">Run the 90-second replay</a>
    <a class="ghost" href="/failure">Inspect failure mode</a>
  </p>
</section>

<section>
  <h2>What this proves for Krea Creative Lead</h2>
  <ul>
    <li>Enterprise-shaped demo: brief, constraints, approval, comparison, handoff.</li>
    <li>Async generation made legible — exact Krea states, not a spinner.</li>
    <li>Taste stays with the reviewer. No fake AI score.</li>
    <li>Field learning returns as a structured product note, not a vibe.</li>
  </ul>
</section>

<section>
  <h2>Status</h2>
  <table>
    <tbody>
      <tr><th>Replay golden path</th><td>Live in this repo</td></tr>
      <tr><th>Mock failure / cancel / duplicate webhook</th><td>Live</td></tr>
      <tr><th>Krea API provider</th><td>Implemented, gated on server key + API balance</td></tr>
      <tr><th>Recorded live run</th><td>Planned until API balance is confirmed</td></tr>
    </tbody>
  </table>
</section>

<style>
  .hero { padding: 1rem 0 2rem; }
  .kicker { font-family: var(--mono); color: var(--coral); letter-spacing: 0.08em; }
  h1 { font-family: var(--serif); font-size: clamp(2rem, 5vw, 3.4rem); font-weight: 400; max-width: 18ch; }
  .lede { max-width: 40rem; font-size: 1.1rem; }
  .loop { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.5rem 0; }
  .loop span {
    font-family: var(--mono);
    font-size: 0.78rem;
    border: 1px solid var(--line);
    padding: 0.25rem 0.5rem;
    animation: pulse 2.8s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { background: transparent; }
    30% { background: var(--mint); }
  }
  .primary, .ghost {
    display: inline-block;
    padding: 0.75rem 1.1rem;
    margin-right: 0.6rem;
    text-decoration: none;
    border: 1px solid var(--ink);
  }
  .primary { background: var(--ink); color: var(--paper); }
  table { border-collapse: collapse; }
  th, td { text-align: left; padding: 0.4rem 1rem 0.4rem 0; border-bottom: 1px solid var(--line); }
</style>
