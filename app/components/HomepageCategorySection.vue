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

const shopLink = computed(() => {
  const { cta_label: label, cta_url: to } = props.section
  return label && to ? { label, to } : { label: 'Shop all', to: '/shop' }
})

const isDark = computed(() => props.section.tone === 'dark')
const sectionClass = computed(() => ({
  'bg-paper-50': props.section.tone === 'light',
  'bg-[#edf0eb]': props.section.tone === 'soft',
  'bg-[#20231f] text-[#f7f6f2]': isDark.value,
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
  <section v-if="section.categories.length" class="home-category-section" :class="sectionClass">
    <div class="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div class="max-w-3xl">
          <p v-if="section.eyebrow" class="mb-2 text-xs font-medium" :class="isDark ? 'text-white/55' : 'text-charcoal-500'">{{ section.eyebrow }}</p>
          <h2 class="font-display text-[clamp(2rem,3.4vw,3.5rem)] font-medium leading-none tracking-[-0.035em]" :class="isDark ? 'text-paper-50' : 'text-charcoal-950'">{{ section.title }}</h2>
          <p v-if="section.description" class="mt-2 max-w-xl text-sm leading-6" :class="isDark ? 'text-white/58' : 'text-charcoal-500'">{{ section.description }}</p>
        </div>
        <NuxtLink :to="shopLink.to" class="home-inline-action min-h-11 shrink-0" :class="isDark ? 'home-inline-action-dark focus-visible:outline-white' : ''">
          <span>{{ shopLink.label }}</span>
          <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
        </NuxtLink>
      </div>

      <div class="homepage-category-grid mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:mt-7 sm:grid-cols-3 sm:gap-x-5 lg:gap-x-6" :style="gridStyle">
        <NuxtLink
          v-for="category in section.categories"
          :key="category.id"
          :to="categoryPath(category.full_slug)"
          class="home-category-card collection-tile group relative isolate flex aspect-[4/5] min-w-0 items-end overflow-hidden bg-[#292722] text-white lg:aspect-[8/9]"
        >
          <NuxtImg
            v-if="category.image_url || category.banner_image_url"
            :src="category.image_url || category.banner_image_url || ''"
            alt=""
            class="home-category-image absolute inset-0 h-full w-full object-cover object-top"
            loading="lazy"
            sizes="50vw sm:33vw lg:33vw"
          />
          <div class="collection-tile-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
          <div class="relative flex w-full items-end justify-between gap-2 px-3.5 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
            <h3 class="min-w-0 break-words font-display text-[clamp(1.25rem,3vw,2.5rem)] font-semibold leading-none tracking-[-0.025em] lg:text-[clamp(1.5rem,2.55vw,2.75rem)]">{{ category.name }}</h3>
            <span aria-hidden="true" class="collection-card-arrow grid size-7 shrink-0 place-items-center rounded-full border sm:size-9 lg:size-10">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="size-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (min-width: 1024px) {
  .homepage-category-grid {
    grid-template-columns: repeat(var(--home-category-columns), minmax(0, 1fr));
  }
}

.home-inline-action-dark {
  color: rgb(255 255 255 / 0.75);
}

.home-inline-action-dark:hover {
  color: white;
}

.collection-tile:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -5px;
}

.collection-tile-scrim {
  background: linear-gradient(0deg, rgb(15 12 10 / 0.88), rgb(15 12 10 / 0.55) 20%, transparent 54%);
}

.collection-card-arrow {
  border-color: rgb(255 255 255 / 0.72);
  transition: transform 220ms ease, background-color 220ms ease, color 220ms ease;
}

.home-category-card:is(:hover, :focus-visible) .collection-card-arrow {
  transform: translateX(2px);
  background-color: white;
  color: #211d19;
}

@media (prefers-reduced-motion: reduce) {
  .collection-card-arrow {
    transition: none;
  }

  .home-category-card:is(:hover, :focus-visible) .collection-card-arrow {
    transform: none;
  }
}
</style>
