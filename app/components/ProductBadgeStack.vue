<script setup lang="ts">
const props = withDefaults(defineProps<{
  badges?: string[] | null
  size?: 'card' | 'detail'
}>(), {
  badges: () => [],
  size: 'card',
})

const visibleBadges = computed(() => (props.badges ?? [])
  .map(badge => String(badge || '').trim())
  .filter(Boolean)
  .slice(0, 4),
)
</script>

<template>
  <div
    v-if="visibleBadges.length"
    class="pointer-events-none flex max-w-[72%] flex-col items-start gap-1.5"
    aria-label="Product labels"
  >
    <span
      v-for="badge in visibleBadges"
      :key="badge"
      class="inline-flex max-w-full items-center rounded-full border border-paper-50/70 bg-paper-50/94 font-semibold tracking-[0.035em] text-charcoal-950 shadow-[0_8px_24px_rgb(0_0_0/0.10)] backdrop-blur-md"
      :class="size === 'detail'
        ? 'min-h-7 px-3 py-1.5 text-[10px] sm:text-[11px]'
        : 'min-h-6 px-2.5 py-1 text-[9px] sm:text-[10px]'"
    >
      <span class="truncate">{{ badge }}</span>
    </span>
  </div>
</template>
