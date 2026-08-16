<script setup lang="ts">
const props = defineProps<{
  status: string | null | undefined
}>()

const normalized = computed(() => String(props.status || 'pending').toLowerCase())

const label = computed(() => normalized.value
  .replaceAll('_', ' ')
  .replace(/\b\w/g, char => char.toUpperCase()))

const tone = computed(() => {
  if (['delivered', 'completed', 'fulfilled'].includes(normalized.value)) {
    return 'border-[#657d6c]/25 bg-[#657d6c]/[0.09] text-[#52685a]'
  }

  if (['cancelled', 'canceled', 'refunded', 'failed'].includes(normalized.value)) {
    return 'border-[#bd6f6f]/28 bg-[#bd6f6f]/[0.08] text-[#9a4f4f]'
  }

  if (['shipped', 'out_for_delivery', 'in_transit'].includes(normalized.value)) {
    return 'border-[#69829b]/25 bg-[#69829b]/[0.08] text-[#536b82]'
  }

  if (['processing', 'packed', 'ready_to_ship', 'confirmed'].includes(normalized.value)) {
    return 'border-[#b78b57]/25 bg-[#b78b57]/[0.08] text-[#89683f]'
  }

  return 'border-charcoal-950/12 bg-charcoal-950/[0.035] text-charcoal-600'
})
</script>

<template>
  <span
    class="inline-flex items-center border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.13em]"
    :class="tone"
  >
    {{ label }}
  </span>
</template>
