<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
  children?: Category[] | null
}

type NewArrivalStatusResponse = {
  data: {
    count: number
    has_new_arrivals: boolean
  }
}

const { $api } = useNuxtApp()

const { data: menuResponse } = await useAsyncData('storefront-menu', () =>
  $api<{ data: Category[] }>('/categories/tree'),
)

const { data: newArrivalStatusResponse } = await useAsyncData('storefront-new-arrival-status', () =>
  $api<NewArrivalStatusResponse>('/products/new-arrival-status'),
)

const menuCategories = computed(() => menuResponse.value?.data ?? [])
const showNewIn = computed(() => newArrivalStatusResponse.value?.data?.has_new_arrivals === true)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper-50 transition-colors duration-300">
    <StorefrontHeader :categories="menuCategories" :show-new-in="showNewIn" />

    <main class="flex-1">
      <slot />
    </main>

    <StorefrontFooter :categories="menuCategories" :show-new-in="showNewIn" />
  </div>
</template>
