<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
  image_url?: string | null
  banner_image_url?: string | null
}

type CategorySection = {
  id: number
  eyebrow?: string | null
  title: string
  description?: string | null
  cta_label?: string | null
  cta_url?: string | null
  tone: 'light' | 'soft' | 'dark'
  columns: number
  categories: Category[]
}

const props = defineProps<{
  section: CategorySection
}>()

const isDark = computed(() => props.section.tone === 'dark')
const sectionClass = computed(() => ({
  'bg-paper-50': props.section.tone === 'light',
  'bg-[#edf0eb]': props.section.tone === 'soft',
  'bg-charcoal-950 text-paper-50': isDark.value,
}))
const gridStyle = computed(() => ({
  '--home-category-columns': String(Math.min(6, Math.max(2, Number(props.section.columns) || 4))),
}))

function categoryPath(slug: string) {
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}
</script>

<template>
  <section v-if="section.categories.length" class="home-category-section border-y border-charcoal-950/[0.07]" :class="sectionClass">
    <div class="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
      <div class="flex items-end justify-between gap-6 border-b pb-5 sm:pb-6" :class="isDark ? 'border-white/12' : 'border-charcoal-950/[0.07]'">
        <div class="max-w-3xl">
          <p class="text-[9px] font-semibold uppercase tracking-[0.2em]" :class="isDark ? 'text-white/55' : 'text-charcoal-500'">{{ section.eyebrow || 'Explore SAAJ' }}</p>
          <h2 class="mt-2 font-display text-[clamp(2.15rem,3.1vw,3.55rem)] font-medium leading-[0.98] tracking-[-0.048em]" :class="isDark ? 'text-paper-50' : 'text-charcoal-950'">{{ section.title }}</h2>
          <p v-if="section.description" class="mt-3 max-w-xl text-[12px] leading-5 sm:text-[13px] sm:leading-6" :class="isDark ? 'text-white/58' : 'text-charcoal-500'">{{ section.description }}</p>
        </div>
        <NuxtLink v-if="section.cta_label && section.cta_url" :to="section.cta_url" class="home-inline-action hidden shrink-0 sm:inline-flex" :class="isDark ? 'home-inline-action-dark' : ''">
          <span>{{ section.cta_label }}</span>
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
        </NuxtLink>
      </div>

      <div class="home-category-rail home-category-grid mt-5 grid grid-flow-col auto-cols-[82%] gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:auto-cols-[46%] sm:gap-2.5 lg:grid-flow-row lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden" :style="gridStyle">
        <NuxtLink v-for="(category, index) in section.categories" :key="category.id" :to="categoryPath(category.full_slug)" class="home-category-card group relative min-w-0 snap-start overflow-hidden bg-mist-100">
          <div class="relative aspect-[3/4] overflow-hidden">
            <NuxtImg v-if="category.image_url || category.banner_image_url" :src="category.image_url || category.banner_image_url || ''" :alt="category.name" class="home-category-image absolute inset-0 h-full w-full object-cover" loading="lazy" sizes="(max-width: 639px) 82vw, (max-width: 1023px) 46vw, 25vw" />
            <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#dfe5df,#f3f1eb)]" />
            <div class="home-category-shade absolute inset-0" />
            <div class="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 lg:p-4 xl:p-5">
              <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/66">Collection {{ String(index + 1).padStart(2, '0') }}</p>
              <div class="mt-2 flex items-end justify-between gap-4">
                <h3 class="min-w-0 font-display text-[clamp(1.65rem,2.2vw,2.6rem)] font-medium leading-[0.96] tracking-[-0.045em] text-white">{{ category.name }}</h3>
                <span class="home-category-cta shrink-0" aria-hidden="true">
                  <span>Explore</span>
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-3.5 w-3.5"><path d="M4 14 14 4M7 4h7v7" /></svg>
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <NuxtLink v-if="section.cta_label && section.cta_url" :to="section.cta_url" class="home-inline-action mt-5 sm:hidden" :class="isDark ? 'home-inline-action-dark' : ''">
        <span>{{ section.cta_label }}</span>
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.home-inline-action-dark {
  color: rgb(255 255 255 / 0.75);
}

.home-inline-action-dark:hover {
  color: white;
}
</style>
