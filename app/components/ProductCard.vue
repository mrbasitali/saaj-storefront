<script setup lang="ts">
import { resolveProductPricing } from '~/utils/productPricing'

type ProductImage = {
  id?: number
  image_url?: string | null
  optimized_urls?: { card?: string | null } | null
  alt_text?: string | null
  is_primary?: boolean
}

type Product = {
  id: number
  name: string
  slug: string
  brand?: { name: string } | null
  is_available?: boolean
  primary_image?: ProductImage | null
  images?: ProductImage[] | null
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

const primaryUrl = computed(() =>
  props.product.primary_image?.optimized_urls?.card
  ?? props.product.primary_image?.image_url
  ?? props.product.images?.[0]?.optimized_urls?.card
  ?? props.product.images?.[0]?.image_url
  ?? null,
)

const secondaryImage = computed(() => {
  const primaryId = props.product.primary_image?.id

  return (props.product.images ?? []).find((image) => {
    const url = image.optimized_urls?.card ?? image.image_url
    if (!url) return false
    if (primaryId && image.id === primaryId) return false
    return url !== primaryUrl.value
  }) ?? null
})

const secondaryUrl = computed(() =>
  secondaryImage.value?.optimized_urls?.card ?? secondaryImage.value?.image_url ?? null,
)

const priceVariant = computed(() =>
  props.product.default_variant ?? props.product.active_variants?.[0] ?? null,
)

const pricing = computed(() => {
  const variant = priceVariant.value
  return resolveProductPricing(variant?.price, variant?.sale_price)
})

const isOnSale = computed(() => pricing.value.isOnSale)
const discountPercentage = computed(() => pricing.value.discountPercentage)
const isSoldOut = computed(() => props.product.is_available === false)
</script>

<template>
  <article class="product-card group min-w-0">
    <NuxtLink
      :to="`/products/${product.slug}`"
      class="block"
    >
      <div class="product-card-media relative aspect-[4/5] overflow-hidden bg-mist-100">
        <template v-if="primaryUrl">
          <NuxtImg
            :src="primaryUrl"
            :alt="product.primary_image?.alt_text || product.name"
            class="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.018]"
            loading="lazy"
          />

          <NuxtImg
            v-if="secondaryUrl"
            :src="secondaryUrl"
            :alt="secondaryImage?.alt_text || product.name"
            class="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 ease-out group-hover:opacity-100 max-lg:hidden"
            loading="lazy"
          />
        </template>

        <div
          v-else
          class="h-full w-full bg-[linear-gradient(145deg,var(--color-mist-100),var(--color-paper-100))]"
        />

        <div
          v-if="isSoldOut"
          class="product-card-soldout-overlay pointer-events-none absolute inset-0 z-[1]"
        />

        <span
          v-if="isSoldOut"
          class="product-sold-out-badge absolute left-3 top-3 z-[2]"
        >
          <span class="product-sold-out-dot" aria-hidden="true" />
          <span>Sold out</span>
        </span>

        <span
          v-else-if="isOnSale"
          aria-hidden="true"
          class="absolute left-3 top-3 z-[2] rounded-full bg-charcoal-950/94 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-50 shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop-blur-md"
        >
          Save {{ discountPercentage }}%
        </span>

        <div class="product-card-view absolute inset-x-0 bottom-0 z-[2] translate-y-full bg-paper-50/94 px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal-950 backdrop-blur transition duration-300 group-hover:translate-y-0 max-lg:hidden">
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

        <div class="flex items-start justify-between gap-3">
          <p class="min-w-0 truncate text-[13px] font-medium leading-5 text-charcoal-950 sm:text-[14px]">
            {{ product.name }}
          </p>

          <svg
            class="mt-1 h-3.5 w-3.5 shrink-0 -translate-x-1 text-charcoal-400 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 max-lg:hidden"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
          >
            <path d="M4 10h11M11 6l4 4-4 4" />
          </svg>
        </div>

        <ProductPrice
          v-if="priceVariant"
          class="mt-1.5"
          :original-price="priceVariant.price"
          :sale-price="priceVariant.sale_price"
          size="card"
          :show-savings="false"
        />
      </div>
    </NuxtLink>
  </article>
</template>
