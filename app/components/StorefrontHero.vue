<script setup lang="ts">
type HeroSlide = {
  id: number | string
  media_type: 'image' | 'video'
  desktop_media_url: string | null
  mobile_media_url?: string | null
  poster_url?: string | null
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  alt_text?: string | null
  primary_cta_label?: string | null
  primary_cta_url?: string | null
  secondary_cta_label?: string | null
  secondary_cta_url?: string | null
  text_position?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center'
  text_theme?: 'light' | 'dark'
  overlay_strength?: number
}

type HeroConfig = {
  enabled: boolean
  mode: 'single' | 'slider'
  autoplay: boolean
  autoplay_delay: number
  pause_on_hover: boolean
  show_arrows: boolean
  show_dots: boolean
}

const props = defineProps<{
  config: HeroConfig
  slides: HeroSlide[]
}>()

const activeIndex = ref(0)
const previousIndex = ref<number | null>(null)
const paused = ref(false)
const reduceMotion = ref(false)
const progress = ref(0)

let animationFrameId: number | null = null
let lastFrameAt: number | null = null
let elapsedInCycle = 0
let mediaQuery: MediaQueryList | null = null
let previousReleaseTimer: ReturnType<typeof setTimeout> | null = null

const effectiveSlides = computed(() =>
  props.config.mode === 'single' ? props.slides.slice(0, 1) : props.slides,
)

const currentSlide = computed(() => effectiveSlides.value[activeIndex.value] ?? null)
const canSlide = computed(() => props.config.mode === 'slider' && effectiveSlides.value.length > 1)
const autoplayDelay = computed(() => Math.max(3000, Number(props.config.autoplay_delay) || 6000))

const contentPositionClass = computed(() => {
  const position = currentSlide.value?.text_position ?? 'bottom-left'

  return {
    'bottom-left': 'items-end justify-start text-left',
    'center-left': 'items-center justify-start text-left',
    'center': 'items-center justify-center text-center',
    'bottom-center': 'items-end justify-center text-center',
  }[position]
})

const contentWidthClass = computed(() => {
  const position = currentSlide.value?.text_position ?? 'bottom-left'
  return position === 'center' || position === 'bottom-center'
    ? 'mx-auto max-w-[800px]'
    : 'max-w-[720px]'
})

const isDarkText = computed(() => currentSlide.value?.text_theme === 'dark')
const overlayStyle = computed(() => {
  const strength = Math.max(0, Math.min(80, currentSlide.value?.overlay_strength ?? 35)) / 100

  return {
    background: isDarkText.value
      ? `rgba(247, 246, 242, ${Math.min(0.72, strength * 0.82)})`
      : `rgba(0, 0, 0, ${strength})`,
  }
})

function shouldAutoplay() {
  return import.meta.client
    && canSlide.value
    && props.config.autoplay
    && !paused.value
    && !reduceMotion.value
    && document.visibilityState === 'visible'
}

function stopClock() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  lastFrameAt = null
}

function resetCycle() {
  elapsedInCycle = 0
  progress.value = 0
  lastFrameAt = null
}


function setActiveIndex(index: number) {
  if (!effectiveSlides.value.length) return

  const normalized = (index + effectiveSlides.value.length) % effectiveSlides.value.length
  if (normalized === activeIndex.value) return

  previousIndex.value = activeIndex.value
  activeIndex.value = normalized

  if (previousReleaseTimer) clearTimeout(previousReleaseTimer)
  previousReleaseTimer = setTimeout(() => {
    previousIndex.value = null
    previousReleaseTimer = null
  }, reduceMotion.value ? 20 : 900)
}

function advance(reset = true) {
  if (!effectiveSlides.value.length) return
  setActiveIndex(activeIndex.value + 1)
  if (reset) resetCycle()
}

function tick(timestamp: number) {
  if (!shouldAutoplay()) {
    animationFrameId = null
    lastFrameAt = null
    return
  }

  if (lastFrameAt === null) lastFrameAt = timestamp

  const delta = Math.max(0, timestamp - lastFrameAt)
  lastFrameAt = timestamp
  elapsedInCycle += delta

  if (elapsedInCycle >= autoplayDelay.value) {
    // The slide change and progress reset happen from the same clock, so
    // the indicator can never finish without the carousel advancing.
    advance(false)
    elapsedInCycle %= autoplayDelay.value
  }

  progress.value = Math.min(100, (elapsedInCycle / autoplayDelay.value) * 100)
  animationFrameId = requestAnimationFrame(tick)
}

function startClock() {
  stopClock()
  if (!shouldAutoplay()) return
  animationFrameId = requestAnimationFrame(tick)
}

function restartClock() {
  resetCycle()
  startClock()
}

function goTo(index: number) {
  if (!effectiveSlides.value.length) return
  setActiveIndex(index)
  restartClock()
}

function previous() {
  goTo(activeIndex.value - 1)
}

function next() {
  goTo(activeIndex.value + 1)
}

function onMouseEnter() {
  if (!props.config.pause_on_hover) return
  paused.value = true
  stopClock()
}

function onMouseLeave() {
  if (!props.config.pause_on_hover) return
  paused.value = false
  startClock()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') startClock()
  else stopClock()
}

watch(
  [() => props.config.autoplay, () => props.config.autoplay_delay, () => props.config.mode, () => props.slides.length],
  () => {
    if (activeIndex.value >= effectiveSlides.value.length) activeIndex.value = 0
    restartClock()
  },
)

watch(effectiveSlides, (slides) => {
  if (activeIndex.value >= slides.length) {
    activeIndex.value = 0
    restartClock()
  }
}, { deep: false })

const onMotionChange = (event: MediaQueryListEvent) => {
  reduceMotion.value = event.matches
  if (event.matches) {
    stopClock()
    progress.value = 100
  } else {
    restartClock()
  }
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion.value = mediaQuery.matches
  mediaQuery.addEventListener?.('change', onMotionChange)
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (reduceMotion.value) progress.value = 100
  else startClock()
})

onBeforeUnmount(() => {
  stopClock()
  if (previousReleaseTimer) clearTimeout(previousReleaseTimer)
  mediaQuery?.removeEventListener?.('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <section
    v-if="config.enabled && currentSlide"
    class="group relative isolate min-h-[640px] overflow-hidden bg-mist-100 sm:min-h-[700px] lg:min-h-[calc(100svh-114px)]"
    aria-roledescription="carousel"
    aria-label="SAAJ featured collection"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Keep every slide stacked in the same paint layer. The previous image
         stays visible while the next one fades in, eliminating the white gap
         caused by an out-in transition. -->
    <div class="absolute inset-0 overflow-hidden">
      <div
        v-for="(slide, index) in effectiveSlides"
        :key="slide.id"
        class="hero-media-layer absolute inset-0"
        :class="{ 'is-active': index === activeIndex, 'is-previous': index === previousIndex }"
        :aria-hidden="index === activeIndex ? undefined : 'true'"
      >
        <video
          v-if="slide.media_type === 'video' && slide.desktop_media_url"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          :poster="slide.poster_url || undefined"
          class="h-full w-full object-cover"
        >
          <source
            v-if="slide.mobile_media_url"
            :src="slide.mobile_media_url"
            media="(max-width: 767px)"
          >
          <source :src="slide.desktop_media_url">
        </video>

        <picture v-else-if="slide.desktop_media_url">
          <source
            v-if="slide.mobile_media_url"
            media="(max-width: 767px)"
            :srcset="slide.mobile_media_url"
          >
          <img
            :src="slide.desktop_media_url"
            :alt="index === activeIndex ? (slide.alt_text || slide.title || 'SAAJ collection') : ''"
            class="h-full w-full object-cover"
            :loading="index <= 1 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
          >
        </picture>

        <div
          v-else
          class="absolute inset-0 bg-[linear-gradient(130deg,#dbe2dc_0%,#f2efe7_48%,#ccd7cf_100%)]"
        />
      </div>
    </div>

    <div class="hero-overlay absolute inset-0" :style="overlayStyle" />
    <div
      v-if="!isDarkText"
      class="hero-overlay absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/22 to-transparent"
    />

    <div
      class="relative z-10 mx-auto flex min-h-[640px] max-w-[1600px] px-5 pb-14 pt-16 sm:min-h-[700px] sm:px-8 sm:pb-16 lg:min-h-[calc(100svh-114px)] lg:px-10 lg:pb-20"
      :class="contentPositionClass"
    >
      <Transition :name="reduceMotion ? undefined : 'hero-content'" mode="out-in">
        <div
          :key="currentSlide.id"
          :class="[
            contentWidthClass,
            isDarkText ? 'text-[#151714]' : 'text-white',
          ]"
        >
          <p
            v-if="currentSlide.eyebrow"
            class="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-[11px]"
            :class="isDarkText ? 'text-[#555b53]' : 'text-white/72'"
          >
            {{ currentSlide.eyebrow }}
          </p>

          <h1
            v-if="currentSlide.title"
            class="mt-4 whitespace-pre-line font-display text-[clamp(3.4rem,7.2vw,7.6rem)] font-medium leading-[0.88] tracking-[-0.06em]"
          >
            {{ currentSlide.title }}
          </h1>

          <p
            v-if="currentSlide.description"
            class="mt-6 max-w-xl text-sm leading-6 sm:text-base sm:leading-7"
            :class="[
              isDarkText ? 'text-[#3a3f39]' : 'text-white/78',
              (currentSlide.text_position === 'center' || currentSlide.text_position === 'bottom-center') ? 'mx-auto' : '',
            ]"
          >
            {{ currentSlide.description }}
          </p>

          <div
            v-if="currentSlide.primary_cta_label || currentSlide.secondary_cta_label"
            class="mt-8 flex flex-wrap gap-3"
            :class="(currentSlide.text_position === 'center' || currentSlide.text_position === 'bottom-center') ? 'justify-center' : ''"
          >
            <NuxtLink
              v-if="currentSlide.primary_cta_label && currentSlide.primary_cta_url"
              :to="currentSlide.primary_cta_url"
              class="hero-button"
              :class="isDarkText ? 'hero-button-dark' : 'hero-button-light'"
            >
              {{ currentSlide.primary_cta_label }}
            </NuxtLink>

            <NuxtLink
              v-if="currentSlide.secondary_cta_label && currentSlide.secondary_cta_url"
              :to="currentSlide.secondary_cta_url"
              class="hero-button hero-button-outline"
              :class="isDarkText ? 'hero-button-outline-dark' : 'hero-button-outline-light'"
            >
              {{ currentSlide.secondary_cta_label }}
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </div>

    <template v-if="canSlide">
      <div
        v-if="config.show_dots"
        class="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-7"
      >
        <button
          v-for="(slide, index) in effectiveSlides"
          :key="slide.id"
          type="button"
          class="group/dot flex h-7 w-10 items-center"
          :aria-label="`Go to slide ${index + 1}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          @click="goTo(index)"
        >
          <span
            class="relative h-px w-full overflow-hidden"
            :class="isDarkText ? 'bg-[#151714]/20' : 'bg-white/30'"
          >
            <span
              v-if="index === activeIndex"
              class="hero-progress-fill absolute inset-y-0 left-0 w-full origin-left"
              :class="isDarkText ? 'bg-[#151714]' : 'bg-white'"
              :style="{
                transform: `scaleX(${config.autoplay && !reduceMotion ? progress / 100 : 1})`,
              }"
            />
          </span>
        </button>
      </div>

      <div
        v-if="config.show_arrows"
        class="absolute bottom-6 right-5 z-10 hidden items-center gap-2 sm:right-8 lg:flex lg:right-10"
      >
        <button
          type="button"
          aria-label="Previous slide"
          class="hero-arrow"
          :class="isDarkText ? 'hero-arrow-dark' : 'hero-arrow-light'"
          @click="previous"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-4 w-4">
            <path d="M19 12H5m5-5-5 5 5 5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          class="hero-arrow"
          :class="isDarkText ? 'hero-arrow-dark' : 'hero-arrow-light'"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-4 w-4">
            <path d="M5 12h14m-5-5 5 5-5 5" />
          </svg>
        </button>
      </div>
    </template>
  </section>
</template>
