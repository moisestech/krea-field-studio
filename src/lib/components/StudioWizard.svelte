<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { ProjectSnapshot } from '$lib/domain/types';
  import { ARTWORK_ALT, LANE_COPY, UNOFFICIAL } from '$lib/fixtures/constants';
  import { uiGroupFor } from '$lib/domain/types';

  type Step = 'brief' | 'plan' | 'approve' | 'jobs' | 'compare' | 'refine' | 'proposal' | 'note';
  let { initial }: { initial: ProjectSnapshot } = $props();
  let snap = $state(initial);
  let step = $state<Step>('brief');
  let busy = $state(false);
  let errorMsg = $state('');
  let selectedIndex = $state(0);
  let noteFriction = $state('');
  let polling = false;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  const id = $derived(snap.project.id);
  const mode = $derived(snap.project.mode.toUpperCase());
  const initialDirs = $derived(snap.directions.filter((d) => !d.id.includes('refine') && d.id !== 'dir-motion'));
  const generated = $derived(initialDirs.filter((d) => ['generated', 'selected', 'rejected'].includes(d.status)));

  onDestroy(() => {
    polling = false;
    if (pollTimer) clearTimeout(pollTimer);
  });

  async function api(path: string, body?: unknown): Promise<boolean> {
    busy = true;
    errorMsg = '';
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}'
      });
      if (!res.ok) throw new Error(await res.text());
      snap = await res.json();
      return true;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : 'Request failed';
      return false;
    } finally {
      busy = false;
    }
  }

  function delay(ms: number) {
    return new Promise<void>((resolve) => {
      pollTimer = setTimeout(resolve, ms);
    });
  }

  async function pollUntil(done: () => boolean, next: Step) {
    polling = true;
    while (polling) {
      await delay(2000);
      if (!polling) return;
      if (!(await api('/api/projects/' + id + '/poll'))) {
        polling = false;
        return;
      }
      if (done()) {
        polling = false;
        step = next;
      }
    }
  }

  async function startJobs() {
    const ok = await api('/api/projects/' + id + '/approve', {
      note: 'Approved six directions across three lanes. No auto-ranking.'
    });
    if (!ok) return;
    step = 'jobs';
    void pollUntil(
      () => snap.jobs.length > 0 && snap.jobs.every((j) => ['completed', 'failed', 'cancelled'].includes(j.providerStatus)),
      'compare'
    );
  }

  function jobFor(directionId: string) {
    return snap.jobs.find((j) => j.directionId === directionId);
  }

  async function choose(directionId: string) {
    const ok = await api('/api/projects/' + id + '/select', {
      directionId,
      note: 'Human selection in compare view. No model score.'
    });
    if (ok) step = 'refine';
  }

  async function refine() {
    if (!(await api('/api/projects/' + id + '/refine'))) return;
    step = 'jobs';
    void pollUntil(() => {
      const refs = snap.directions.filter((d) => d.id.startsWith('dir-refine'));
      return refs.length > 0 && refs.every((d) => {
        const job = jobFor(d.id);
        return job && ['completed', 'failed', 'cancelled'].includes(job.providerStatus);
      });
    }, 'proposal');
  }

  async function reset() {
    polling = false;
    if (pollTimer) clearTimeout(pollTimer);
    if (await api('/api/projects/' + id + '/reset')) {
      selectedIndex = 0;
      noteFriction = '';
      step = 'brief';
    }
  }

  async function saveNote() {
    if (!noteFriction.trim()) {
      errorMsg = 'Write an observed friction point before exporting.';
      return;
    }
    const ok = await api('/api/projects/' + id + '/note', {
      clientGoal: snap.brief.goal,
      workflowObserved: 'Brief → three lanes → approval → six jobs → compare → refine → proposal.',
      workedWell: [
        'Lane labels made the six stills scannable.',
        'Exact provider states stayed visible next to grouped UI labels.'
      ],
      friction: [noteFriction.trim()],
      failureReproduction: ['Choose Material Transformation → submit two variants → compare.'],
      productOpportunity: ['Carry preservation constraints into comparison annotations.'],
      evidenceLinks: ['/trace/' + id, '/proposal/' + id],
      author: 'Moises Sanabria'
    });
    if (ok) step = 'note';
  }

  function onKey(e: KeyboardEvent) {
    if (step !== 'compare') return;
    if (e.key === 'ArrowRight') selectedIndex = Math.min(generated.length - 1, selectedIndex + 1);
    if (e.key === 'ArrowLeft') selectedIndex = Math.max(0, selectedIndex - 1);
    if (e.key === 'Enter' && generated[selectedIndex]) void choose(generated[selectedIndex].id);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="statusbar">
  <div>
    <p class="mode" data-mode={snap.project.mode}>{mode}</p>
    <p class="unofficial">{UNOFFICIAL}</p>
  </div>
  <button class="reset" disabled={busy} onclick={reset}>Reset this replay</button>
</div>
{#if errorMsg}<p class="err" role="alert">{errorMsg}</p>{/if}

<ol class="steps" aria-label="Workflow progress">
  {#each ['brief', 'plan', 'approve', 'jobs', 'compare', 'refine', 'proposal', 'note'] as s}
    <li class:on={step === s}>{s}</li>
  {/each}
</ol>

{#if step === 'brief'}
  <section>
    <h1>{snap.project.title}</h1>
    <p class="lede">{snap.brief.goal}</p>
    <div class="pair">
      <figure>
        <img src={snap.assets.find((a) => a.kind === 'site')?.url} alt="Synthetic white-cube gallery drawing" />
        <figcaption>Site · synthetic · not a survey</figcaption>
      </figure>
      <figure>
        <img src={snap.assets.find((a) => a.kind === 'artwork')?.url} alt={ARTWORK_ALT} />
        <figcaption>Artwork · artist-owned documentation</figcaption>
      </figure>
    </div>
    <h2>Must preserve</h2>
    <ul>{#each snap.brief.mustPreserve as item}<li>{item}</li>{/each}</ul>
    <h2>May change</h2>
    <ul>{#each snap.brief.mayChange as item}<li>{item}</li>{/each}</ul>
    <button class="primary" onclick={() => (step = 'plan')}>Map three creative lanes</button>
  </section>
{/if}

{#if step === 'plan'}
  <section>
    <h1>Three lanes, two candidates each</h1>
    <p>Lanes are a working method for this brief — not universal aesthetic truth.</p>
    <div class="lanes">
      {#each Object.entries(LANE_COPY) as [key, copy]}
        <article>
          <h2>{copy.title}</h2>
          <p>{copy.why}</p>
          <p class="not">{copy.not}</p>
          <ol>
            {#each initialDirs.filter((d) => d.lane === key) as d}
              <li><strong>{d.label}</strong><span class="mono">{d.modelId}</span><p>{d.prompt}</p></li>
            {/each}
          </ol>
        </article>
      {/each}
    </div>
    <p class="mono">Estimated requests: 6 stills · optional 3 refinements · optional 1×5s motion</p>
    <button class="primary" onclick={() => (step = 'approve')}>Review generation plan</button>
  </section>
{/if}

{#if step === 'approve'}
  <section>
    <h1>Approval gate</h1>
    <p>No generation before an explicit human yes. Replay spends no credits. Public live execution is intentionally unavailable.</p>
    <dl class="payload">
      <dt>Model contract</dt><dd class="mono">image/krea/krea-2/medium</dd>
      <dt>Requests</dt><dd>6 image jobs</dd>
      <dt>Aspect / resolution</dt><dd class="mono">16:9 · 1K</dd>
      <dt>Mode</dt><dd>{mode}</dd>
    </dl>
    <button class="primary" disabled={busy} onclick={startJobs}>Approve plan and run jobs</button>
  </section>
{/if}

{#if step === 'jobs'}
  <section>
    <h1>Generation jobs</h1>
    <p>Grouped for scanning; exact provider states stay inspectable. Polling is serial and stops at terminal states.</p>
    <ul class="jobs">
      {#each snap.jobs as job}
        {@const dir = snap.directions.find((d) => d.id === job.directionId)}
        <li>
          <header><strong>{dir?.label ?? job.directionId}</strong><span class="pill">{uiGroupFor(job.providerStatus)}</span><code>{job.providerStatus}</code></header>
          <p class="mono">{job.providerJobId} · attempt {job.attempt}</p>
          {#if job.errorMessage}<p class="err">{job.errorMessage}</p>{/if}
          {#if job.providerStatus === 'queued' || job.providerStatus === 'processing'}
            <button onclick={() => api('/api/projects/' + id + '/jobs/' + job.id + '/cancel')}>Cancel</button>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if step === 'compare'}
  <section>
    <h1>Compare</h1>
    <p>Arrow keys move. Enter selects. No automated taste ranking.</p>
    <div class="sheet" role="listbox" aria-label="Direction contact sheet">
      {#each generated as d, i}
        {@const job = jobFor(d.id)}
        <button class="tile" class:sel={i === selectedIndex} role="option" aria-selected={i === selectedIndex} onclick={() => (selectedIndex = i)} ondblclick={() => choose(d.id)}>
          <img src={job?.resultUrls[0] ?? '/fixtures/site-gallery.svg'} alt={d.label} />
          <span>{d.label}</span><code>{job?.providerStatus}</code>
        </button>
      {/each}
    </div>
    {#if generated[selectedIndex]}
      <button class="primary" onclick={() => choose(generated[selectedIndex].id)}>Approve {generated[selectedIndex].label}</button>
    {/if}
  </section>
{/if}

{#if step === 'refine'}
  <section>
    <h1>Refine the approved still</h1>
    <p>Up to three bounded variants. Operator writes the change; the model does not pick a winner.</p>
    <button class="primary" disabled={busy} onclick={refine}>Generate three refinements</button>
    <button class="ghost" disabled={busy} onclick={() => api('/api/projects/' + id + '/motion', { approved: true })}>Approve one 5s motion study</button>
    <button class="ghost" onclick={() => (step = 'proposal')}>Skip to proposal</button>
  </section>
{/if}

{#if step === 'proposal'}
  <section>
    <h1>Proposal board</h1>
    <p class="warn">Creative previsualization, not spatial validation. Not CAD, scale, structural, or permitting evidence.</p>
    <p><a href="/proposal/{id}">Open printable proposal</a> · <a href="/trace/{id}">Run trace</a></p>
    <button class="primary" onclick={() => (step = 'note')}>Write product field note</button>
  </section>
{/if}

{#if step === 'note'}
  <section>
    <h1>Operator field note</h1>
    <p>Written by a person. Not auto-generated customer truth.</p>
    <label>Observed friction
      <textarea bind:value={noteFriction} rows="4" placeholder="Record something you actually observed during this run."></textarea>
    </label>
    <button class="primary" disabled={!noteFriction.trim() || busy} onclick={saveNote}>Save field note and export</button>
    {#if snap.fieldNote}<p class="ok">Saved. Status: {snap.project.status}</p>{/if}
  </section>
{/if}

<style>
  .statusbar { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
  .mode { font-family: var(--mono); letter-spacing: 0.12em; color: var(--coral); margin: 0 0 0.25rem; }
  .unofficial { color: #555; font-size: 0.9rem; }
  .reset { background: transparent; border: 1px solid var(--line); padding: 0.45rem 0.65rem; }
  .err { color: #9b1c1c; }
  .ok { background: var(--mint); padding: 0.5rem 0.75rem; }
  .lede { font-size: 1.15rem; max-width: 44rem; }
  .steps { display: flex; flex-wrap: wrap; gap: 0.4rem; list-style: none; padding: 0; }
  .steps li { border: 1px solid var(--line); padding: 0.25rem 0.55rem; text-transform: capitalize; }
  .steps li.on { background: var(--ink); color: var(--paper); }
  .pair, .lanes, .sheet { display: grid; gap: 1rem; }
  .pair { grid-template-columns: 1fr 1fr; }
  .lanes, .sheet { grid-template-columns: repeat(3, 1fr); }
  img { width: 100%; height: auto; display: block; background: #ddd; }
  figure { margin: 0; }
  figcaption, .not, .mono { font-family: var(--mono); font-size: 0.78rem; }
  .primary, .ghost { margin-top: 1rem; margin-right: 0.5rem; padding: 0.7rem 1rem; border: 1px solid var(--ink); }
  .primary { background: var(--ink); color: var(--paper); }
  .ghost { background: transparent; }
  .jobs { list-style: none; padding: 0; display: grid; gap: 0.75rem; }
  .jobs li { border: 1px solid var(--line); padding: 0.75rem; }
  .pill { background: var(--blue); padding: 0.1rem 0.4rem; margin: 0 0.4rem; font-size: 0.75rem; }
  .tile { border: 1px solid var(--line); background: transparent; padding: 0; text-align: left; }
  .tile.sel { outline: 3px solid var(--coral); }
  .tile span, .tile code { display: block; padding: 0.35rem 0.5rem 0; }
  .payload { display: grid; grid-template-columns: 10rem 1fr; gap: 0.35rem 1rem; }
  .warn { background: #fff3; border-left: 3px solid var(--coral); padding: 0.6rem 0.8rem; }
  textarea { width: 100%; font: inherit; background: white; border: 1px solid var(--line); }
  @media (max-width: 800px) {
    .pair, .lanes, .sheet { grid-template-columns: 1fr; }
    .statusbar { display: block; }
  }
</style>
