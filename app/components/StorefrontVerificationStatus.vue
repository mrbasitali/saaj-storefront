<script setup lang="ts">
defineProps<{ status: 'verified' | 'pending' | 'optional' }>()

const labels = {
  verified: 'Verified',
  pending: 'Pending',
  optional: 'Optional',
}
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold normal-case tracking-normal"
    :class="status === 'verified' ? 'text-[#355845] dark:text-[#b7d7c5]' : 'text-charcoal-700'"
  >
    <svg v-if="status === 'verified'" viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m3.5 8 3 3 6-6" />
    </svg>
    {{ labels[status] }}
  </span>
</template>
