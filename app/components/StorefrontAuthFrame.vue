<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string
  asideTitle?: string
  asideCopy?: string
}>(), {
  eyebrow: 'SAAJ account',
  description: '',
  asideTitle: 'A quieter way to shop SAAJ.',
  asideCopy: 'Keep your delivery details close, revisit orders, save pieces, and move through checkout with less repetition.',
})
</script>

<template>
  <main class="min-h-[calc(100vh-110px)] bg-paper-50">
    <div class="grid min-h-[calc(100vh-110px)] lg:grid-cols-[0.86fr_1.14fr]">
      <aside class="relative hidden overflow-hidden bg-[#26332e] px-10 py-12 text-[#f4f0e7] lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-14">
        <div>
          <p class="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f4f0e7]/55">{{ eyebrow }}</p>
          <h2 class="mt-7 max-w-[560px] font-display text-[54px] font-medium leading-[0.98] tracking-[-0.045em] xl:text-[66px]">
            {{ asideTitle }}
          </h2>
          <p class="mt-7 max-w-md text-[13px] leading-6 text-[#f4f0e7]/68">
            {{ asideCopy }}
          </p>
        </div>

        <div class="grid gap-4 border-t border-white/12 pt-7 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f4f0e7]/45">01</p>
            <p class="mt-2 text-[12px] leading-5 text-[#f4f0e7]/78">Faster checkout</p>
          </div>
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f4f0e7]/45">02</p>
            <p class="mt-2 text-[12px] leading-5 text-[#f4f0e7]/78">Order history</p>
          </div>
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f4f0e7]/45">03</p>
            <p class="mt-2 text-[12px] leading-5 text-[#f4f0e7]/78">Saved pieces</p>
          </div>
        </div>
      </aside>

      <section class="flex items-center px-4 py-14 sm:px-8 lg:px-12 lg:py-16 xl:px-20">
        <div class="mx-auto w-full max-w-[520px]">
          <p class="text-[9px] font-semibold uppercase tracking-[0.22em] text-charcoal-500">{{ eyebrow }}</p>
          <h1 class="mt-4 font-display text-[46px] font-medium leading-[0.98] tracking-[-0.045em] text-charcoal-950 sm:text-[54px]">
            {{ title }}
          </h1>
          <p v-if="description" class="mt-4 max-w-md text-[13px] leading-6 text-charcoal-500">
            {{ description }}
          </p>

          <div class="mt-9">
            <slot />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
