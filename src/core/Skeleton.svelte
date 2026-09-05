<script module></script>

<script>
  const { filas = 3, tipo = 'lista' } = $props();
</script>

{#if tipo === 'lista'}{#each Array(filas) as _, i}<div
      class="flex items-center gap-3 py-3 border-b border-border/50 animate-pulse"
    >
      <div class="w-10 h-10 rounded-lg bg-muted/30 flex-shrink-0"></div>
      <div class="flex-1 space-y-2">
        <div class="h-3.5 bg-muted/30 rounded w-3/4"></div>
        <div class="h-2.5 bg-muted/20 rounded w-1/2"></div>
      </div>
    </div>{/each}{:else if tipo === 'card'}{#each Array(filas) as _, i}<div
      class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4 animate-pulse"
    >
      <div class="h-4 bg-muted/30 rounded w-1/3 mb-4"></div>
      <div class="space-y-3">
        <div class="h-3 bg-muted/20 rounded w-full"></div>
        <div class="h-3 bg-muted/20 rounded w-5/6"></div>
        <div class="h-3 bg-muted/20 rounded w-4/6"></div>
      </div>
    </div>{/each}{:else if tipo === 'chart'}<div
    class="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--color-shadow)] mb-4 animate-pulse"
  >
    <div class="h-4 bg-muted/30 rounded w-1/4 mb-4"></div>
    <div class="h-[160px] bg-muted/20 rounded-[var(--radius-md)]"></div>
  </div>{/if}
