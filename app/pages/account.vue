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
  if (to === '/account') return route.path === '/account'
  return route.path.startsWith(to)
}

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
    <div class="mx-auto max-w-[1520px] px-5 pb-20 pt-10 sm:px-8 lg:px-10 lg:pb-28 lg:pt-14 xl:px-14">
      <header class="border-b border-charcoal-950/10 pb-8 lg:pb-10">
        <div class="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-charcoal-400">Your SAAJ</p>
            <h1 class="mt-3 font-display text-[clamp(2.8rem,6vw,5.8rem)] font-medium leading-[0.88] tracking-[-0.055em] text-charcoal-950">
              Welcome, {{ firstName }}.
            </h1>
            <p class="mt-5 max-w-xl text-[12px] leading-6 text-charcoal-500">
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
          <nav
            class="account-mobile-nav sticky top-[68px] z-40 -mx-5 flex gap-6 overflow-x-auto border-b border-charcoal-950/10 bg-paper-50/95 px-5 py-1 shadow-[0_10px_28px_rgba(15,17,14,0.035)] backdrop-blur-xl sm:-mx-8 sm:top-[72px] sm:px-8 lg:hidden"
            aria-label="Account navigation"
          >
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="relative shrink-0 py-5 text-[9px] font-semibold uppercase tracking-[0.14em] transition"
              :class="isActive(link.to) ? 'text-charcoal-950' : 'text-charcoal-400'"
            >
              {{ link.label }}
              <span v-if="isActive(link.to)" class="absolute inset-x-0 bottom-0 h-px bg-charcoal-950" />
            </NuxtLink>
            <NuxtLink to="/track-order" class="shrink-0 py-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Track</NuxtLink>
          </nav>

          <main class="pt-9 lg:pt-10">
            <NuxtPage />
          </main>
        </div>
      </div>
    </div>
  </section>
</template>
