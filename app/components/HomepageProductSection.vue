<script setup lang="ts">
type ProductImage = {
  id?: number
  image_url?: string | null
  optimized_urls?: { card?: string | null } | null
  alt_text?: string | null
  is_primary?: boolean
}

type HomepageProduct = {
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

type ProductSection = {
  id: number
  eyebrow?: string | null
  title: string
  description?: string | null
  cta_label?: string | null
  cta_url?: string | null
  layout: 'grid' | 'rail'
  tone: 'light' | 'soft' | 'dark'
  products: HomepageProduct[]
}

const props = defineProps<{
  section: ProductSection
}>()

const isDark = computed(() => props.section.tone === 'dark')
const sectionClass = computed(() => ({
  'bg-paper-50': props.section.tone === 'light',
  'bg-[#edf0eb]': props.section.tone === 'soft',
  'bg-[#20231f] text-[#f7f6f2]': isDark.value,
}))
</script>

<template>
  <section
    v-if="section.products.length"
    class="home-product-story"
    :class="sectionClass"
  >
    <div class="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div
        class="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b pb-4 sm:pb-5"
        :class="isDark ? 'border-white/20' : 'border-charcoal-950/15'"
      >
        <div class="max-w-3xl">
          <p v-if="section.eyebrow" class="mb-2 text-[11px] font-medium tracking-wide" :class="isDark ? 'text-white/70' : 'text-charcoal-600'">
            {{ section.eyebrow }}
          </p>
          <h2 class="font-display text-[clamp(2.15rem,3.65vw,3.75rem)] font-medium leading-none tracking-[-0.035em]">
            {{ section.title }}
          </h2>
          <p v-if="section.description" class="mt-2 max-w-xl text-sm leading-6" :class="isDark ? 'text-white/58' : 'text-charcoal-500'">
            {{ section.description }}
          </p>
        </div>

        <NuxtLink
          v-if="section.cta_label && section.cta_url"
          :to="section.cta_url"
          class="group home-inline-action min-h-11 shrink-0"
          :class="isDark ? 'home-product-action-dark focus-visible:outline-white' : ''"
        >
          <span>{{ section.cta_label }}</span>
          <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
        </NuxtLink>
      </div>

      <div
        v-if="section.layout === 'grid'"
        class="mt-5 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-6 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14"
      >
        <div v-for="product in section.products" :key="product.id" :class="isDark ? 'rounded-[2px] bg-paper-50 p-2 pb-4 sm:p-3 sm:pb-5' : ''">
          <ProductCard :product="product" />
        </div>
      </div>

      <div
        v-else
        class="home-product-rail mt-5 grid grid-flow-col auto-cols-[46%] gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] sm:mt-6 sm:auto-cols-[31%] sm:gap-4 lg:auto-cols-[23%] lg:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        <div
          v-for="product in section.products"
          :key="product.id"
          class="min-w-0 snap-start"
          :class="isDark ? 'rounded-[2px] bg-paper-50 p-2 pb-4 sm:p-3 sm:pb-5' : ''"
        >
          <ProductCard :product="product" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-product-action-dark {
  color: rgb(255 255 255 / 0.82);
}

.home-product-action-dark:hover {
  color: white;
}

.home-product-rail {
  scroll-snap-type: x proximity;
}
</style>
