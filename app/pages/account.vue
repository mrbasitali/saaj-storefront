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
const signOutError = ref('')
const signOutDialog = useTemplateRef('signOutDialog')

const links = [
  { label: 'Overview', to: '/account' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Addresses', to: '/account/addresses' },
  { label: 'Wishlist', to: '/account/wishlist' },
  { label: 'Profile', to: '/account/profile' },
]

const firstName = computed(() => authStore.customer?.name?.trim().split(/\s+/)[0] || 'there')
const accountPath = computed(() => route.path.replace(/\/$/, ''))
const isOverview = computed(() => accountPath.value === '/account')
const verificationComplete = computed(() => {
  const customer = authStore.customer
  if (!customer) return true
  return Boolean(customer.email_verified && (!customer.phone || customer.phone_verified))
})

function isActive(to: string) {
  const path = accountPath.value
  return path === to || (to !== '/account' && path.startsWith(`${to}/`))
}

function currentSection(to: string) {
  if (!isActive(to)) return undefined
  return accountPath.value === to ? 'page' : 'location'
}

function requestSignOut() {
  signOutError.value = ''
  signOutDialog.value?.show()
}

async function logout() {
  if (signingOut.value) return
  signingOut.value = true
  signOutError.value = ''
  try {
    await authStore.logout()
    signOutDialog.value?.close()
    await router.push('/')
  } catch (err: unknown) {
    signOutError.value = extractApiErrorMessage(err, 'Could not sign out. Please try again.')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <section class="min-h-[68vh] bg-paper-50 subpixel-antialiased text-charcoal-950">
    <div class="mx-auto max-w-[1520px] px-5 pb-20 pt-7 sm:px-8 lg:px-10 lg:pb-28 lg:pt-14 xl:px-14">
      <header class="border-b border-charcoal-950/10 pb-5 lg:pb-10" :class="{ 'hidden lg:block': !isOverview }">
        <div class="flex items-end justify-between gap-3 lg:gap-7">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal-700">Your SAAJ</p>
            <h1 class="mt-2 break-words font-display text-[clamp(2.5rem,6vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.055em] text-charcoal-950 lg:mt-3">
              Welcome, {{ firstName }}.
            </h1>
            <p class="mt-5 hidden max-w-xl text-sm leading-6 text-charcoal-700 lg:block">
              Review your orders, saved pieces, delivery details and account preferences in one place.
            </p>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-x-6 lg:flex-row lg:items-center">
            <NuxtLink
              v-if="!verificationComplete"
              to="/verify-account"
              class="hidden items-center gap-2 text-sm font-semibold text-charcoal-800 underline decoration-[#b78b57]/45 underline-offset-4 lg:inline-flex"
            >
              Complete verification
              <span class="h-1.5 w-1.5 rounded-full bg-[#b78b57]" aria-hidden="true" />
            </NuxtLink>
            <button
              type="button"
              :disabled="signingOut"
              class="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-charcoal-800 underline decoration-charcoal-950/25 underline-offset-4 transition hover:text-charcoal-950 disabled:opacity-45 lg:min-h-0"
              @click="requestSignOut"
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
              class="group flex items-center justify-between border-b border-charcoal-950/[0.07] py-4 text-sm font-semibold transition"
              :class="isActive(link.to) ? 'text-charcoal-950' : 'text-charcoal-700 hover:text-charcoal-950'"
            >
              <span>{{ link.label }}</span>
              <span
                class="h-px transition-all duration-300"
                :class="isActive(link.to) ? 'w-7 bg-charcoal-950' : 'w-0 bg-charcoal-950 group-hover:w-4'"
              />
            </NuxtLink>

            <NuxtLink
              to="/track-order"
              class="group flex items-center justify-between py-4 text-sm font-semibold text-charcoal-700 transition hover:text-charcoal-950"
            >
              <span>Track an order</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            </NuxtLink>
          </nav>
        </aside>

        <div class="min-w-0">
          <NuxtLink
            v-if="!isOverview"
            to="/account"
            class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-charcoal-600 lg:hidden"
          >
            <StorefrontIcon name="chevron" :size="18" class="rotate-90" />
            My account
          </NuxtLink>

          <main class="lg:pt-10" :class="isOverview ? 'pt-5' : 'pt-3'">
            <NuxtPage />
          </main>
        </div>
      </div>
    </div>

    <StorefrontConfirmDialog
      ref="signOutDialog"
      title="Sign out of SAAJ?"
      confirm-label="Sign out"
      busy-label="Signing out…"
      :busy="signingOut"
      @confirm="logout"
    >
      <p>You’ll need to sign in again to access your account.</p>
      <p v-if="signOutError" role="alert" class="mt-2 text-[#8c4949] dark:text-rose-200">{{ signOutError }}</p>
    </StorefrontConfirmDialog>
  </section>
</template>
