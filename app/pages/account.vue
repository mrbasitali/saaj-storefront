<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'My Account | SAAJ',
  robots: 'noindex,nofollow',
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const signingOut = ref(false)
const mobileMenu = ref<HTMLDetailsElement | null>(null)

const links = [
  { label: 'Overview', to: '/account' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Addresses', to: '/account/addresses' },
  { label: 'Wishlist', to: '/account/wishlist' },
  { label: 'Profile', to: '/account/profile' },
]

const firstName = computed(() => authStore.customer?.name?.trim().split(/\s+/)[0] || 'there')
const verificationComplete = computed(() => {
  const customer = authStore.customer
  if (!customer) return true
  return Boolean(customer.email_verified && (!customer.phone || customer.phone_verified))
})

function isActive(to: string) {
  const path = route.path.replace(/\/$/, '')
  return path === to || (to !== '/account' && path.startsWith(`${to}/`))
}

const activeSection = computed(() => links.find(link => isActive(link.to))?.label ?? 'Overview')

function currentSection(to: string) {
  if (!isActive(to)) return undefined
  return route.path.replace(/\/$/, '') === to ? 'page' : 'location'
}

function closeMobileMenu() {
  if (mobileMenu.value) mobileMenu.value.open = false
}

watch(() => route.path, closeMobileMenu)

async function logout() {
  if (signingOut.value) return
  signingOut.value = true
  await authStore.logout()
  await router.push('/')
  signingOut.value = false
}
</script>

<template>
  <section class="min-h-[68vh] bg-paper-50 text-charcoal-950">
    <div class="mx-auto max-w-[1520px] px-5 pb-20 pt-7 sm:px-8 lg:px-10 lg:pb-28 lg:pt-14 xl:px-14">
      <header class="border-b border-charcoal-950/10 pb-5 lg:pb-10">
        <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-7">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-charcoal-400">Your SAAJ</p>
            <h1 class="mt-2 break-words font-display text-[clamp(2.5rem,6vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.055em] text-charcoal-950 lg:mt-3">
              Welcome, {{ firstName }}.
            </h1>
            <p class="mt-5 hidden max-w-xl text-[12px] leading-6 text-charcoal-500 lg:block">
              Review your orders, saved pieces, delivery details and account preferences in one place.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
            <NuxtLink
              v-if="!verificationComplete"
              to="/verify-account"
              class="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#89683f] underline decoration-[#b78b57]/45 underline-offset-4"
            >
              Complete verification
              <span class="h-1.5 w-1.5 rounded-full bg-[#b78b57]" />
            </NuxtLink>
            <button
              type="button"
              :disabled="signingOut"
              class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-500 underline decoration-charcoal-950/20 underline-offset-4 transition hover:text-charcoal-950 disabled:opacity-45"
              @click="logout"
            >
              {{ signingOut ? 'Signing out…' : 'Sign out' }}
            </button>
          </div>
        </div>
      </header>

      <div class="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-20">
        <aside class="hidden border-r border-charcoal-950/10 pr-8 pt-10 lg:block">
          <nav class="sticky top-[138px] space-y-1" aria-label="Account navigation">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              :aria-current="currentSection(link.to)"
              class="group flex items-center justify-between border-b border-charcoal-950/[0.07] py-4 text-[10px] font-semibold uppercase tracking-[0.15em] transition"
              :class="isActive(link.to) ? 'text-charcoal-950' : 'text-charcoal-400 hover:text-charcoal-950'"
            >
              <span>{{ link.label }}</span>
              <span
                class="h-px transition-all duration-300"
                :class="isActive(link.to) ? 'w-7 bg-charcoal-950' : 'w-0 bg-charcoal-950 group-hover:w-4'"
              />
            </NuxtLink>

            <NuxtLink
              to="/track-order"
              class="group flex items-center justify-between py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal-400 transition hover:text-charcoal-950"
            >
              <span>Track an order</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            </NuxtLink>
          </nav>
        </aside>

        <div class="min-w-0">
          <details ref="mobileMenu" class="group mt-4 border border-charcoal-950/12 lg:hidden">
            <summary class="account-menu-trigger flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-2.5">
              <span class="grid gap-0.5">
                <span class="text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-500">Account menu</span>
                <span class="text-sm font-semibold">{{ activeSection }}</span>
              </span>
              <StorefrontIcon name="chevron" :size="18" class="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>

            <nav class="grid grid-cols-2 gap-1 border-t border-charcoal-950/10 p-2" aria-label="Account navigation">
              <NuxtLink
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                :aria-current="currentSection(link.to)"
                class="flex min-h-11 items-center px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2"
                :class="isActive(link.to) ? 'bg-charcoal-950/[0.07] font-semibold' : 'text-charcoal-600 hover:bg-charcoal-950/[0.04]'"
                @click="closeMobileMenu"
              >
                {{ link.label }}
              </NuxtLink>
              <NuxtLink to="/track-order" class="flex min-h-11 items-center px-3 py-2.5 text-sm text-charcoal-600 hover:bg-charcoal-950/[0.04]">
                Track an order
              </NuxtLink>
            </nav>
          </details>

          <main class="pt-6 lg:pt-10">
            <NuxtPage />
          </main>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.account-menu-trigger {
  list-style: none;
}

.account-menu-trigger::-webkit-details-marker {
  display: none;
}

.account-menu-trigger:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -3px;
}
</style>
