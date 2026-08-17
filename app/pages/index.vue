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

type HeroSlide = {
  id: number | string
  media_type: 'image' | 'video'
  desktop_media_url: string | null
  mobile_media_url?: string | null
  poster_url?: string | null
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
      slides: HeroSlide[]
    }
  }
}

const { $api } = useNuxtApp()

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

// The hero is critical, so it is fetched normally and can be rendered on
// the server. Secondary merchandising sections are lazy so client-side
// navigation can paint immediately and use stable skeletons while loading.
const { data: homepageResponse } = await useAsyncData('homepage-config', () =>
  $api<HomepageResponse>('/homepage'),
)

const { data: categoriesResponse, status: categoriesStatus } = await useLazyAsyncData('home-categories', () =>
  $api<{ data: Category[] }>('/categories', {
    query: { root: 1, menu_only: 1 },
  }),
)

const { data: featuredResponse, status: featuredStatus } = await useLazyAsyncData('home-featured', () =>
  $api<{ data: Product[] }>('/products', {
    query: { featured: 1, per_page: 10, include_variants: 1 },
  }),
)

const categories = computed(() => (categoriesResponse.value?.data ?? []).slice(0, 4))
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
  slides: [],
})

const fallbackSlide = computed<HeroSlide>(() => ({
  id: 'saaj-fallback-hero',
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

const editorialImage = computed(() =>
  featuredProducts.value[4]?.primary_image?.optimized_urls?.detail
  || featuredProducts.value[1]?.primary_image?.optimized_urls?.detail
  || categories.value[1]?.banner_image_url
  || categories.value[1]?.image_url
  || null,
)

function categoryImage(category: Category, index: number) {
  return category.banner_image_url
    || category.image_url
    || featuredProducts.value[index + 1]?.primary_image?.optimized_urls?.detail
    || featuredProducts.value[index + 1]?.primary_image?.optimized_urls?.card
    || null
}

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

    <section class="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
      <div class="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
        <p class="section-kicker">SAAJ / 2026</p>
        <div>
          <h2 class="max-w-4xl font-display text-[clamp(2.4rem,4.2vw,4.8rem)] font-medium leading-[0.98] tracking-[-0.05em] text-charcoal-950">
            Clothes that feel current now, and considered long after.
          </h2>
          <p class="mt-5 max-w-2xl text-sm leading-7 text-charcoal-500 sm:text-base">
            Built around proportion, texture, and ease — the SAAJ wardrobe is designed to feel polished without feeling overdone.
          </p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10 lg:pb-28">
      <div class="mb-7 flex items-end justify-between gap-6 sm:mb-9">
        <div>
          <p class="section-kicker">Shop by category</p>
          <h2 class="mt-2 font-display text-4xl font-medium tracking-[-0.04em] text-charcoal-950 sm:text-5xl">
            Find your edit
          </h2>
        </div>
        <NuxtLink v-if="categoriesStatus !== 'pending'" to="/shop" class="text-link hidden sm:inline-flex">Shop all</NuxtLink>
      </div>

      <div
        v-if="categoriesStatus === 'pending'"
        class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-12 lg:gap-5"
        aria-label="Loading categories"
      >
        <StorefrontSkeleton class="aspect-[3/4] lg:col-span-7 lg:aspect-[4/5]" />
        <StorefrontSkeleton class="aspect-[3/4] lg:col-span-5 lg:aspect-[4/5]" />
        <StorefrontSkeleton class="aspect-[3/4] lg:col-span-5 lg:aspect-[5/4]" />
        <StorefrontSkeleton class="aspect-[3/4] lg:col-span-7 lg:aspect-[5/4]" />
      </div>

      <div
        v-else-if="categories.length"
        class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-12 lg:gap-5"
      >
        <NuxtLink
          v-for="(category, index) in categories"
          :key="category.id"
          :to="categoryPath(category.full_slug)"
          class="group relative overflow-hidden bg-mist-100"
          :class="[
            index === 0 || index === 3 ? 'lg:col-span-7' : 'lg:col-span-5',
            index === 0 || index === 1 ? 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[4/5]' : 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[5/4]',
          ]"
        >
          <NuxtImg
            v-if="categoryImage(category, index)"
            :src="categoryImage(category, index)!"
            :alt="category.name"
            class="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
            loading="lazy"
          />
          <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#dfe5df,#f3f1eb)]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/52 via-black/7 to-transparent" />

          <div class="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6 lg:p-8">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/68">Explore</p>
            <div class="mt-1.5 flex items-end justify-between gap-4">
              <h3 class="font-display text-[28px] font-medium tracking-[-0.035em] sm:text-[34px] lg:text-[42px]">
                {{ category.name }}
              </h3>
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/45 transition duration-300 group-hover:bg-white group-hover:text-charcoal-950">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <NuxtLink v-if="categoriesStatus !== 'pending'" to="/shop" class="text-link mt-6 sm:hidden">Shop all</NuxtLink>
    </section>

    <section class="border-y border-black/8 bg-white">
      <div class="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
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

    <section class="bg-mist-100">
      <div class="mx-auto grid max-w-[1600px] lg:grid-cols-2">
        <div class="relative min-h-[520px] overflow-hidden sm:min-h-[640px] lg:min-h-[760px]">
          <NuxtImg
            v-if="editorialImage"
            :src="editorialImage"
            alt="SAAJ editorial"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <StorefrontSkeleton v-else-if="featuredStatus === 'pending'" class="absolute inset-0" />
          <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#cfd8d0,#edeae2)]" />
        </div>

        <div class="flex items-center px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24 xl:px-24">
          <div class="max-w-xl">
            <p class="section-kicker">The SAAJ point of view</p>
            <h2 class="mt-4 font-display text-[clamp(3rem,5vw,5.8rem)] font-medium leading-[0.9] tracking-[-0.06em] text-charcoal-950">
              Less noise.<br>More character.
            </h2>
            <p class="mt-6 max-w-lg text-sm leading-7 text-charcoal-600 sm:text-base">
              We prefer pieces that earn attention through cut, movement, texture, and detail — not through excess.
            </p>
            <NuxtLink
              to="/shop"
              class="mt-8 inline-flex min-h-12 items-center justify-center bg-[#151714] px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f7f6f2] transition duration-300 hover:bg-[#292d28] active:scale-[0.985]"
            >
              Discover SAAJ
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
      <div class="grid gap-10 border-t border-black/8 pt-10 sm:grid-cols-3 sm:gap-6">
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
