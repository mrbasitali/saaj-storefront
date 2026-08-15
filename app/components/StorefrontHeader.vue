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

const mobileMenuOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')

const visibleCategories = computed(() => props.categories.slice(0, 4))

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
  searchOpen.value = false
})

function submitSearch() {
  const query = searchQuery.value.trim()

  if (!query) return

  searchOpen.value = false
  navigateTo({ path: '/shop', query: { search: query } })
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-paper-50/95 backdrop-blur-xl">
    <div class="border-b border-black/5 bg-charcoal-950 text-white">
      <div class="mx-auto flex min-h-8 max-w-[1600px] items-center justify-center px-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] sm:px-8">
        The new edit is here · Discover SAAJ
      </div>
    </div>

    <div class="border-b border-black/8">
      <div class="mx-auto grid h-[72px] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:h-[78px] lg:px-10">
        <nav class="hidden min-w-0 items-center gap-5 lg:flex xl:gap-7">
          <NuxtLink
            to="/shop"
            class="nav-link"
          >
            New in
          </NuxtLink>

          <div
            v-for="category in visibleCategories"
            :key="category.id"
            class="group relative"
          >
            <NuxtLink
              :to="`/shop?category=${category.full_slug}`"
              class="nav-link inline-flex items-center gap-1.5"
            >
              {{ category.name }}
              <svg
                v-if="category.children?.length"
                class="h-3 w-3 transition duration-200 group-hover:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <path d="m7 9.5 5 5 5-5" />
              </svg>
            </NuxtLink>

            <div
              v-if="category.children?.length"
              class="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 pt-6 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
            >
              <div class="border border-black/8 bg-paper-50 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.09)]">
                <NuxtLink
                  :to="`/shop?category=${category.full_slug}`"
                  class="mb-3 block border-b border-black/8 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal-950"
                >
                  Shop all {{ category.name }}
                </NuxtLink>

                <div class="space-y-2.5">
                  <NuxtLink
                    v-for="child in category.children"
                    :key="child.id"
                    :to="`/shop?category=${child.full_slug}`"
                    class="block text-[13px] text-charcoal-600 transition hover:text-charcoal-950"
                  >
                    {{ child.name }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          class="flex h-10 w-10 items-center justify-start text-charcoal-950 lg:hidden"
          @click="mobileMenuOpen = true"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </button>

        <NuxtLink
          to="/"
          class="flex items-center justify-center px-4"
          aria-label="SAAJ home"
        >
          <img
            v-if="siteSettings.settings?.logos.navbar_light"
            :src="siteSettings.settings.logos.navbar_light"
            alt="SAAJ"
            class="max-h-10 w-auto max-w-[150px] object-contain sm:max-h-11 sm:max-w-[175px]"
          >
          <span
            v-else
            class="text-[22px] font-semibold uppercase tracking-[0.24em] text-charcoal-950 sm:text-[24px]"
          >
            SAAJ
          </span>
        </NuxtLink>

        <div class="flex items-center justify-end gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Search"
            class="header-icon-button"
            @click="searchOpen = true"
          >
            <svg
              class="h-[19px] w-[19px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.55"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
          </button>

          <NuxtLink
            to="/account/wishlist"
            aria-label="Wishlist"
            class="header-icon-button hidden sm:flex"
          >
            <svg
              class="h-[19px] w-[19px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M12 20.5s-7.6-4.7-9.6-9.4C.9 7.7 2.6 4.5 5.8 4.1c2-.2 3.7.7 4.8 2.5 1.2-1.8 2.9-2.7 4.9-2.5 3.2.4 4.9 3.6 3.4 7C16.8 15.8 12 20.5 12 20.5Z" />
            </svg>
          </NuxtLink>

          <NuxtLink
            :to="authStore.isLoggedIn ? '/account' : '/login'"
            aria-label="Account"
            class="header-icon-button hidden sm:flex"
          >
            <svg
              class="h-[19px] w-[19px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.6 20c1.6-3.5 4.3-5.2 7.4-5.2s5.8 1.7 7.4 5.2" />
            </svg>
          </NuxtLink>

          <NuxtLink
            to="/cart"
            aria-label="Shopping bag"
            class="header-icon-button relative"
          >
            <svg
              class="h-[19px] w-[19px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M4.5 7h15l-1.2 12H5.7L4.5 7Z" />
              <path d="M8.4 7V5.6a3.6 3.6 0 0 1 7.2 0V7" />
            </svg>
            <span
              v-if="cart.totalItems > 0"
              class="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-charcoal-950 px-1 text-[9px] font-semibold text-white"
            >
              {{ cart.totalItems > 99 ? '99+' : cart.totalItems }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div
        v-if="searchOpen"
        class="absolute inset-x-0 top-full border-b border-black/8 bg-paper-50 shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
      >
        <form
          class="mx-auto flex max-w-4xl items-center gap-4 px-5 py-7 sm:px-8 sm:py-9"
          @submit.prevent="submitSearch"
        >
          <svg
            class="h-5 w-5 shrink-0 text-charcoal-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.2 4.2" />
          </svg>

          <input
            v-model="searchQuery"
            type="search"
            autofocus
            placeholder="Search SAAJ"
            class="min-w-0 flex-1 bg-transparent text-lg text-charcoal-950 outline-none placeholder:text-charcoal-300 sm:text-xl"
          >

          <button
            type="button"
            aria-label="Close search"
            class="text-charcoal-500 transition hover:text-charcoal-950"
            @click="searchOpen = false"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
        </form>
      </div>
    </Transition>

    <Transition name="drawer-backdrop">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-[60] bg-black/35 lg:hidden"
        @click="mobileMenuOpen = false"
      />
    </Transition>

    <Transition name="drawer">
      <aside
        v-if="mobileMenuOpen"
        class="fixed inset-y-0 left-0 z-[70] flex w-[min(90vw,420px)] flex-col bg-paper-50 lg:hidden"
      >
        <div class="flex h-[72px] items-center justify-between border-b border-black/8 px-5">
          <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-500">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            class="header-icon-button"
            @click="mobileMenuOpen = false"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-5 py-6">
          <NuxtLink
            to="/shop"
            class="mobile-main-link"
          >
            New in
          </NuxtLink>

          <div
            v-for="category in categories"
            :key="category.id"
            class="border-b border-black/8 py-4"
          >
            <NuxtLink
              :to="`/shop?category=${category.full_slug}`"
              class="mobile-main-link !border-0 !py-0"
            >
              {{ category.name }}
            </NuxtLink>

            <div
              v-if="category.children?.length"
              class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2"
            >
              <NuxtLink
                v-for="child in category.children"
                :key="child.id"
                :to="`/shop?category=${child.full_slug}`"
                class="text-[13px] text-charcoal-500 transition hover:text-charcoal-950"
              >
                {{ child.name }}
              </NuxtLink>
            </div>
          </div>

          <div class="mt-7 space-y-4">
            <NuxtLink
              to="/account/wishlist"
              class="flex items-center gap-3 text-sm text-charcoal-700"
            >
              <span>Wishlist</span>
            </NuxtLink>
            <NuxtLink
              :to="authStore.isLoggedIn ? '/account' : '/login'"
              class="flex items-center gap-3 text-sm text-charcoal-700"
            >
              <span>{{ authStore.isLoggedIn ? 'My account' : 'Sign in' }}</span>
            </NuxtLink>
            <NuxtLink
              to="/track-order"
              class="flex items-center gap-3 text-sm text-charcoal-700"
            >
              <span>Track order</span>
            </NuxtLink>
          </div>
        </nav>
      </aside>
    </Transition>
  </header>
</template>
