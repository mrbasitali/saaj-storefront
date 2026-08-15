<script setup lang="ts">
type Category = {
  id: number
  name: string
  full_slug: string
  children?: Category[] | null
}

const { $api } = useNuxtApp()

const { data: menuResponse } = await useAsyncData('storefront-menu', () =>
  $api<{ data: Category[] }>('/categories/tree'),
)

const menuCategories = computed(() => menuResponse.value?.data ?? [])
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper-50">
    <StorefrontHeader :categories="menuCategories" />

    <main class="flex-1">
      <slot />
    </main>

    <StorefrontFooter :categories="menuCategories" />
  </div>
</template>
