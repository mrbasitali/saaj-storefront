<script setup lang="ts">
// Phosphor Icons v2.1.1 and Bootstrap Icons v1.13.2.
// The heart and moon use Bootstrap's original SVG paths. See StorefrontIcon.LICENSE.txt.
type IconShape = { silhouette: string, shade?: string, viewBox?: string, fillRule?: 'evenodd' }

const icons = {
  search: {
    silhouette: 'M168,112a56,56,0,1,1-56-56A56,56,0,0,1,168,112Zm61.66,117.66a8,8,0,0,1-11.32,0l-50.06-50.07a88,88,0,1,1,11.32-11.31l50.06,50.06A8,8,0,0,1,229.66,229.66ZM112,184a72,72,0,1,0-72-72A72.08,72.08,0,0,0,112,184Z',
  },
  moon: {
    viewBox: '-3 -3 22 22',
    silhouette: 'M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278',
  },
  sun: {
    silhouette: 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm8,24a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
  },
  account: {
    silhouette: 'M184 86a56 56 0 1 1-112 0 56 56 0 1 1 112 0Z',
    shade: 'M30 223c0-38 45-71 98-71s98 33 98 71H30Z',
  },
  bag: {
    silhouette: 'M128 24a40 40 0 0 1 40 40v18h-16V64a24 24 0 0 0-48 0v18H88V64a40 40 0 0 1 40-40Z',
    shade: 'M48 78h160a12 12 0 0 1 12 13l-11 125a12 12 0 0 1-12 11H59a12 12 0 0 1-12-11L36 91a12 12 0 0 1 12-13Z',
  },
  heart: {
    viewBox: '-3 -3 22 22',
    silhouette: 'M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314',
    fillRule: 'evenodd',
  },
  package: {
    silhouette: 'M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.35,44L178.57,92.29l-80.35-44Zm0,88L47.65,76,81.56,57.43l80.35,44Zm88,55.85h0l-80,43.79V133.83l32-17.51V152a8,8,0,0,0,16,0V107.56l32-17.51v85.76Z',
    shade: 'M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z',
  },
  pin: {
    silhouette: 'M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z',
  },
  chevron: {
    silhouette: 'M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z',
  },
  close: {
    silhouette: 'M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z',
  },
} satisfies Record<string, IconShape>

const props = withDefaults(defineProps<{
  name: keyof typeof icons
  size?: number
  emphasized?: boolean
}>(), {
  size: 20,
  emphasized: false,
})

const icon = computed<IconShape>(() => icons[props.name])
</script>

<template>
  <svg :viewBox="icon.viewBox ?? '-16 -16 288 288'" :width="size" :height="size" fill="none" aria-hidden="true" focusable="false" class="storefront-icon shrink-0" :class="{ 'is-emphasized': emphasized }">
    <path v-if="icon.shade" :d="icon.shade" class="icon-secondary" />
    <path :d="icon.silhouette" :fill-rule="icon.fillRule" class="icon-primary" />
  </svg>
</template>

<style scoped>
.storefront-icon {
  --icon-primary: #62615e;
  --icon-secondary: #a4a19b;
}

html.dark .storefront-icon {
  --icon-primary: #d9d7d3;
  --icon-secondary: #898681;
}

.storefront-icon.is-emphasized {
  --icon-primary: var(--color-charcoal-950);
}

.icon-primary { fill: var(--icon-primary); }
.icon-secondary { fill: var(--icon-secondary); }
</style>
