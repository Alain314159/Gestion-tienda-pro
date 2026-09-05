<script module></script>

<script>
  const { children, onRefresh } = $props();
  let startY = 0;
  let pulling = $state(false);
  let pullDist = $state(0);
  const threshold = 80;
  function handleTouchStart(e) {
    startY = e.touches[0].clientY;
    pulling = false;
    pullDist = 0;
  }
  function handleTouchMove(e) {
    const y = e.touches[0].clientY;
    const dist = y - startY;
    if (dist > 0 && window.scrollY <= 0) {
      e.preventDefault();
      pulling = true;
      pullDist = Math.min(dist * 0.5, threshold + 20);
    }
  }
  function handleTouchEnd() {
    if (pulling && pullDist >= threshold) {
      onRefresh?.();
    }
    pulling = false;
    pullDist = 0;
  }
</script>

<div
  class="relative"
  role="region"
  aria-label="Pull to refresh"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <div
    class="absolute left-0 right-0 top-0 z-50 flex items-center justify-center overflow-hidden transition-all duration-300"
    style="height: {pullDist}px; opacity: {pulling ? 1 : 0};"
  >
    <div class="flex flex-col items-center gap-1">
      <div
        class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
        style="transform: rotate({Math.min(pullDist / threshold, 1) * 360}deg)"
      ></div>
      <span class="text-xs text-muted font-bold">Suelta para recargar</span>
    </div>
  </div>
  {@render children()}
</div>
