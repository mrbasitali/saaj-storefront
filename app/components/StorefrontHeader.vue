<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
  children?: Category[] | null
}

const props = defineProps<{
  categories: Category[]
}>()

const authStore = useAuthStore()
const cart = useCartStore()
const siteSettings = useSiteSettingsStore()
const route = useRoute()
const { theme, isDark, toggleTheme } = useStorefrontTheme()

const mobileMenuOpen = ref(false)
const mobileMenuGlassOpen = ref(false)
const mobileCategoryId = ref<number | null>(null)
const mobileDirection = ref<'forward' | 'back'>('forward')
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const desktopCategoryId = ref<number | null>(null)
const headerWishlistBurst = ref(0)
let desktopCloseTimer: ReturnType<typeof setTimeout> | null = null
let mobileMenuCloseTimer: ReturnType<typeof setTimeout> | null = null

const visibleCategories = computed(() => props.categories.slice(0, 6))
const desktopCategory = computed(() => props.categories.find(category => category.id === desktopCategoryId.value) ?? null)
const mobileCategory = computed(() => props.categories.find(category => category.id === mobileCategoryId.value) ?? null)

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

const headerLogo = computed(() => {
  const logos = siteSettings.settings?.logos
  if (!logos) return null

  return isDark.value
    ? (logos.navbar_dark || logos.navbar_light)
    : (logos.navbar_light || logos.navbar_dark)
})

const mobileMenuActive = computed(() => mobileMenuOpen.value || mobileMenuGlassOpen.value)
const overlayOpen = computed(() => mobileMenuActive.value || searchOpen.value)
const selectedCategory = computed(() => {
  if (route.path.startsWith('/shop/')) {
    return route.path
      .slice('/shop/'.length)
      .split('/')
      .map(segment => decodeURIComponent(segment))
      .join('/')
  }
  return typeof route.query.category === 'string' ? route.query.category : ''
})
const isNewInActive = computed(() => route.path === '/shop' && !selectedCategory.value && !route.query.search)
const isWishlistRoute = computed(() => route.path.startsWith('/account/wishlist'))

function isCategoryActive(category: Category) {
  if (!selectedCategory.value) return false
  return selectedCategory.value === category.full_slug
    || selectedCategory.value.startsWith(`${category.full_slug}/`)
}

watch(() => route.fullPath, () => {
  closeMobileMenu()
  closeSearch()
  closeDesktopMenu()
})

watch(overlayOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})

watch(searchOpen, async (open) => {
  if (!open) return
  await nextTick()
  window.setTimeout(() => searchInput.value?.focus(), 180)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
  clearDesktopCloseTimer()
  if (mobileMenuCloseTimer) clearTimeout(mobileMenuCloseTimer)
})

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (searchOpen.value) closeSearch()
  else if (mobileMenuActive.value) closeMobileMenu()
  else closeDesktopMenu()
}

function clearDesktopCloseTimer() {
  if (!desktopCloseTimer) return
  clearTimeout(desktopCloseTimer)
  desktopCloseTimer = null
}

function openDesktopMenu(category: Category) {
  clearDesktopCloseTimer()
  searchOpen.value = false
  desktopCategoryId.value = category.id
}

function scheduleDesktopClose() {
  clearDesktopCloseTimer()
  desktopCloseTimer = setTimeout(() => {
    desktopCategoryId.value = null
  }, 150)
}

function closeDesktopMenu() {
  clearDesktopCloseTimer()
  desktopCategoryId.value = null
}

async function openMobileMenu() {
  closeSearch()
  closeDesktopMenu()

  if (mobileMenuCloseTimer) {
    clearTimeout(mobileMenuCloseTimer)
    mobileMenuCloseTimer = null
  }

  mobileDirection.value = 'back'
  mobileCategoryId.value = null

  // Prime the real fixed backdrop layer before revealing menu content.
  // Chromium can otherwise paint the first menu frame before its backdrop
  // compositor surface is ready, which creates a visible sharp -> blur pop.
  mobileMenuGlassOpen.value = true

  if (!import.meta.client) {
    mobileMenuOpen.value = true
    return
  }

  await nextTick()
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
  await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))

  if (mobileMenuGlassOpen.value) mobileMenuOpen.value = true
}

function closeMobileMenu() {
  mobileMenuOpen.value = false

  if (mobileMenuCloseTimer) {
    clearTimeout(mobileMenuCloseTimer)
    mobileMenuCloseTimer = null
  }

  if (!import.meta.client) {
    mobileMenuGlassOpen.value = false
    mobileCategoryId.value = null
    return
  }

  // Keep the already-composited blur in place until the shell finishes its
  // leave animation, then remove both the glass and the nested category state.
  mobileMenuCloseTimer = window.setTimeout(() => {
    mobileMenuGlassOpen.value = false
    mobileCategoryId.value = null
    mobileMenuCloseTimer = null
  }, 540)
}

function openMobileCategory(category: Category) {
  mobileDirection.value = 'forward'
  mobileCategoryId.value = category.id
}

function goMobileBack() {
  mobileDirection.value = 'back'
  mobileCategoryId.value = null
}

function openSearch() {
  closeDesktopMenu()
  if (mobileMenuActive.value) closeMobileMenu()

  const activeSearch = typeof route.query.search === 'string' ? route.query.search : ''
  if (activeSearch) searchQuery.value = activeSearch

  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
}

async function clearSearchInput() {
  searchQuery.value = ''
  await nextTick()
  searchInput.value?.focus()
}

function submitSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  closeSearch()
  navigateTo({ path: '/shop', query: { search: query } })
}
</script>

<template>
  <header class="storefront-header sticky top-0 z-50">
    <StorefrontGlassLayer variant="nav" />

    <div class="storefront-header-main relative z-[1]">
      <div class="flex min-w-0 items-center">
        <button
          type="button"
          :aria-label="mobileMenuActive ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileMenuActive"
          class="header-utility-button lg:hidden"
          @click="mobileMenuActive ? closeMobileMenu() : openMobileMenu()"
        >
          <span class="hamburger-icon" :class="{ 'is-open': mobileMenuActive }" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>

        <button
          type="button"
          aria-label="Search"
          class="header-utility-button lg:hidden"
          @click="openSearch"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" class="h-[18px] w-[18px]">
            <circle cx="10.7" cy="10.7" r="6.5" />
            <path d="m15.5 15.5 4.3 4.3" />
          </svg>
        </button>

        <NuxtLink
          to="/account/wishlist"
          aria-label="Wishlist"
          class="header-utility-button lg:hidden"
          @click="headerWishlistBurst += 1"
        >
          <WishlistHeart :active="isWishlistRoute" :burst-key="headerWishlistBurst" :size="18" />
        </NuxtLink>

        <button
          type="button"
          class="hidden items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-700 transition-colors duration-300 hover:text-charcoal-950 lg:inline-flex"
          @click="openSearch"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" class="h-[18px] w-[18px]">
            <circle cx="10.7" cy="10.7" r="6.5" />
            <path d="m15.5 15.5 4.3 4.3" />
          </svg>
          Search
        </button>
      </div>

      <NuxtLink
        to="/"
        aria-label="SAAJ home"
        class="flex min-w-[120px] items-center justify-center px-3 sm:min-w-[150px]"
      >
        <Transition name="logo-fade" mode="out-in">
          <img
            v-if="headerLogo"
            :key="`${theme}-${headerLogo}`"
            :src="headerLogo"
            alt="SAAJ"
            class="max-h-[31px] w-auto max-w-[142px] object-contain sm:max-h-[35px] sm:max-w-[170px]"
          >
          <span
            v-else
            :key="`wordmark-${theme}`"
            class="font-display text-[29px] font-medium leading-none tracking-[0.08em] text-charcoal-950 sm:text-[32px]"
          >
            SAAJ
          </span>
        </Transition>
      </NuxtLink>

      <div class="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
        <button
          type="button"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          class="header-utility-button flex"
          @click="toggleTheme"
        >
          <Transition name="theme-icon" mode="out-in">
            <svg v-if="isDark" key="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-[18px] w-[18px]">
              <circle cx="12" cy="12" r="3.6" />
              <path d="M12 2.7v2.1M12 19.2v2.1M21.3 12h-2.1M4.8 12H2.7M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5M18.6 18.6l-1.5-1.5M6.9 6.9 5.4 5.4" />
            </svg>
            <svg v-else key="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-[18px] w-[18px]">
              <path d="M20 15.2A8.6 8.6 0 0 1 8.8 4a8.2 8.2 0 1 0 11.2 11.2Z" />
            </svg>
          </Transition>
        </button>

        <NuxtLink
          to="/account/wishlist"
          aria-label="Wishlist"
          class="header-utility-button hidden lg:flex"
          @click="headerWishlistBurst += 1"
        >
          <WishlistHeart :active="isWishlistRoute" :burst-key="headerWishlistBurst" :size="18" />
        </NuxtLink>

        <NuxtLink :to="authStore.isLoggedIn ? '/account' : '/login'" aria-label="Account" class="header-utility-button relative flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-[18px] w-[18px]">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.8 19.7c1.5-3.4 4.2-5 7.2-5s5.7 1.6 7.2 5" />
          </svg>
          <span v-if="authStore.isLoggedIn" class="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#657d6c] ring-2 ring-paper-50" aria-hidden="true" />
        </NuxtLink>

        <NuxtLink to="/cart" aria-label="Shopping bag" class="header-utility-button relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-[18px] w-[18px]">
            <path d="M4.6 7.2h14.8l-1.1 11.5H5.7L4.6 7.2Z" />
            <path d="M8.5 7.2V5.8a3.5 3.5 0 0 1 7 0v1.4" />
          </svg>
          <span v-if="cart.totalItems > 0" class="cart-count">
            {{ cart.totalItems > 99 ? '99+' : cart.totalItems }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <nav
      class="storefront-desktop-nav relative z-[1] hidden lg:flex"
      aria-label="Main navigation"
      @mouseleave="scheduleDesktopClose"
    >
      <div class="flex h-full items-stretch justify-center gap-8 xl:gap-11">
        <NuxtLink
          to="/shop"
          class="storefront-nav-item"
          :class="{ 'is-active': isNewInActive }"
          @mouseenter="closeDesktopMenu"
        >
          New in
        </NuxtLink>

        <div
          v-for="category in visibleCategories"
          :key="category.id"
          class="flex items-stretch"
          @mouseenter="category.children?.length ? openDesktopMenu(category) : closeDesktopMenu()"
        >
          <NuxtLink
            :to="categoryPath(category.full_slug)"
            class="storefront-nav-item inline-flex items-center gap-1.5"
            :class="{ 'is-active': isCategoryActive(category) }"
          >
            {{ category.name }}
            <svg
              v-if="category.children?.length"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              class="h-3 w-3 transition-transform duration-300"
              :class="desktopCategoryId === category.id ? 'rotate-180' : ''"
            >
              <path d="m4.2 6 3.8 4 3.8-4" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <Transition name="mega-menu">
      <div
        v-if="desktopCategory"
        class="storefront-mega-menu hidden lg:block"
        @mouseenter="clearDesktopCloseTimer"
        @mouseleave="scheduleDesktopClose"
      >
        <StorefrontGlassLayer variant="menu" />
        <div class="relative z-[1] mx-auto grid max-w-[1500px] grid-cols-[0.72fr_1.28fr] gap-16 px-10 py-10 xl:px-14 xl:py-12">
          <div class="pr-8">
            <p class="section-kicker">Explore</p>
            <h2 class="mt-3 font-display text-[44px] font-medium leading-[0.95] tracking-[-0.045em] text-charcoal-950 xl:text-[52px]">
              {{ desktopCategory.name }}
            </h2>
            <NuxtLink :to="categoryPath(desktopCategory.full_slug)" class="mega-shop-all mt-7 inline-flex items-center gap-3">
              Shop all {{ desktopCategory.name }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-4 w-4">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            </NuxtLink>
          </div>

          <div>
            <p class="section-kicker">Categories</p>
            <div class="mt-4 grid grid-cols-2 gap-x-10 gap-y-1 xl:grid-cols-3">
              <NuxtLink
                v-for="(child, index) in desktopCategory.children"
                :key="child.id"
                :to="categoryPath(child.full_slug)"
                class="mega-child-link menu-stagger group"
                :style="{ '--menu-delay': `${90 + index * 38}ms` }"
              >
                <span>{{ child.name }}</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                  <path d="M4 10h12M12 6l4 4-4 4" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </header>

  <Transition name="menu-backdrop">
    <button
      v-if="desktopCategory"
      type="button"
      aria-label="Close menu"
      class="storefront-menu-backdrop fixed inset-0 z-40 hidden lg:block"
      @mouseenter="scheduleDesktopClose"
      @click="closeDesktopMenu"
    />
  </Transition>

  <!-- Prime this sibling glass before mounting the menu shell. Keeping the
       filter outside the animated shell also avoids Chromium's first-frame
       backdrop compositor flash on Android and desktop Chrome. -->
  <StorefrontGlassLayer
    v-if="mobileMenuGlassOpen"
    variant="mobile-menu"
    class="mobile-menu-preblur lg:hidden"
  />

  <Transition name="mobile-shell">
    <div v-if="mobileMenuOpen" class="mobile-menu-shell lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="relative z-[1] min-h-0 flex-1 overflow-hidden">
        <Transition :name="mobileDirection === 'forward' ? 'mobile-level-forward' : 'mobile-level-back'" mode="out-in">
          <div v-if="!mobileCategory" key="root" class="mobile-menu-level">
            <nav class="mobile-menu-scroll" aria-label="Mobile navigation">
              <p class="mobile-menu-eyebrow mobile-stagger" style="--menu-delay: 70ms">Shop</p>

              <NuxtLink to="/shop" class="mobile-menu-main-link mobile-stagger" style="--menu-delay: 115ms">
                <span>New in</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" class="h-5 w-5 opacity-45">
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
              </NuxtLink>

              <template v-for="(category, index) in categories" :key="category.id">
                <button
                  v-if="category.children?.length"
                  type="button"
                  class="mobile-menu-main-link mobile-stagger w-full text-left"
                  :style="{ '--menu-delay': `${160 + index * 45}ms` }"
                  @click="openMobileCategory(category)"
                >
                  <span>{{ category.name }}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" class="h-5 w-5 opacity-45">
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
                <NuxtLink
                  v-else
                  :to="categoryPath(category.full_slug)"
                  class="mobile-menu-main-link mobile-stagger"
                  :style="{ '--menu-delay': `${160 + index * 45}ms` }"
                >
                  <span>{{ category.name }}</span>
                </NuxtLink>
              </template>
            </nav>

            <div class="mobile-menu-footer mobile-stagger" :style="{ '--menu-delay': `${200 + categories.length * 45}ms` }">
              <NuxtLink :to="authStore.isLoggedIn ? '/account' : '/login'">{{ authStore.isLoggedIn ? 'Account' : 'Sign in' }}</NuxtLink>
              <NuxtLink to="/account/wishlist">Wishlist</NuxtLink>
              <NuxtLink to="/track-order">Track order</NuxtLink>
              <NuxtLink to="/cart">Bag ({{ cart.totalItems }})</NuxtLink>
              <button type="button" class="inline-flex items-center gap-2" @click="toggleTheme">
                {{ isDark ? 'Light mode' : 'Dark mode' }}
                <span class="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
              </button>
            </div>
          </div>

          <div v-else :key="mobileCategory.id" class="mobile-menu-level">
            <nav class="mobile-menu-scroll" :aria-label="mobileCategory.name">
              <button
                type="button"
                class="mobile-menu-back mobile-stagger"
                style="--menu-delay: 55ms"
                @click="goMobileBack"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" class="h-4 w-4">
                  <path d="m14.5 5-7 7 7 7" />
                </svg>
                Back
              </button>
              <p class="mobile-menu-eyebrow mobile-stagger" style="--menu-delay: 90ms">{{ mobileCategory.name }}</p>
              <NuxtLink
                :to="categoryPath(mobileCategory.full_slug)"
                class="mobile-menu-main-link mobile-stagger"
                style="--menu-delay: 135ms"
              >
                <span>Shop all</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" class="h-5 w-5 opacity-45">
                  <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
              </NuxtLink>
              <NuxtLink
                v-for="(child, index) in mobileCategory.children"
                :key="child.id"
                :to="categoryPath(child.full_slug)"
                class="mobile-menu-main-link mobile-stagger"
                :style="{ '--menu-delay': `${180 + index * 45}ms` }"
              >
                <span>{{ child.name }}</span>
              </NuxtLink>
            </nav>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>

  <Transition name="search-overlay">
    <div v-if="searchOpen" class="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div class="search-overlay-topbar">
        <span class="w-10" />
        <NuxtLink to="/" aria-label="SAAJ home" class="flex min-w-[120px] justify-center">
          <img v-if="headerLogo" :src="headerLogo" alt="SAAJ" class="max-h-[31px] max-w-[150px] object-contain">
          <span v-else class="font-display text-[28px] tracking-[0.08em] text-charcoal-950">SAAJ</span>
        </NuxtLink>
        <button type="button" aria-label="Close search" class="header-utility-button -mr-2" @click="closeSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" class="h-5 w-5">
            <path d="m5 5 14 14M19 5 5 19" />
          </svg>
        </button>
      </div>

      <div class="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-[8vh] sm:px-8 lg:px-10 lg:pt-[11vh]">
        <p class="section-kicker search-stagger" style="--menu-delay: 70ms">Search SAAJ</p>
        <form class="search-form search-stagger" style="--menu-delay: 115ms" @submit.prevent="submitSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" class="h-6 w-6 shrink-0 text-charcoal-400 sm:h-7 sm:w-7">
            <circle cx="10.7" cy="10.7" r="6.5" />
            <path d="m15.5 15.5 4.3 4.3" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            placeholder="What are you looking for?"
            class="min-w-0 flex-1 bg-transparent font-display text-[clamp(2.3rem,6vw,5rem)] font-medium leading-none tracking-[-0.045em] text-charcoal-950 outline-none placeholder:text-charcoal-300"
          >
          <Transition name="search-clear">
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear-button"
              aria-label="Clear search"
              @click="clearSearchInput"
            >
              <span class="hidden sm:inline">Clear</span>
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" class="h-4 w-4">
                <path d="m4.5 4.5 9 9M13.5 4.5l-9 9" />
              </svg>
            </button>
          </Transition>
        </form>

        <div class="mt-12 grid gap-10 border-t border-charcoal-950/10 pt-8 sm:grid-cols-[0.6fr_1.4fr] lg:mt-16 lg:pt-10">
          <p class="section-kicker search-stagger" style="--menu-delay: 160ms">Browse</p>
          <div class="grid grid-cols-2 gap-x-7 gap-y-1 sm:grid-cols-3">
            <NuxtLink to="/shop" class="search-browse-link search-stagger" style="--menu-delay: 205ms">New in</NuxtLink>
            <NuxtLink
              v-for="(category, index) in visibleCategories"
              :key="category.id"
              :to="categoryPath(category.full_slug)"
              class="search-browse-link search-stagger"
              :style="{ '--menu-delay': `${250 + index * 40}ms` }"
            >
              {{ category.name }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
