<script setup lang="ts">
const props = withDefaults(defineProps<{
  badges?: string[] | null
  size?: 'card' | 'detail'
}>(), {
  badges: () => [],
  size: 'card',
})

const siteSettings = useSiteSettingsStore()
const visibility = computed(() => props.size === 'card'
  ? (siteSettings.settings?.storefront?.product_card_badge_visibility ?? 'always')
  : 'always',
)

const visibleBadges = computed(() => (props.badges ?? [])
  .map(badge => String(badge || '').trim())
  .filter(Boolean)
  .slice(0, 4),
)
</script>

<template>
  <div
    v-if="visibleBadges.length && visibility !== 'hidden'"
    class="pointer-events-none flex max-w-[72%] flex-col items-start gap-1.5"
    :class="[
      size === 'card' && 'max-sm:flex-row max-sm:flex-wrap max-sm:justify-end max-sm:gap-1',
      visibility === 'hover' && '[@media(hover:hover)]:invisible [@media(hover:hover)]:group-hover:visible [@media(hover:hover)]:group-focus-within:visible',
    ]"
    aria-label="Product labels"
  >
    <span
      v-for="badge in visibleBadges"
      :key="badge"
      class="inline-flex max-w-full items-center rounded-full border border-paper-50/70 bg-paper-50/94 font-semibold tracking-[0.035em] text-charcoal-950 shadow-[0_8px_24px_rgb(0_0_0/0.10)] backdrop-blur-md"
      :class="size === 'detail'
        ? 'min-h-7 px-3 py-1.5 text-[10px] sm:text-[11px]'
        : 'min-h-[18px] px-1.5 py-0.5 text-[9px] leading-3 sm:min-h-6 sm:px-2.5 sm:py-1 sm:text-[10px] sm:leading-normal'"
    >
      <span class="truncate">{{ badge }}</span>
    </span>
  </div>
</template>
