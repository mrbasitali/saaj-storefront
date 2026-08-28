<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
  description?: string | null
  image_url?: string | null
  banner_image_url?: string | null
}

type Product = {
  id: number
  name: string
  slug: string
  short_description?: string | null
  card_description?: string | null
  brand?: { name: string } | null
  primary_image?: {
    optimized_urls?: {
      card?: string | null
      detail?: string | null
      zoom?: string | null
    } | null
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

type HeroPanel = {
  image_url: string | null
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  alt_text?: string | null
  cta_label?: string | null
  cta_url?: string | null
  text_theme?: 'light' | 'dark'
  text_position?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center' | 'bottom-right' | 'center-right'
}

type HeroSlide = {
  id: number | string
  layout_type?: 'single' | 'panels'
  media_type: 'image' | 'video'
  desktop_media_url: string | null
  mobile_media_url?: string | null
  poster_url?: string | null
  panels?: HeroPanel[]
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  alt_text?: string | null
  primary_cta_label?: string | null
  primary_cta_url?: string | null
  secondary_cta_label?: string | null
  secondary_cta_url?: string | null
  text_position?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center'
  text_theme?: 'light' | 'dark'
  overlay_strength?: number
}

type HomepageResponse = {
  data: {
    hero: {
      enabled: boolean
      mode: 'single' | 'slider'
      autoplay: boolean
      autoplay_delay: number
      pause_on_hover: boolean
      show_arrows: boolean
      show_dots: boolean
      title_size: number
      slides: HeroSlide[]
    }
    sections?: {
      category_columns?: number
      editorial_image_url?: string | null
    }
  }
}

const { $api } = useNuxtApp()

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

// Hero remains SSR-critical. Secondary merchandising sections can hydrate lazily.
const { data: homepageResponse } = await useAsyncData('homepage-config', () =>
  $api<HomepageResponse>('/homepage'),
)

const { data: categoriesResponse, status: categoriesStatus } = await useLazyAsyncData('home-categories', () =>
  $api<{ data: Category[] }>('/categories', {
    query: { home_only: 1 },
  }),
)

const { data: featuredResponse, status: featuredStatus } = await useLazyAsyncData('home-featured', () =>
  $api<{ data: Product[] }>('/products', {
    query: { featured: 1, per_page: 10, include_variants: 1 },
  }),
)

const categories = computed(() => categoriesResponse.value?.data ?? [])
const featuredProducts = computed(() => featuredResponse.value?.data ?? [])

const heroCategory = computed(() =>
  categories.value.find(category => category.banner_image_url || category.image_url)
  ?? categories.value[0]
  ?? null,
)

const heroImage = computed(() =>
  heroCategory.value?.banner_image_url
  || heroCategory.value?.image_url
  || featuredProducts.value[0]?.primary_image?.optimized_urls?.detail
  || featuredProducts.value[0]?.primary_image?.optimized_urls?.card
  || null,
)

const heroLink = computed(() =>
  heroCategory.value
    ? categoryPath(heroCategory.value.full_slug)
    : '/shop',
)

const heroConfig = computed(() => homepageResponse.value?.data.hero ?? {
  enabled: true,
  mode: 'single' as const,
  autoplay: false,
  autoplay_delay: 6000,
  pause_on_hover: true,
  show_arrows: false,
  show_dots: false,
  title_size: 102,
  slides: [],
})

const fallbackSlide = computed<HeroSlide>(() => ({
  id: 'saaj-fallback-hero',
  layout_type: 'single',
  media_type: 'image',
  desktop_media_url: heroImage.value,
  eyebrow: 'The new edit',
  title: 'Quiet detail.\nStrong presence.',
  description: 'A considered wardrobe shaped by clean lines, effortless silhouettes, and the details that make a piece feel distinctly yours.',
  alt_text: heroCategory.value?.name || 'SAAJ new collection',
  primary_cta_label: 'Shop the edit',
  primary_cta_url: heroLink.value,
  secondary_cta_label: 'View all',
  secondary_cta_url: '/shop',
  text_position: 'bottom-left',
  text_theme: 'light',
  overlay_strength: 36,
}))

const heroSlides = computed(() =>
  heroConfig.value.slides.length ? heroConfig.value.slides : [fallbackSlide.value],
)

// The homepage category rail intentionally uses the square/portrait category image.
// Banner imagery is reserved for collection/category landing pages.
function categoryImage(category: Category, _index: number) {
  return category.image_url || null
}

const categoryColumns = computed(() => {
  const value = Number(homepageResponse.value?.data.sections?.category_columns ?? 4)
  return Math.min(6, Math.max(2, Number.isFinite(value) ? value : 4))
})

const categoryGridStyle = computed(() => ({
  '--home-category-columns': String(categoryColumns.value),
}))

const editorialImage = computed(() =>
  homepageResponse.value?.data.sections?.editorial_image_url
  || featuredProducts.value[4]?.primary_image?.optimized_urls?.detail
  || featuredProducts.value[1]?.primary_image?.optimized_urls?.detail
  || categories.value[1]?.image_url
  || null,
)

const homeCanonical = 'https://www.saaj.pk/'

useSeoMeta({
  title: 'SAAJ — Modern Clothing',
  description: 'Discover the latest SAAJ edit — considered clothing, modern silhouettes, and thoughtful detail.',
  robots: 'index,follow',
  ogTitle: 'SAAJ — Modern Clothing',
  ogDescription: 'Discover the latest SAAJ edit — considered clothing, modern silhouettes, and thoughtful detail.',
  ogUrl: homeCanonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: homeCanonical }],
  script: [{
    key: 'saaj-website-jsonld',
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SAAJ',
      url: homeCanonical,
    }),
  }],
})
</script>

<template>
  <div class="overflow-hidden bg-paper-50">
    <StorefrontHero
      :config="heroConfig"
      :slides="heroSlides"
    />

    <!-- Compact brand statement: intentionally visible beneath the shorter hero. -->
    <section class="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div class="grid gap-5 border-b border-charcoal-950/[0.08] pb-12 sm:pb-14 lg:grid-cols-[0.55fr_1.45fr] lg:items-end lg:gap-14 lg:pb-16">
        <div class="flex items-center gap-3">
          <span class="h-px w-8 bg-charcoal-950/35" />
          <p class="section-kicker">SAAJ / The wardrobe</p>
        </div>
        <div>
          <h2 class="max-w-4xl font-display text-[clamp(2.15rem,3.6vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.05em] text-charcoal-950">
            Clothes that feel current now, and considered long after.
          </h2>
          <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <p class="max-w-2xl text-[13px] leading-6 text-charcoal-500 sm:text-sm sm:leading-7">
              Built around proportion, texture, and ease — the SAAJ wardrobe is designed to feel polished without feeling overdone.
            </p>
            <NuxtLink to="/shop" class="home-inline-action shrink-0">
              <span>Explore all</span>
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4">
                <path d="M3.5 9h11M10.5 5l4 4-4 4" />
              </svg>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Immersive category discovery: image-led, compact, and touch-native. -->
    <section class="home-category-section mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10 lg:pb-24">
      <div class="flex items-end justify-between gap-6 border-b border-charcoal-950/[0.07] pb-5 sm:pb-6">
        <div class="max-w-3xl">
          <p class="section-kicker">Explore SAAJ</p>
          <h2 class="mt-2 font-display text-[clamp(2.15rem,3.1vw,3.55rem)] font-medium leading-[0.98] tracking-[-0.048em] text-charcoal-950">
            Shop the collections
          </h2>
          <p class="mt-3 max-w-xl text-[12px] leading-5 text-charcoal-500 sm:text-[13px] sm:leading-6">
            Move through the wardrobe by mood, silhouette, and occasion.
          </p>
        </div>
        <NuxtLink v-if="categoriesStatus !== 'pending'" to="/shop" class="home-inline-action hidden shrink-0 sm:inline-flex">
          <span>View all</span>
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
        </NuxtLink>
      </div>

      <div
        v-if="categoriesStatus === 'pending'"
        class="home-category-grid mt-5 grid grid-flow-col auto-cols-[82%] gap-2 overflow-hidden sm:auto-cols-[46%] lg:grid-flow-row lg:gap-2.5"
        :style="categoryGridStyle"
        aria-label="Loading categories"
      >
        <StorefrontSkeleton v-for="index in categoryColumns" :key="index" class="aspect-[3/4]" />
      </div>

      <div
        v-else-if="categories.length"
        class="home-category-rail home-category-grid mt-5 grid grid-flow-col auto-cols-[82%] gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:auto-cols-[46%] sm:gap-2.5 lg:grid-flow-row lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
        :style="categoryGridStyle"
      >
        <NuxtLink
          v-for="(category, index) in categories"
          :key="category.id"
          :to="categoryPath(category.full_slug)"
          class="home-category-card group relative min-w-0 snap-start overflow-hidden bg-mist-100"
        >
          <div class="relative aspect-[3/4] overflow-hidden">
            <NuxtImg
              v-if="categoryImage(category, index)"
              :src="categoryImage(category, index)!"
              :alt="category.name"
              class="home-category-image absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              sizes="(max-width: 639px) 82vw, (max-width: 1023px) 46vw, 25vw"
            />
            <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#dfe5df,#f3f1eb)]" />
            <div class="home-category-shade absolute inset-0" />

            <div class="absolute inset-0 flex flex-col justify-end p-4 sm:p-5 lg:p-4 xl:p-5">
              <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/66">
                Collection {{ String(index + 1).padStart(2, '0') }}
              </p>
              <div class="mt-2 flex items-end justify-between gap-4">
                <h3 class="min-w-0 font-display text-[clamp(1.65rem,2.2vw,2.6rem)] font-medium leading-[0.96] tracking-[-0.045em] text-white">
                  {{ category.name }}
                </h3>
                <span class="home-category-cta shrink-0" aria-hidden="true">
                  <span>Explore</span>
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-3.5 w-3.5"><path d="M4 14 14 4M7 4h7v7" /></svg>
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <NuxtLink v-if="categoriesStatus !== 'pending'" to="/shop" class="home-inline-action mt-5 sm:hidden">
        <span>View all collections</span>
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
      </NuxtLink>
    </section>

    <section class="border-y border-black/8 bg-white">
      <div class="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div class="flex items-end justify-between gap-5">
          <div>
            <p class="section-kicker">Selected for you</p>
            <h2 class="mt-2 font-display text-4xl font-medium tracking-[-0.04em] text-charcoal-950 sm:text-5xl">
              New & noteworthy
            </h2>
          </div>
          <NuxtLink v-if="featuredStatus !== 'pending'" to="/shop" class="text-link hidden sm:inline-flex">View all</NuxtLink>
        </div>

        <div v-if="featuredStatus === 'pending'" class="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          <ProductCardSkeleton v-for="index in 8" :key="index" />
        </div>

        <div v-else-if="featuredProducts.length" class="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-10 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">
          <ProductCard
            v-for="product in featuredProducts.slice(0, 8)"
            :key="product.id"
            :product="product"
          />
        </div>

        <div v-else class="mt-10 border-t border-black/8 pt-8 text-sm text-charcoal-400">
          New pieces will appear here as soon as they are marked featured in the backoffice.
        </div>

        <NuxtLink v-if="featuredStatus !== 'pending'" to="/shop" class="text-link mt-8 sm:hidden">View all</NuxtLink>
      </div>
    </section>

    <!-- Dedicated backoffice-controlled editorial image. -->
    <section class="mx-auto max-w-[1600px] px-0 py-0 lg:px-10 lg:py-24">
      <div class="home-editorial-story relative isolate overflow-hidden bg-mist-100 lg:min-h-[690px]">
        <div class="relative aspect-[4/5] min-h-[520px] sm:aspect-[16/10] sm:min-h-[600px] lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-0">
          <NuxtImg
            v-if="editorialImage"
            :src="editorialImage"
            alt="SAAJ editorial"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            sizes="100vw lg:1520px"
          />
          <StorefrontSkeleton v-else-if="featuredStatus === 'pending'" class="absolute inset-0" />
          <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#cfd8d0,#edeae2)]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/32 via-transparent to-black/5 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/10" />
        </div>

        <div class="relative z-10 -mt-24 px-5 pb-5 sm:-mt-28 sm:px-8 sm:pb-8 lg:ml-auto lg:mr-10 lg:mt-0 lg:flex lg:min-h-[690px] lg:w-[44%] lg:items-end lg:px-0 lg:pb-10 xl:mr-14 xl:w-[40%]">
          <div class="w-full bg-paper-50/96 p-7 shadow-[0_22px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-9 lg:p-10 xl:p-12">
            <div class="flex items-center gap-3">
              <span class="h-px w-7 bg-charcoal-950/35" />
              <p class="section-kicker">The SAAJ point of view</p>
            </div>
            <h2 class="mt-5 font-display text-[clamp(2.75rem,4.3vw,5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-charcoal-950">
              Less noise.<br>More character.
            </h2>
            <p class="mt-5 max-w-lg text-[13px] leading-6 text-charcoal-600 sm:text-sm sm:leading-7">
              We prefer pieces that earn attention through cut, movement, texture, and detail — not through excess.
            </p>
            <NuxtLink to="/shop" class="home-editorial-cta mt-7">
              <span>Discover SAAJ</span>
              <span class="home-editorial-cta-icon">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4">
                  <path d="M3.5 9h11M10.5 5l4 4-4 4" />
                </svg>
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
      <div class="grid gap-8 border-t border-black/8 pt-9 sm:grid-cols-3 sm:gap-6 sm:pt-10">
        <div>
          <p class="section-kicker">01 / Detail</p>
          <p class="mt-3 max-w-xs text-sm leading-6 text-charcoal-600">
            Considered finishing and thoughtful proportions, kept clean and effortless.
          </p>
        </div>
        <div>
          <p class="section-kicker">02 / Ease</p>
          <p class="mt-3 max-w-xs text-sm leading-6 text-charcoal-600">
            Pieces designed to work naturally with the way you move, layer, and live.
          </p>
        </div>
        <div>
          <p class="section-kicker">03 / Character</p>
          <p class="mt-3 max-w-xs text-sm leading-6 text-charcoal-600">
            A modern wardrobe with enough personality to feel unmistakably your own.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
