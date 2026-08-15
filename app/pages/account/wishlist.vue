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

const { data, refresh } = await useAsyncData('account-wishlist', () =>
  $api<{ data: WishlistEntry[] }>('/customer/wishlist'),
)

const entries = computed(() => data.value?.data ?? [])
const removingId = ref<number | null>(null)

async function remove(productId: number) {
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
    <h2 class="text-lg font-semibold text-ink-900">
      Wishlist
    </h2>

    <p
      v-if="entries.length === 0"
      class="mt-6 text-sm text-ink-500"
    >
      Nothing saved yet.
      <NuxtLink
        to="/shop"
        class="text-ink-900 underline decoration-stone-300 underline-offset-4"
      >
        Browse products
      </NuxtLink>
    </p>

    <div
      v-else
      class="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3"
    >
      <div
        v-for="entry in entries"
        :key="entry.product.id"
        class="relative"
      >
        <ProductCard :product="entry.product" />

        <button
          type="button"
          :disabled="removingId === entry.product.id"
          class="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-ink-700 shadow-sm transition hover:text-red-600"
          aria-label="Remove from wishlist"
          @click="remove(entry.product.id)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
