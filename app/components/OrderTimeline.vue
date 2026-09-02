<script setup lang="ts">
type TimelineEntry = {
  status: string
  note?: string | null
  at?: string | null
}

const props = withDefaults(defineProps<{
  entries?: TimelineEntry[] | null
  currentStatus?: string | null
}>(), {
  entries: () => [],
  currentStatus: 'pending',
})

const { formatDateTime: formatStorefrontDateTime } = useStorefrontDateTime()

const timeline = computed<TimelineEntry[]>(() => {
  if (props.entries?.length) return props.entries
  return [{ status: props.currentStatus || 'pending', note: null, at: null }]
})

function label(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatDate(value?: string | null) {
  return value ? formatStorefrontDateTime(value, { month: 'short' }) : ''
}
</script>

<template>
  <ol class="relative border-l border-charcoal-950/12 pl-7">
    <li
      v-for="(entry, index) in timeline"
      :key="`${entry.status}-${entry.at || index}`"
      class="relative pb-7 last:pb-0"
    >
      <span
        class="absolute -left-[31px] top-[3px] flex h-[9px] w-[9px] items-center justify-center rounded-full"
        :class="index === timeline.length - 1 ? 'bg-charcoal-950' : 'bg-charcoal-300'"
      >
        <span v-if="index === timeline.length - 1" class="h-[3px] w-[3px] rounded-full bg-paper-50" />
      </span>

      <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
        <p class="text-[12px] font-medium text-charcoal-950">{{ label(entry.status) }}</p>
        <p v-if="entry.at" class="text-[9px] uppercase tracking-[0.08em] text-charcoal-400">{{ formatDate(entry.at) }}</p>
      </div>
      <p v-if="entry.note" class="mt-1.5 max-w-2xl text-[11px] leading-5 text-charcoal-500">{{ entry.note }}</p>
    </li>
  </ol>
</template>
