<script setup lang="ts">
type GlassVariant = 'nav' | 'menu' | 'mobile-menu' | 'toolbar' | 'action'

const props = withDefaults(defineProps<{
  variant?: GlassVariant
}>(), {
  variant: 'nav',
})

const filters: Record<GlassVariant, string> = {
  nav: 'blur(30px) saturate(165%)',
  menu: 'blur(32px) saturate(168%)',
  'mobile-menu': 'blur(28px) saturate(160%)',
  toolbar: 'blur(28px) saturate(160%)',
  action: 'blur(26px) saturate(156%)',
}

const glassStyle = computed(() => {
  const filter = filters[props.variant]
  return `backdrop-filter:${filter};-webkit-backdrop-filter:${filter};`
})
</script>

<template>
  <div
    aria-hidden="true"
    class="storefront-real-glass-layer"
    :class="`is-${props.variant}`"
    :style="glassStyle"
  />
</template>
