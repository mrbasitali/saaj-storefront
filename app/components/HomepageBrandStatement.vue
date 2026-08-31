<template>
  <section class="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
    <div class="grid gap-5 border-b border-charcoal-950/[0.08] pb-12 sm:pb-14 lg:grid-cols-[0.55fr_1.45fr] lg:items-end lg:gap-14 lg:pb-16">
      <div class="flex items-center gap-3">
        <span class="h-px w-8 bg-charcoal-950/35" />
        <p class="section-kicker">SAAJ / The wardrobe</p>
      </div>
      <div>
        <h2 class="max-w-4xl font-display text-[clamp(2.15rem,3.6vw,4.25rem)] font-medium leading-[0.98] tracking-[-0.05em] text-charcoal-950">
          Clothes that feel current now, and considered long after.
        </h2>
        <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <p class="max-w-2xl text-[13px] leading-6 text-charcoal-500 sm:text-sm sm:leading-7">
            Built around proportion, texture, and ease — the SAAJ wardrobe is designed to feel polished without feeling overdone.
          </p>
          <NuxtLink to="/shop" class="home-inline-action shrink-0">
            <span>Explore all</span>
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
