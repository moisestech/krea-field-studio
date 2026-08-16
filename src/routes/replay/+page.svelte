<script lang="ts">
  import StudioWizard from '$lib/components/StudioWizard.svelte';
  let { data } = $props();
</script>

{#if data.snap}
  <StudioWizard initial={data.snap} />
{/if}
