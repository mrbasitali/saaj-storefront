<script setup lang="ts">
export type PriceChange = {
  previous_total: number
  removed_item: number
  added_item: number
  coupon_adjustment?: number
  other_adjustments: number
}

defineProps<{ change: PriceChange; total: number; shipping?: number }>()

function money(value: number) {
  return `Rs ${Number(value).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<template>
  <div>
    <dl class="space-y-2 bg-paper-100 p-4 text-sm sm:p-5">
      <div class="flex justify-between gap-4"><dt>Previous order total</dt><dd class="shrink-0 tabular-nums">{{ money(change.previous_total) }}</dd></div>
      <div class="flex justify-between gap-4"><dt>Removed item</dt><dd class="shrink-0 tabular-nums">−{{ money(change.removed_item) }}</dd></div>
      <div class="flex justify-between gap-4"><dt>Replacement item</dt><dd class="shrink-0 tabular-nums">+{{ money(change.added_item) }}</dd></div>
      <div v-if="change.coupon_adjustment" class="flex justify-between gap-4">
        <dt>{{ change.coupon_adjustment < 0 ? 'Coupon discount' : 'Coupon adjustment' }}</dt>
        <dd class="shrink-0 tabular-nums">{{ change.coupon_adjustment < 0 ? '−' : '+' }}{{ money(Math.abs(change.coupon_adjustment)) }}</dd>
      </div>
      <div v-if="change.other_adjustments" class="flex justify-between gap-4">
        <dt>Other adjustments</dt>
        <dd class="shrink-0 tabular-nums">{{ change.other_adjustments < 0 ? '−' : '+' }}{{ money(Math.abs(change.other_adjustments)) }}</dd>
      </div>
      <div class="mt-3 flex justify-between gap-4 border-t border-charcoal-950/15 pt-3 text-base font-semibold">
        <dt>Updated cash-on-delivery total</dt>
        <dd class="shrink-0 tabular-nums">{{ money(total) }}</dd>
      </div>
    </dl>
    <p v-if="shipping !== undefined" class="mt-3 text-sm text-charcoal-700">Includes your existing delivery charge of {{ money(shipping) }}.</p>
  </div>
</template>
