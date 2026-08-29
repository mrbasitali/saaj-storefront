<script setup lang="ts">
import type { PriceValue } from '~/utils/productPricing'
import { formatStorefrontPrice, resolveProductPricing } from '~/utils/productPricing'

const props = withDefaults(defineProps<{
  originalPrice: PriceValue
  salePrice?: PriceValue
  size?: 'card' | 'detail' | 'compact'
  showSavings?: boolean
}>(), {
  salePrice: null,
  size: 'card',
  showSavings: true,
})

const pricing = computed(() => resolveProductPricing(props.originalPrice, props.salePrice))

const currentPriceClass = computed(() => ({
  card: 'text-[12px] font-semibold sm:text-[13px]',
  detail: 'font-display text-[30px] font-semibold leading-none tracking-[-0.03em] sm:text-[34px]',
  compact: 'text-[11px] font-semibold',
}[props.size]))

const originalPriceClass = computed(() => ({
  card: 'text-[11px] sm:text-[12px]',
  detail: 'text-[13px] sm:text-[14px]',
  compact: 'text-[10px]',
}[props.size]))

const accessibleLabel = computed(() => {
  if (pricing.value.currentPrice === null) return ''
  if (!pricing.value.isOnSale) return `Price ${formatStorefrontPrice(pricing.value.currentPrice)}`

  return [
    `Sale price ${formatStorefrontPrice(pricing.value.currentPrice)}.`,
    `Original price ${formatStorefrontPrice(pricing.value.originalPrice)}.`,
    `Save ${pricing.value.discountPercentage} percent.`,
  ].join(' ')
})
</script>

<template>
  <div
    v-if="pricing.currentPrice !== null"
    class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
  >
    <span class="sr-only">{{ accessibleLabel }}</span>

    <span
      aria-hidden="true"
      class="tabular-nums text-charcoal-950"
      :class="currentPriceClass"
    >
      {{ formatStorefrontPrice(pricing.currentPrice) }}
    </span>

    <s
      v-if="pricing.isOnSale"
      aria-hidden="true"
      class="tabular-nums text-charcoal-400 decoration-charcoal-400/75 decoration-1"
      :class="originalPriceClass"
    >
      {{ formatStorefrontPrice(pricing.originalPrice) }}
    </s>

    <span
      v-if="pricing.isOnSale && showSavings"
      aria-hidden="true"
      class="rounded-full bg-charcoal-950 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-paper-50"
    >
      Save {{ pricing.discountPercentage }}%
    </span>
  </div>
</template>
