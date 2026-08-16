<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
}

const props = defineProps<{
  categories: Category[]
}>()

const siteSettings = useSiteSettingsStore()
const authStore = useAuthStore()

const currentYear = new Date().getFullYear()
const footerCategories = computed(() => props.categories.slice(0, 6))
const footerLogo = computed(() =>
  siteSettings.settings?.logos.footer_dark
  || siteSettings.settings?.logos.navbar_dark
  || null,
)

const emailLink = computed(() => {
  const email = siteSettings.settings?.contact.email?.trim()
  return email ? `mailto:${email}` : null
})

const phoneLink = computed(() => {
  const phone = siteSettings.settings?.contact.phone?.trim()
  return phone ? `tel:${phone.replace(/\s+/g, '')}` : null
})

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

</script>

<template>
  <footer class="storefront-footer text-white">
    <div class="mx-auto max-w-[1600px] px-5 pb-7 pt-14 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
      <div class="grid gap-12 border-b border-white/12 pb-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr] lg:gap-10 lg:pb-18">
        <div class="max-w-md">
          <NuxtLink
            to="/"
            aria-label="SAAJ home"
            class="inline-flex"
          >
            <img
              v-if="footerLogo"
              :src="footerLogo"
              alt="SAAJ"
              class="max-h-11 w-auto max-w-[180px] object-contain"
            >
            <span
              v-else
              class="text-2xl font-semibold uppercase tracking-[0.24em]"
            >
              SAAJ
            </span>
          </NuxtLink>

          <p class="mt-6 max-w-sm text-sm leading-7 text-white/58">
            Modern clothing with a quiet point of view — considered pieces, thoughtful details, and an easy sense of style.
          </p>

          <div
            v-if="siteSettings.settings?.social_links && Object.keys(siteSettings.settings.social_links).length"
            class="mt-7 flex flex-wrap gap-4"
          >
            <a
              v-for="(url, platform) in siteSettings.settings.social_links"
              :key="platform"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="String(platform)"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 text-white/70 transition hover:border-white/50 hover:text-white"
            >
              <SocialIcon
                :platform="String(platform)"
                class="h-4 w-4"
              />
            </a>
          </div>
        </div>

        <div>
          <p class="footer-heading">Shop</p>
          <ul class="mt-5 space-y-3.5">
            <li>
              <NuxtLink to="/shop" class="footer-link">New in</NuxtLink>
            </li>
            <li
              v-for="category in footerCategories"
              :key="category.id"
            >
              <NuxtLink
                :to="categoryPath(category.full_slug)"
                class="footer-link"
              >
                {{ category.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <p class="footer-heading">Customer care</p>
          <ul class="mt-5 space-y-3.5">
            <li><NuxtLink to="/track-order" class="footer-link">Track order</NuxtLink></li>
            <li><NuxtLink to="/cart" class="footer-link">Shopping bag</NuxtLink></li>
            <li>
              <NuxtLink
                :to="authStore.isLoggedIn ? '/account' : '/login'"
                class="footer-link"
              >
                {{ authStore.isLoggedIn ? 'My account' : 'Sign in' }}
              </NuxtLink>
            </li>
            <li><NuxtLink to="/account/wishlist" class="footer-link">Wishlist</NuxtLink></li>
          </ul>
        </div>

        <div>
          <p class="footer-heading">Contact</p>
          <div class="mt-5 space-y-3.5 text-sm leading-6 text-white/58">
            <a
              v-if="emailLink"
              :href="emailLink"
              class="block transition hover:text-white"
            >
              {{ siteSettings.settings?.contact.email }}
            </a>
            <a
              v-if="phoneLink"
              :href="phoneLink"
              class="block transition hover:text-white"
            >
              {{ siteSettings.settings?.contact.phone }}
            </a>
            <div
              v-if="siteSettings.settings?.contact.address"
              class="site-contact-address max-w-xs leading-6 [&_p]:m-0"
              v-html="siteSettings.settings.contact.address"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 pt-7 text-[11px] uppercase tracking-[0.12em] text-white/36 sm:flex-row sm:items-center sm:justify-between">
        <p>© {{ currentYear }} SAAJ. All rights reserved.</p>
        <p>Adornment, considered.</p>
      </div>
    </div>
  </footer>
</template>
