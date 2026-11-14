<script setup lang="ts">
defineProps<{
  image: string | null
}>()
</script>

<template>
  <section v-if="image" class="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 sm:py-12 lg:px-10" aria-labelledby="home-lookbook-title">
    <div class="lookbook-banner relative isolate overflow-hidden bg-[#302923] text-white">
      <NuxtImg
        :src="image"
        alt="SAAJ lookbook"
        class="block aspect-[4/5] w-full object-cover object-top sm:aspect-[5/3] md:aspect-[2/1]"
        loading="lazy"
        sizes="100vw xl:1520px"
      />
      <div class="lookbook-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
      <div class="absolute inset-0 flex flex-col items-start justify-end px-5 pb-6 sm:px-9 sm:pb-10 md:w-[48%] md:justify-center md:px-[clamp(2.5rem,5vw,6rem)] md:pb-0">
        <h2 id="home-lookbook-title" class="font-display text-[clamp(2.75rem,5.3vw,5.75rem)] font-medium leading-[0.92] tracking-[-0.045em]">
          The lookbook
        </h2>
        <NuxtLink to="/shop" class="lookbook-link mt-4 inline-flex min-h-11 max-w-full items-center gap-3 border border-white/75 px-4 text-[11px] font-semibold tracking-[0.04em] sm:mt-6 sm:px-5 sm:text-xs">
          <span>Shop the collection</span>
          <svg aria-hidden="true" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="size-4 shrink-0"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lookbook-scrim {
  background: linear-gradient(0deg, rgb(21 16 13 / 0.86), rgb(21 16 13 / 0.53) 26%, transparent 61%);
}

.lookbook-link {
  transition: color 220ms ease, background-color 220ms ease;
}

.lookbook-link:is(:hover, :focus-visible) {
  background: white;
  color: #211d19;
}

.lookbook-link:focus-visible {
  outline: 2px solid white;
  outline-offset: 3px;
}

@media (min-width: 768px) {
  .lookbook-scrim {
    background: linear-gradient(90deg, rgb(21 16 13 / 0.84), rgb(21 16 13 / 0.6) 30%, transparent 62%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lookbook-link {
    transition: none;
  }
}
</style>
