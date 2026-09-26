<script setup lang="ts">
const route = useRoute()
const { settings } = storeToRefs(useSiteSettingsStore())

const isPrivateOrTransactionalPage = computed(() => {
  const path = route.path
  return path === '/cart'
    || path === '/checkout'
    || path === '/login'
    || path === '/register'
    || path === '/forgot-password'
    || path === '/reset-password'
    || path === '/track-order'
    || path.startsWith('/account')
    || path.startsWith('/order-confirmation')
})

useSeoMeta({
  robots: () => isPrivateOrTransactionalPage.value ? 'noindex,nofollow' : undefined,
})

// Site-wide SEO fallback, set from Settings → SEO & Tracking Scripts.
// Any page that calls useSeoMeta itself (home, products, categories…)
// is registered after this root component and wins the dedupe, so
// this only ever fills in for a page that doesn't set its own.
useSeoMeta({
  title: () => settings.value?.seo?.default_meta_title || undefined,
  description: () => settings.value?.seo?.default_meta_description || undefined,
  ogTitle: () => settings.value?.seo?.default_meta_title || undefined,
  ogDescription: () => settings.value?.seo?.default_meta_description || undefined,
  ogImage: () => settings.value?.seo?.default_og_image_url || undefined,
})
</script>

<template>
  <StorefrontRouteProgress />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
