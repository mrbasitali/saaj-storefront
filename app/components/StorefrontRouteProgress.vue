<script setup lang="ts">
const { progress, isLoading, error } = useLoadingIndicator({
  duration: 1800,
  throttle: 80,
})

const width = computed(() => `${Math.max(0, Math.min(100, progress.value))}%`)
</script>

<template>
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[2px] overflow-hidden"
  >
    <div
      class="h-full transition-[width,opacity] duration-150 ease-out"
      :class="[
        error ? 'bg-red-700' : 'bg-charcoal-950',
        isLoading ? 'opacity-100' : 'opacity-0',
      ]"
      :style="{ width }"
    >
      <span
        v-if="isLoading"
        class="absolute right-0 top-0 h-full w-14 translate-x-1/2 bg-current opacity-25 blur-[5px]"
      />
    </div>
  </div>
</template>
