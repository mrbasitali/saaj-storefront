<script setup lang="ts">
const authStore = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl bg-stone-100 p-6">
      <p class="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-400">
        Account
      </p>
      <p class="mt-2 text-[15px] text-ink-900">
        {{ authStore.customer?.name }}
      </p>
      <p class="text-sm text-ink-500">
        {{ authStore.customer?.email }}
      </p>
      <p
        v-if="authStore.customer && !authStore.customer.email_verified"
        class="mt-3 text-sm text-brass-600"
      >
        Your email isn't verified yet — check your inbox for the verification link.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <NuxtLink
        to="/account/orders"
        class="rounded-2xl border border-stone-200 p-5 transition hover:border-ink-900"
      >
        <p class="text-[15px] font-medium text-ink-900">
          Orders
        </p>
        <p class="mt-1 text-sm text-ink-500">
          Track and review past orders
        </p>
      </NuxtLink>

      <NuxtLink
        to="/account/addresses"
        class="rounded-2xl border border-stone-200 p-5 transition hover:border-ink-900"
      >
        <p class="text-[15px] font-medium text-ink-900">
          Addresses
        </p>
        <p class="mt-1 text-sm text-ink-500">
          Manage delivery addresses
        </p>
      </NuxtLink>

      <NuxtLink
        to="/account/wishlist"
        class="rounded-2xl border border-stone-200 p-5 transition hover:border-ink-900"
      >
        <p class="text-[15px] font-medium text-ink-900">
          Wishlist
        </p>
        <p class="mt-1 text-sm text-ink-500">
          Pieces you've saved
        </p>
      </NuxtLink>
    </div>
  </div>
</template>
