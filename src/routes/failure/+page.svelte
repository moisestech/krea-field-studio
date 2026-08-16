<script lang="ts">
  import StudioWizard from '$lib/components/StudioWizard.svelte';
  let { data } = $props();
</script>

<p>Mock failure includes a failed job, cancelable queued work, and duplicate webhook handling — no live spend.</p>

{#if data.snap}
  <StudioWizard initial={data.snap} />
{/if}
