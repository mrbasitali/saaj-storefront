<script setup lang="ts">
type Product = {
  id: number
  name: string
  slug: string
  brand?: { name: string } | null
  primary_image?: {
    optimized_urls?: { card?: string | null } | null
    alt_text?: string | null
  } | null
  default_variant?: {
    price: string | number
    sale_price: string | number | null
    compare_at_price: string | number | null
  } | null
  active_variants?: Array<{
    price: string | number
    sale_price: string | number | null
    compare_at_price: string | number | null
  }> | null
}

const props = defineProps<{
  product: Product
}>()

const imageUrl = computed(() => props.product.primary_image?.optimized_urls?.card ?? null)

const priceVariant = computed(() =>
  props.product.default_variant ?? props.product.active_variants?.[0] ?? null,
)

const displayPrice = computed(() => {
  const variant = priceVariant.value

  if (!variant) return null

  return variant.sale_price ?? variant.price
})

const isOnSale = computed(() => {
  const variant = priceVariant.value

  return !!(variant?.sale_price && Number(variant.sale_price) < Number(variant.price))
})

const originalPrice = computed(() => priceVariant.value?.price ?? null)

function formatPrice(value: string | number) {
  return `Rs ${Number(value).toLocaleString()}`
}
</script>

<template>
  <NuxtLink
    :to="`/products/${product.slug}`"
    class="group block min-w-0"
  >
    <div class="relative aspect-[4/5] overflow-hidden bg-mist-100">
      <NuxtImg
        v-if="imageUrl"
        :src="imageUrl"
        :alt="product.primary_image?.alt_text || product.name"
        class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
        loading="lazy"
      />

      <div
        v-else
        class="h-full w-full bg-[linear-gradient(145deg,#e2e6e0,#f4f2ec)]"
      />

      <span
        v-if="isOnSale"
        class="absolute left-3 top-3 bg-white/92 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-950 backdrop-blur"
      >
        Sale
      </span>

      <div class="absolute inset-x-0 bottom-0 translate-y-full bg-white/94 px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal-950 backdrop-blur transition duration-300 group-hover:translate-y-0 max-lg:hidden">
        View piece
      </div>
    </div>

    <div class="pt-3.5 sm:pt-4">
      <p
        v-if="product.brand?.name"
        class="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400"
      >
        {{ product.brand.name }}
      </p>

      <p class="truncate text-[13px] font-medium leading-5 text-charcoal-950 sm:text-[14px]">
        {{ product.name }}
      </p>

      <p
        v-if="displayPrice !== null"
        class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-[13px]"
      >
        <span :class="isOnSale ? 'font-medium text-charcoal-950' : 'text-charcoal-600'">
          {{ formatPrice(displayPrice) }}
        </span>
        <span
          v-if="isOnSale"
          class="text-charcoal-350 line-through"
        >
          {{ originalPrice !== null ? formatPrice(originalPrice) : '' }}
        </span>
      </p>
    </div>
  </NuxtLink>
</template>
