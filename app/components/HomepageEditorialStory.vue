<script setup lang="ts">
defineProps<{
  image: string | null
  loading?: boolean
}>()
</script>

<template>
  <section class="mx-auto max-w-[1600px] px-0 py-0 lg:px-10 lg:py-24">
    <div class="home-editorial-story relative isolate overflow-hidden bg-mist-100 lg:min-h-[690px]">
      <div class="relative aspect-[4/5] min-h-[520px] sm:aspect-[16/10] sm:min-h-[600px] lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-0">
        <NuxtImg v-if="image" :src="image" alt="SAAJ editorial" class="absolute inset-0 h-full w-full object-cover" loading="lazy" sizes="100vw lg:1520px" />
        <StorefrontSkeleton v-else-if="loading" class="absolute inset-0" />
        <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#cfd8d0,#edeae2)]" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/32 via-transparent to-black/5 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-black/10" />
      </div>

      <div class="relative z-10 -mt-24 px-5 pb-5 sm:-mt-28 sm:px-8 sm:pb-8 lg:ml-auto lg:mr-10 lg:mt-0 lg:flex lg:min-h-[690px] lg:w-[44%] lg:items-end lg:px-0 lg:pb-10 xl:mr-14 xl:w-[40%]">
        <div class="w-full bg-paper-50/96 p-7 shadow-[0_22px_70px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-9 lg:p-10 xl:p-12">
          <div class="flex items-center gap-3">
            <span class="h-px w-7 bg-charcoal-950/35" />
            <p class="section-kicker">The SAAJ point of view</p>
          </div>
          <h2 class="mt-5 font-display text-[clamp(2.75rem,4.3vw,5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-charcoal-950">Less noise.<br>More character.</h2>
          <p class="mt-5 max-w-lg text-[13px] leading-6 text-charcoal-600 sm:text-sm sm:leading-7">We prefer pieces that earn attention through cut, movement, texture, and detail — not through excess.</p>
          <NuxtLink to="/shop" class="home-editorial-cta mt-7">
            <span>Discover SAAJ</span>
            <span class="home-editorial-cta-icon">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
