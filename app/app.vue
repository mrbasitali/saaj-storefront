<script setup lang="ts">
const route = useRoute()

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
</script>

<template>
  <StorefrontRouteProgress />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
