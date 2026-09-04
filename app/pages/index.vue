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
  is_available?: boolean
  short_description?: string | null
  card_description?: string | null
  brand?: { name: string } | null
  primary_image?: {
    id?: number
    image_url?: string | null
    optimized_urls?: {
      card?: string | null
      detail?: string | null
      zoom?: string | null
    } | null
    alt_text?: string | null
  } | null
  images?: Array<{
    id?: number
    image_url?: string | null
    optimized_urls?: { card?: string | null } | null
    alt_text?: string | null
    is_primary?: boolean
  }> | null
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

type HomepageProductSection = {
  id: number
  slot: 1 | 2
  eyebrow?: string | null
  title: string
  description?: string | null
  cta_label?: string | null
  cta_url?: string | null
  layout: 'grid' | 'rail'
  tone: 'light' | 'soft' | 'dark'
  products: Product[]
}

type HomepageCategorySection = {
  id: number
  is_enabled: boolean
  eyebrow?: string | null
  title: string
  description?: string | null
  cta_label?: string | null
  cta_url?: string | null
  tone: 'light' | 'soft' | 'dark'
  columns: number
  categories: Category[]
}

type HomepageSectionKey = 'brand_statement' | 'categories' | 'product_section_1' | 'editorial' | 'product_section_2' | 'values'

type HomepageSectionLayoutItem = {
  key: HomepageSectionKey
  enabled: boolean
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
    product_sections?: HomepageProductSection[]
    category_section?: HomepageCategorySection
    section_layout?: HomepageSectionLayoutItem[]
  }
}

const { $api } = useNuxtApp()

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

// Hero and curated product stories share one SSR response so the first product
// edit never flashes into place after the page has already painted.
const { data: homepageResponse, status: homepageStatus } = await useAsyncData('homepage-config', () =>
  $api<HomepageResponse>('/homepage'),
)

const categorySection = computed(() => homepageResponse.value?.data.category_section ?? null)
const categories = computed(() => categorySection.value?.categories ?? [])
const productSections = computed(() => homepageResponse.value?.data.product_sections ?? [])
const primaryProductSection = computed(() => productSections.value.find(section => section.slot === 1) ?? null)
const secondaryProductSection = computed(() => productSections.value.find(section => section.slot === 2) ?? null)
const merchandisingProducts = computed(() => productSections.value.flatMap(section => section.products))
const defaultSectionLayout: HomepageSectionLayoutItem[] = [
  { key: 'brand_statement', enabled: true },
  { key: 'categories', enabled: true },
  { key: 'product_section_1', enabled: true },
  { key: 'editorial', enabled: true },
  { key: 'product_section_2', enabled: false },
  { key: 'values', enabled: true },
]
const visibleSectionLayout = computed(() =>
  (homepageResponse.value?.data.section_layout ?? defaultSectionLayout).filter(section => section.enabled),
)

const heroCategory = computed(() =>
  categories.value.find(category => category.banner_image_url || category.image_url)
  ?? categories.value[0]
  ?? null,
)

const heroImage = computed(() =>
  heroCategory.value?.banner_image_url
  || heroCategory.value?.image_url
  || merchandisingProducts.value[0]?.primary_image?.optimized_urls?.detail
  || merchandisingProducts.value[0]?.primary_image?.optimized_urls?.card
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

const editorialImage = computed(() =>
  homepageResponse.value?.data.sections?.editorial_image_url
  || merchandisingProducts.value[4]?.primary_image?.optimized_urls?.detail
  || merchandisingProducts.value[1]?.primary_image?.optimized_urls?.detail
  || categories.value[1]?.image_url
  || null,
)

const homeCanonical = 'https://saaj.pk/'

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

    <template v-for="section in visibleSectionLayout" :key="section.key">
      <HomepageBrandStatement v-if="section.key === 'brand_statement'" />
      <HomepageCategorySection v-else-if="section.key === 'categories' && categorySection" :section="categorySection" />
      <HomepageProductSection v-else-if="section.key === 'product_section_1' && primaryProductSection" :section="primaryProductSection" />
      <HomepageEditorialStory v-else-if="section.key === 'editorial'" :image="editorialImage" :loading="homepageStatus === 'pending'" />
      <HomepageProductSection v-else-if="section.key === 'product_section_2' && secondaryProductSection" :section="secondaryProductSection" />
      <HomepageValuesSection v-else-if="section.key === 'values'" />
    </template>
  </div>
</template>
