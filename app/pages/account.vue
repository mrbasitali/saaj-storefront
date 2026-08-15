<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const router = useRouter()

const links = [
  { label: 'Overview', to: '/account' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Addresses', to: '/account/addresses' },
  { label: 'Wishlist', to: '/account/wishlist' },
  { label: 'Profile', to: '/account/profile' },
]

async function logout() {
  await authStore.logout()
  await router.push('/')
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-5 py-12 sm:px-8">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      My account
    </h1>
    <p
      v-if="authStore.customer"
      class="mt-1 text-sm text-ink-500"
    >
      {{ authStore.customer.name }}
    </p>

    <div class="mt-8 grid gap-10 lg:grid-cols-[200px_1fr]">
      <nav class="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="shrink-0 rounded-full px-4 py-2 text-sm text-ink-700 transition hover:bg-stone-200 lg:rounded-xl"
          active-class="!bg-ink-900 !text-stone-50"
        >
          {{ link.label }}
        </NuxtLink>

        <button
          type="button"
          class="shrink-0 rounded-full px-4 py-2 text-left text-sm text-ink-400 transition hover:bg-stone-200 hover:text-red-600 lg:rounded-xl"
          @click="logout"
        >
          Sign out
        </button>
      </nav>

      <div>
        <NuxtPage />
      </div>
    </div>
  </div>
</template>
