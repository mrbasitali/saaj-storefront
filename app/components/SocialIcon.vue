<script setup lang="ts">
defineProps<{
  platform: string
}>()
</script>

<template>
  <svg
    v-if="platform === 'facebook'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="4"
    />
    <path d="M14 8.5h-1.5A2 2 0 0 0 10.5 10.5V13M9 13h4.5M12.5 13V21" />
  </svg>

  <svg
    v-else-if="platform === 'instagram'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="5"
    />
    <circle
      cx="12"
      cy="12"
      r="4"
    />
    <circle
      cx="17.2"
      cy="6.8"
      r="0.8"
      fill="currentColor"
      stroke="none"
    />
  </svg>

  <svg
    v-else-if="platform === 'tiktok'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 4c0 2.5 1.8 4.2 4 4.4" />
  </svg>

  <svg
    v-else-if="platform === 'youtube'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="4"
    />
    <path
      d="M10.5 9.5l4 2.5-4 2.5v-5Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>

  <svg
    v-else-if="platform === 'whatsapp'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <path d="M6 20l1.2-3.4A7.5 7.5 0 1 1 10 19.3L6 20Z" />
    <path d="M9 10.5c0 3 2.5 5.5 5.5 5.5" />
  </svg>

  <svg
    v-else-if="platform === 'twitter'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
  >
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
</template>
