<script setup lang="ts">
const values = [
  { title: 'Finishing', description: 'Clean lines and attention to texture.' },
  { title: 'Fit', description: 'Easy proportions with room to move.' },
  { title: 'Styling', description: 'Pieces you can layer and wear on repeat.' },
]
</script>

<template>
  <section aria-label="About SAAJ clothing" class="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
    <dl class="grid divide-y divide-charcoal-950/15 border-y border-charcoal-950/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div v-for="value in values" :key="value.title" class="py-5 sm:px-5 sm:py-7 sm:first:pl-0 lg:px-8 lg:py-9">
        <dt class="font-display text-[clamp(1.75rem,2.6vw,2.75rem)] font-medium leading-none tracking-[-0.025em] text-charcoal-950">
          {{ value.title }}
        </dt>
        <dd class="mt-2 text-sm leading-6 text-charcoal-600">{{ value.description }}</dd>
      </div>
    </dl>
  </section>
</template>
