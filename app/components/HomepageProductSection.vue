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
  slot: 1 | 2
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
  'bg-charcoal-950 text-paper-50': isDark.value,
}))
</script>

<template>
  <section
    v-if="section.products.length"
    class="home-product-story border-y border-charcoal-950/[0.07]"
    :class="sectionClass"
  >
    <div class="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
      <div class="grid gap-6 border-b pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" :class="isDark ? 'border-white/12' : 'border-charcoal-950/[0.08]'">
        <div class="max-w-3xl">
          <div class="flex items-center gap-3">
            <span class="h-px w-8" :class="isDark ? 'bg-white/40' : 'bg-charcoal-950/35'" />
            <p class="text-[9px] font-semibold uppercase tracking-[0.2em]" :class="isDark ? 'text-white/55' : 'text-charcoal-500'">
              {{ section.eyebrow || `SAAJ edit ${String(section.slot).padStart(2, '0')}` }}
            </p>
          </div>
          <h2 class="mt-4 font-display text-[clamp(2.45rem,4vw,4.75rem)] font-medium leading-[0.92] tracking-[-0.055em]" :class="isDark ? 'text-paper-50' : 'text-charcoal-950'">
            {{ section.title }}
          </h2>
          <p v-if="section.description" class="mt-4 max-w-xl text-[13px] leading-6 sm:text-sm sm:leading-7" :class="isDark ? 'text-white/58' : 'text-charcoal-500'">
            {{ section.description }}
          </p>
        </div>

        <NuxtLink
          v-if="section.cta_label && section.cta_url"
          :to="section.cta_url"
          class="group hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] sm:inline-flex"
          :class="isDark ? 'text-white/72 hover:text-white' : 'text-charcoal-700 hover:text-charcoal-950'"
        >
          <span>{{ section.cta_label }}</span>
          <span class="flex h-9 w-9 items-center justify-center rounded-full border transition group-hover:translate-x-0.5" :class="isDark ? 'border-white/20' : 'border-charcoal-950/15'">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
          </span>
        </NuxtLink>
      </div>

      <div
        v-if="section.layout === 'grid'"
        class="mt-7 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-9 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14"
      >
        <div v-for="product in section.products" :key="product.id" :class="isDark ? 'rounded-[2px] bg-paper-50 p-2 pb-4 sm:p-3 sm:pb-5' : ''">
          <ProductCard :product="product" />
        </div>
      </div>

      <div
        v-else
        class="home-product-rail mt-7 grid grid-flow-col auto-cols-[72%] gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] sm:mt-9 sm:auto-cols-[43%] sm:gap-4 lg:auto-cols-[24%] lg:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        <div
          v-for="(product, index) in section.products"
          :key="product.id"
          class="min-w-0 snap-start"
          :class="isDark ? 'rounded-[2px] bg-paper-50 p-2 pb-4 sm:p-3 sm:pb-5' : ''"
        >
          <div class="mb-2 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.16em]" :class="isDark ? 'text-charcoal-400' : 'text-charcoal-400'">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <span>SAAJ selection</span>
          </div>
          <ProductCard :product="product" />
        </div>
      </div>

      <NuxtLink
        v-if="section.cta_label && section.cta_url"
        :to="section.cta_url"
        class="mt-8 inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] sm:hidden"
        :class="isDark ? 'text-white/75' : 'text-charcoal-800'"
      >
        <span>{{ section.cta_label }}</span>
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.home-product-rail {
  scroll-snap-type: x proximity;
}
</style>
