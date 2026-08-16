<script setup lang="ts">
type Product = {
  id: number
  name: string
  slug: string
  primary_image?: { optimized_urls?: { card?: string | null } | null } | null
  default_variant?: { price: string | number, sale_price: string | number | null } | null
}

type WishlistEntry = { product: Product, added_at: string | null }

const { $api } = useNuxtApp()

const { data, pending, refresh } = await useAsyncData('account-wishlist-v2', () =>
  $api<{ data: WishlistEntry[] }>('/customer/wishlist'),
)

const entries = computed(() => data.value?.data ?? [])
const removingId = ref<number | null>(null)

async function remove(productId: number) {
  if (removingId.value) return
  removingId.value = productId

  try {
    await $api(`/customer/wishlist/${productId}`, { method: 'DELETE' })
    await refresh()
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Saved for later</p>
        <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Wishlist</h2>
        <p class="mt-2 text-[11px] text-charcoal-500">{{ pending ? 'Loading saved pieces…' : `${entries.length} saved piece${entries.length === 1 ? '' : 's'}` }}</p>
      </div>
      <NuxtLink to="/shop" class="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Continue shopping →</NuxtLink>
    </div>

    <div v-if="pending" class="mt-7 grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="n in 4" :key="n"><div class="aspect-[4/5] animate-pulse bg-charcoal-950/[0.05]" /><div class="mt-3 h-3 w-2/3 animate-pulse bg-charcoal-950/[0.05]" /></div>
    </div>

    <div v-else-if="entries.length" class="mt-7 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="entry in entries" :key="entry.product.id" class="group relative">
        <ProductCard :product="entry.product" />
        <button
          type="button"
          :disabled="removingId === entry.product.id"
          class="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-paper-50/92 text-charcoal-950 shadow-sm backdrop-blur transition hover:bg-charcoal-950 hover:text-paper-50 disabled:opacity-45"
          :aria-label="`Remove ${entry.product.name} from wishlist`"
          @click="remove(entry.product.id)"
        >
          <svg v-if="removingId !== entry.product.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" class="h-4 w-4"><path d="m6 6 12 12M18 6 6 18" /></svg>
          <span v-else class="h-3.5 w-3.5 animate-spin rounded-full border border-current/25 border-t-current" />
        </button>
      </div>
    </div>

    <div v-else class="py-16">
      <p class="font-display text-[36px] tracking-[-0.045em] text-charcoal-950">Nothing saved yet.</p>
      <p class="mt-3 max-w-lg text-[11px] leading-5 text-charcoal-500">Use the heart on a product to keep it close while you continue exploring the collection.</p>
      <NuxtLink to="/shop" class="mt-6 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Discover the collection →</NuxtLink>
    </div>
  </div>
</template>
