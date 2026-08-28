<script setup lang="ts">
type HeroPanel = {
  image_url: string | null
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  alt_text?: string | null
  cta_label?: string | null
  cta_url?: string | null
  text_theme?: 'light' | 'dark'
  text_position?: 'bottom-left' | 'center-left' | 'center' | 'bottom-center' | 'bottom-right' | 'center-right'
}

type HeroSlide = {
  id: number | string
  layout_type?: 'single' | 'panels'
  media_type: 'image' | 'video'
  desktop_media_url: string | null
  mobile_media_url?: string | null
  poster_url?: string | null
  panels?: HeroPanel[]
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
  title_size?: number
}

type MobileHeroFrame = {
  key: string
  slideIndex: number
  panelIndex: number | null
  kind: 'panel' | 'single'
  panel?: HeroPanel
  slide: HeroSlide
}

const props = defineProps<{
  config: HeroConfig
  slides: HeroSlide[]
}>()

function escapeHeroHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function heroRichTextHtml(value?: string | null) {
  if (!value) return ''

  const raw = String(value)
  const hasKnownMarkup = /<\/?(?:p|br|strong|b|em|i|u|span)\b/i.test(raw)
  let html = hasKnownMarkup
    ? raw
    : escapeHeroHtml(raw).replace(/\r?\n/g, '<br>')

  // The API already sanitizes hero rich text. Keep a small rendering-side
  // allow-list too so legacy content can never introduce attributes/scripts.
  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  html = html.replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, (match, tagName: string) => {
    const tag = tagName.toLowerCase()
    const closing = match.startsWith('</')
    const normalized = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag

    if (!['p', 'br', 'strong', 'em', 'u', 'span'].includes(normalized)) return ''
    if (normalized === 'br') return closing ? '' : '<br>'
    if (closing) return `</${normalized}>`

    if (normalized === 'span') {
      return /data-text-weight\s*=\s*["']light["']/i.test(match)
        ? '<span data-text-weight="light">'
        : '<span>'
    }

    return `<${normalized}>`
  })

  // TipTap stores Enter-created lines as paragraphs. Hero headings/descriptions
  // must stay inline-safe inside h1/h2/p, so paragraph boundaries become <br>.
  return html
    .replace(/<\/p>\s*(?=<p>)/gi, '<br>')
    .replace(/<\/?p>/gi, '')
    .replace(/(?:<br>\s*)+$/gi, '')
    .trim()
}

function decodeHeroEntity(entity: string, _named?: string, decimal?: string, hex?: string) {
  if (decimal || hex) {
    const codePoint = Number.parseInt(decimal || hex || '', hex ? 16 : 10)
    if (Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return entity
      }
    }
  }

  return ({
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
  } as Record<string, string>)[entity.toLowerCase()] ?? entity
}

function heroPlainText(value?: string | null) {
  return heroRichTextHtml(value)
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|quot|apos|lt|gt);|&#(\d+);|&#x([0-9a-f]+);/gi, decodeHeroEntity)
    .replace(/\s+/g, ' ')
    .trim()
}

const activeIndex = ref(0)
const previousIndex = ref<number | null>(null)
const activeMobileFrame = ref(0)
const paused = ref(false)
const mobileInteracting = ref(false)
const reduceMotion = ref(false)
const isCompactViewport = ref(false)
const progress = ref(0)
const mobileTrack = ref<HTMLElement | null>(null)

let animationFrameId: number | null = null
let lastFrameAt: number | null = null
let elapsedInCycle = 0
let motionQuery: MediaQueryList | null = null
let compactQuery: MediaQueryList | null = null
let previousReleaseTimer: ReturnType<typeof setTimeout> | null = null
let mobileResumeTimer: ReturnType<typeof setTimeout> | null = null
let mobileScrollFrame: number | null = null
let programmaticMobileScroll = false
let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null

const effectiveSlides = computed(() => props.config.mode === 'single' ? props.slides.slice(0, 1) : props.slides)
const currentSlide = computed(() => effectiveSlides.value[activeIndex.value] ?? null)
const canSlide = computed(() => props.config.mode === 'slider' && effectiveSlides.value.length > 1)
const autoplayDelay = computed(() => Math.max(3000, Number(props.config.autoplay_delay) || 6000))
const isPanelSlide = computed(() => currentSlide.value?.layout_type === 'panels' && (currentSlide.value.panels?.length ?? 0) > 1)

const mobileFrames = computed<MobileHeroFrame[]>(() => {
  const frames: MobileHeroFrame[] = []

  effectiveSlides.value.forEach((slide, slideIndex) => {
    if (slide.layout_type === 'panels' && slide.panels?.length) {
      slide.panels.forEach((panel, panelIndex) => {
        frames.push({
          key: `${slide.id}-panel-${panelIndex}`,
          slideIndex,
          panelIndex,
          kind: 'panel',
          panel,
          slide,
        })
      })
      return
    }

    frames.push({
      key: `${slide.id}-single`,
      slideIndex,
      panelIndex: null,
      kind: 'single',
      slide,
    })
  })

  return frames
})

const canMobileSlide = computed(() => mobileFrames.value.length > 1)

function singlePositionClasses(slide: HeroSlide) {
  return {
    'bottom-left': 'items-end justify-start text-left',
    'center-left': 'items-center justify-start text-left',
    center: 'items-center justify-center text-center',
    'bottom-center': 'items-end justify-center text-center',
  }[slide.text_position ?? 'bottom-left']
}

function singleWidthClass(slide: HeroSlide) {
  const position = slide.text_position ?? 'bottom-left'
  return position === 'center' || position === 'bottom-center' ? 'mx-auto max-w-[800px]' : 'max-w-[720px]'
}

const contentPositionClass = computed(() => currentSlide.value ? singlePositionClasses(currentSlide.value) : '')
const contentWidthClass = computed(() => currentSlide.value ? singleWidthClass(currentSlide.value) : '')
const isDarkText = computed(() => currentSlide.value?.text_theme === 'dark')

function slideOverlayStyle(slide: HeroSlide) {
  const configured = Math.max(0, Math.min(80, slide.overlay_strength ?? 35)) / 100
  // A small readability floor keeps editorial copy crisp without making the
  // photography feel heavily shaded.
  const strength = Math.min(0.8, configured + 0.075)
  const darkText = slide.text_theme === 'dark'

  return {
    background: darkText
      ? `rgba(247, 246, 242, ${Math.min(0.74, strength * 0.84)})`
      : `rgba(0, 0, 0, ${strength})`,
  }
}

const overlayStyle = computed(() => currentSlide.value ? slideOverlayStyle(currentSlide.value) : {})

function panelPositionClasses(panel: HeroPanel) {
  return {
    'bottom-left': 'items-start justify-end text-left',
    'center-left': 'items-start justify-center text-left',
    center: 'items-center justify-center text-center',
    'bottom-center': 'items-center justify-end text-center',
    'bottom-right': 'items-end justify-end text-right',
    'center-right': 'items-end justify-center text-right',
  }[panel.text_position ?? 'bottom-left']
}

function panelInnerPositionClasses(panel: HeroPanel) {
  const position = panel.text_position ?? 'bottom-left'
  if (position === 'center' || position === 'bottom-center') return 'mx-auto'
  if (position === 'center-right' || position === 'bottom-right') return 'ml-auto'
  return ''
}

function progressValue(index: number, current: number) {
  if (index < current) return 1
  if (index > current) return 0
  if (!props.config.autoplay || reduceMotion.value) return 1
  return progress.value / 100
}

const heroStyle = computed(() => ({
  '--hero-title-max': `${Math.max(56, Math.min(120, Number(props.config.title_size) || 102))}px`,
}))

function shouldAutoplay() {
  if (!import.meta.client || !props.config.autoplay || paused.value || mobileInteracting.value || reduceMotion.value || document.visibilityState !== 'visible') return false
  return isCompactViewport.value ? canMobileSlide.value : canSlide.value
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

function scrollToMobileFrame(index: number, behavior: ScrollBehavior = 'smooth') {
  if (!mobileTrack.value) return
  const frame = mobileTrack.value.children[index] as HTMLElement | undefined
  if (!frame) return
  mobileTrack.value.scrollTo({ left: frame.offsetLeft, behavior })
}

function setMobileFrame(index: number, scroll = false, behavior: ScrollBehavior = 'smooth') {
  if (!mobileFrames.value.length) return
  const normalized = (index + mobileFrames.value.length) % mobileFrames.value.length
  activeMobileFrame.value = normalized
  const sourceSlide = mobileFrames.value[normalized]?.slideIndex ?? 0
  if (sourceSlide !== activeIndex.value) setActiveIndex(sourceSlide)

  if (scroll) {
    programmaticMobileScroll = true
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
    nextTick(() => scrollToMobileFrame(normalized, behavior))
    programmaticScrollTimer = setTimeout(() => {
      programmaticScrollTimer = null
      programmaticMobileScroll = false
      syncMobileFrameFromScroll()
    }, behavior === 'smooth' ? 700 : 50)
  }
}

function advance(reset = true) {
  if (isCompactViewport.value) {
    if (!mobileFrames.value.length) return
    const nextIndex = (activeMobileFrame.value + 1) % mobileFrames.value.length
    const wraps = nextIndex === 0 && activeMobileFrame.value === mobileFrames.value.length - 1
    setMobileFrame(nextIndex, true, wraps || reduceMotion.value ? 'auto' : 'smooth')
  } else {
    if (!effectiveSlides.value.length) return
    setActiveIndex(activeIndex.value + 1)
  }

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

function goToMobileFrame(index: number) {
  setMobileFrame(index, true, reduceMotion.value ? 'auto' : 'smooth')
  restartClock()
}

function previous() { goTo(activeIndex.value - 1) }
function next() { goTo(activeIndex.value + 1) }

function onMouseEnter() {
  if (isCompactViewport.value || !props.config.pause_on_hover) return
  paused.value = true
  stopClock()
}

function onMouseLeave() {
  if (isCompactViewport.value || !props.config.pause_on_hover) return
  paused.value = false
  startClock()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') startClock()
  else stopClock()
}

function pauseMobileAutoplay() {
  mobileInteracting.value = true
  stopClock()
  programmaticMobileScroll = false
  if (programmaticScrollTimer) {
    clearTimeout(programmaticScrollTimer)
    programmaticScrollTimer = null
  }
  if (mobileResumeTimer) clearTimeout(mobileResumeTimer)
}

function resumeMobileAutoplaySoon() {
  if (mobileResumeTimer) clearTimeout(mobileResumeTimer)
  mobileResumeTimer = setTimeout(() => {
    mobileResumeTimer = null
    mobileInteracting.value = false
    startClock()
  }, 1150)
}

function syncMobileFrameFromScroll() {
  if (programmaticMobileScroll || !mobileTrack.value || !mobileFrames.value.length) return
  if (mobileScrollFrame !== null) cancelAnimationFrame(mobileScrollFrame)

  mobileScrollFrame = requestAnimationFrame(() => {
    mobileScrollFrame = null
    const track = mobileTrack.value
    if (!track) return

    const left = track.scrollLeft
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    Array.from(track.children).forEach((node, index) => {
      const element = node as HTMLElement
      const distance = Math.abs(element.offsetLeft - left)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    if (nearestIndex !== activeMobileFrame.value) {
      setMobileFrame(nearestIndex, false)
      resetCycle()
    }
  })
}

function onCompactChange(event: MediaQueryListEvent) {
  isCompactViewport.value = event.matches

  if (event.matches) {
    const firstFrameForSlide = mobileFrames.value.findIndex(frame => frame.slideIndex === activeIndex.value)
    activeMobileFrame.value = firstFrameForSlide >= 0 ? firstFrameForSlide : 0
    nextTick(() => scrollToMobileFrame(activeMobileFrame.value, 'auto'))
  } else {
    const sourceSlide = mobileFrames.value[activeMobileFrame.value]?.slideIndex
    if (typeof sourceSlide === 'number') activeIndex.value = sourceSlide
  }

  restartClock()
}

watch(
  [() => props.config.autoplay, () => props.config.autoplay_delay, () => props.config.mode, () => props.slides.length],
  () => {
    if (activeIndex.value >= effectiveSlides.value.length) activeIndex.value = 0
    if (activeMobileFrame.value >= mobileFrames.value.length) activeMobileFrame.value = 0
    restartClock()
  },
)

watch(effectiveSlides, (slides: HeroSlide[]) => {
  if (activeIndex.value >= slides.length) activeIndex.value = 0
  if (activeMobileFrame.value >= mobileFrames.value.length) activeMobileFrame.value = 0
  nextTick(() => {
    if (isCompactViewport.value) scrollToMobileFrame(activeMobileFrame.value, 'auto')
  })
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
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  compactQuery = window.matchMedia('(max-width: 1023px)')
  reduceMotion.value = motionQuery.matches
  isCompactViewport.value = compactQuery.matches

  motionQuery.addEventListener?.('change', onMotionChange)
  compactQuery.addEventListener?.('change', onCompactChange)
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (isCompactViewport.value) {
    const firstFrameForSlide = mobileFrames.value.findIndex(frame => frame.slideIndex === activeIndex.value)
    activeMobileFrame.value = firstFrameForSlide >= 0 ? firstFrameForSlide : 0
    nextTick(() => scrollToMobileFrame(activeMobileFrame.value, 'auto'))
  }

  if (reduceMotion.value) progress.value = 100
  else startClock()
})

onBeforeUnmount(() => {
  stopClock()
  if (previousReleaseTimer) clearTimeout(previousReleaseTimer)
  if (mobileResumeTimer) clearTimeout(mobileResumeTimer)
  if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
  if (mobileScrollFrame !== null) cancelAnimationFrame(mobileScrollFrame)
  motionQuery?.removeEventListener?.('change', onMotionChange)
  compactQuery?.removeEventListener?.('change', onCompactChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div v-if="config.enabled && currentSlide" class="storefront-hero-shell bg-paper-50">
    <section
      class="storefront-hero group relative isolate overflow-hidden bg-mist-100"
      :class="{ 'storefront-hero-panels': isPanelSlide }"
      :style="heroStyle"
      aria-roledescription="carousel"
      aria-label="SAAJ featured collection"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
    >
      <!-- Desktop: preserve the editorial slide/panel composition exactly as configured. -->
      <div class="absolute inset-0 hidden overflow-hidden lg:block">
        <div
          v-for="(slide, index) in effectiveSlides"
          :key="slide.id"
          class="hero-media-layer absolute inset-0"
          :class="{ 'is-active': index === activeIndex, 'is-previous': index === previousIndex }"
          :aria-hidden="index === activeIndex ? undefined : 'true'"
        >
          <div v-if="slide.layout_type === 'panels' && slide.panels?.length" class="hero-panel-track h-full">
            <article
              v-for="(panel, panelIndex) in slide.panels"
              :key="panelIndex"
              data-hero-panel
              class="hero-panel group/panel relative isolate h-full min-w-0 overflow-hidden bg-mist-100"
            >
              <img
                v-if="panel.image_url"
                :src="panel.image_url"
                :alt="index === activeIndex ? (panel.alt_text || heroPlainText(panel.title) || `SAAJ campaign image ${panelIndex + 1}`) : ''"
                class="hero-panel-image absolute inset-0 h-full w-full object-cover"
                :loading="index === 0 ? 'eager' : 'lazy'"
                :fetchpriority="index === 0 && panelIndex === 0 ? 'high' : 'auto'"
              >
              <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#d8ded8,#f2efe8)]" />
              <div class="hero-panel-scrim absolute inset-0" :class="panel.text_theme === 'dark' ? 'hero-panel-scrim-light' : 'hero-panel-scrim-dark'" />

              <div
                class="hero-panel-copy absolute inset-0 z-10 flex flex-col p-5 sm:p-7 lg:p-6 xl:p-8"
                :class="[panel.text_theme === 'dark' ? 'text-[#151714]' : 'text-white', panelPositionClasses(panel)]"
              >
                <div class="hero-panel-copy-inner w-full max-w-[420px]" :class="panelInnerPositionClasses(panel)">
                  <p v-if="panel.eyebrow" class="text-[9px] font-semibold uppercase tracking-[0.22em] opacity-70 sm:text-[10px]">{{ panel.eyebrow }}</p>
                  <h2 v-if="panel.title" class="hero-richtext mt-2 font-display text-[clamp(1.8rem,2.5vw,3.3rem)] font-medium leading-[0.94] tracking-[-0.045em]" v-html="heroRichTextHtml(panel.title)"></h2>
                  <p v-if="panel.description" class="hero-panel-description hero-richtext mt-3 text-[12px] leading-5 opacity-80 sm:text-[13px] sm:leading-6" v-html="heroRichTextHtml(panel.description)"></p>
                  <NuxtLink
                    v-if="panel.cta_label && panel.cta_url"
                    :to="panel.cta_url"
                    class="hero-panel-action mt-5"
                    :class="panel.text_theme === 'dark' ? 'hero-panel-action-dark' : 'hero-panel-action-light'"
                  >
                    <span class="hero-panel-action-label">{{ panel.cta_label }}</span>
                    <span class="hero-panel-action-icon" aria-hidden="true">
                      <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-3.5 w-3.5"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
                    </span>
                  </NuxtLink>
                </div>
              </div>
            </article>
          </div>

          <video
            v-else-if="slide.media_type === 'video' && slide.desktop_media_url"
            autoplay muted loop playsinline preload="metadata" :poster="slide.poster_url || undefined"
            class="h-full w-full object-cover"
          >
            <source :src="slide.desktop_media_url">
          </video>

          <img
            v-else-if="slide.desktop_media_url"
            :src="slide.desktop_media_url"
            :alt="index === activeIndex ? (slide.alt_text || heroPlainText(slide.title) || 'SAAJ collection') : ''"
            class="h-full w-full object-cover"
            :loading="index <= 1 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
          >

          <div v-else class="absolute inset-0 bg-[linear-gradient(130deg,#dbe2dc_0%,#f2efe7_48%,#ccd7cf_100%)]" />
        </div>
      </div>

      <!-- Mobile/tablet: flatten panel images + normal hero slides into ONE
           swipe sequence. A 4-panel story followed by one standard slide is
           therefore five consistent frames, not two nested carousels. -->
      <div
        ref="mobileTrack"
        class="hero-mobile-sequence absolute inset-0 flex overflow-x-auto lg:hidden"
        aria-label="Featured campaign images"
        @scroll.passive="syncMobileFrameFromScroll"
        @pointerdown="pauseMobileAutoplay"
        @pointerup="resumeMobileAutoplaySoon"
        @pointercancel="resumeMobileAutoplaySoon"
        @touchstart.passive="pauseMobileAutoplay"
        @touchend.passive="resumeMobileAutoplaySoon"
      >
        <article
          v-for="(frame, frameIndex) in mobileFrames"
          :key="frame.key"
          class="hero-mobile-frame relative isolate h-full overflow-hidden bg-mist-100"
          :aria-current="frameIndex === activeMobileFrame ? 'true' : undefined"
        >
          <template v-if="frame.kind === 'panel' && frame.panel">
            <img
              v-if="frame.panel.image_url"
              :src="frame.panel.image_url"
              :alt="frame.panel.alt_text || heroPlainText(frame.panel.title) || `SAAJ campaign image ${frameIndex + 1}`"
              class="absolute inset-0 h-full w-full object-cover"
              :loading="frameIndex <= 1 ? 'eager' : 'lazy'"
              :fetchpriority="frameIndex === 0 ? 'high' : 'auto'"
            >
            <div v-else class="absolute inset-0 bg-[linear-gradient(145deg,#d8ded8,#f2efe8)]" />
            <div class="hero-mobile-frame-scrim absolute inset-0" :class="frame.panel.text_theme === 'dark' ? 'hero-panel-scrim-light' : 'hero-panel-scrim-dark'" />

            <div
              class="hero-mobile-frame-copy absolute inset-0 z-10 flex flex-col p-5 sm:p-7"
              :class="[frame.panel.text_theme === 'dark' ? 'text-[#151714]' : 'text-white', panelPositionClasses(frame.panel)]"
            >
              <div class="w-full max-w-[440px]" :class="panelInnerPositionClasses(frame.panel)">
                <p v-if="frame.panel.eyebrow" class="text-[9px] font-semibold uppercase tracking-[0.22em] opacity-72 sm:text-[10px]">{{ frame.panel.eyebrow }}</p>
                <h2 v-if="frame.panel.title" class="hero-richtext mt-2 font-display text-[clamp(2rem,9vw,3.9rem)] font-medium leading-[0.92] tracking-[-0.05em]" v-html="heroRichTextHtml(frame.panel.title)"></h2>
                <p v-if="frame.panel.description" class="hero-richtext mt-3 max-w-[34rem] text-[12px] leading-5 opacity-84 sm:text-[13px] sm:leading-6" v-html="heroRichTextHtml(frame.panel.description)"></p>
                <NuxtLink
                  v-if="frame.panel.cta_label && frame.panel.cta_url"
                  :to="frame.panel.cta_url"
                  class="hero-panel-action mt-5"
                  :class="frame.panel.text_theme === 'dark' ? 'hero-panel-action-dark' : 'hero-panel-action-light'"
                >
                  <span class="hero-panel-action-label">{{ frame.panel.cta_label }}</span>
                  <span class="hero-panel-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-3.5 w-3.5"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
                  </span>
                </NuxtLink>
              </div>
            </div>
          </template>

          <template v-else>
            <video
              v-if="frame.slide.media_type === 'video' && (frame.slide.mobile_media_url || frame.slide.desktop_media_url)"
              autoplay muted loop playsinline preload="metadata" :poster="frame.slide.poster_url || undefined"
              class="absolute inset-0 h-full w-full object-cover"
            >
              <source :src="frame.slide.mobile_media_url || frame.slide.desktop_media_url!">
            </video>

            <img
              v-else-if="frame.slide.mobile_media_url || frame.slide.desktop_media_url"
              :src="frame.slide.mobile_media_url || frame.slide.desktop_media_url!"
              :alt="frame.slide.alt_text || heroPlainText(frame.slide.title) || 'SAAJ collection'"
              class="absolute inset-0 h-full w-full object-cover"
              :loading="frameIndex <= 1 ? 'eager' : 'lazy'"
              :fetchpriority="frameIndex === 0 ? 'high' : 'auto'"
            >

            <div v-else class="absolute inset-0 bg-[linear-gradient(130deg,#dbe2dc_0%,#f2efe7_48%,#ccd7cf_100%)]" />
            <div class="hero-mobile-frame-scrim absolute inset-0" :style="slideOverlayStyle(frame.slide)" />

            <div
              class="hero-mobile-frame-copy absolute inset-0 z-10 flex p-5 pb-9 pt-14 sm:p-8 sm:pb-10 sm:pt-16"
              :class="singlePositionClasses(frame.slide)"
            >
              <div :class="[singleWidthClass(frame.slide), frame.slide.text_theme === 'dark' ? 'text-[#151714]' : 'text-white']">
                <p v-if="frame.slide.eyebrow" class="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-72">{{ frame.slide.eyebrow }}</p>
                <h1 v-if="frame.slide.title" class="storefront-hero-title hero-richtext mt-3 font-display font-medium leading-[0.9] tracking-[-0.058em]" v-html="heroRichTextHtml(frame.slide.title)"></h1>
                <p v-if="frame.slide.description" class="hero-richtext mt-4 max-w-[34rem] text-[13px] leading-6 opacity-82" :class="(frame.slide.text_position === 'center' || frame.slide.text_position === 'bottom-center') ? 'mx-auto' : ''" v-html="heroRichTextHtml(frame.slide.description)"></p>
                <div v-if="frame.slide.primary_cta_label || frame.slide.secondary_cta_label" class="mt-6 flex flex-wrap items-center gap-2.5" :class="(frame.slide.text_position === 'center' || frame.slide.text_position === 'bottom-center') ? 'justify-center' : ''">
                  <NuxtLink v-if="frame.slide.primary_cta_label && frame.slide.primary_cta_url" :to="frame.slide.primary_cta_url" class="hero-button" :class="frame.slide.text_theme === 'dark' ? 'hero-button-dark' : 'hero-button-light'">
                    <span>{{ frame.slide.primary_cta_label }}</span>
                    <span class="hero-button-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg></span>
                  </NuxtLink>
                  <NuxtLink v-if="frame.slide.secondary_cta_label && frame.slide.secondary_cta_url" :to="frame.slide.secondary_cta_url" class="hero-button hero-button-outline group" :class="frame.slide.text_theme === 'dark' ? 'hero-button-outline-dark' : 'hero-button-outline-light'">
                    <span>{{ frame.slide.secondary_cta_label }}</span>
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.15" class="h-3.5 w-3.5"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>
        </article>
      </div>

      <!-- Desktop single-slide copy remains layered independently so existing
           hero positioning and transitions are preserved. -->
      <template v-if="!isPanelSlide">
        <div class="hero-overlay absolute inset-0 hidden lg:block" :style="overlayStyle" />
        <div v-if="!isDarkText" class="hero-overlay absolute inset-x-0 top-0 hidden h-40 bg-gradient-to-b from-black/22 to-transparent lg:block" />

        <div class="storefront-hero-inner relative z-10 mx-auto hidden h-full max-w-[1600px] px-5 pb-12 pt-14 sm:px-8 sm:pb-14 sm:pt-16 lg:flex lg:px-10 lg:pb-16 lg:pt-16" :class="contentPositionClass">
          <Transition :name="reduceMotion ? undefined : 'hero-content'" mode="out-in">
            <div :key="currentSlide.id" :class="[contentWidthClass, isDarkText ? 'text-[#151714]' : 'text-white']">
              <p v-if="currentSlide.eyebrow" class="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-[11px]" :class="isDarkText ? 'text-[#555b53]' : 'text-white/72'">{{ currentSlide.eyebrow }}</p>
              <h1 v-if="currentSlide.title" class="storefront-hero-title hero-richtext mt-3 font-display font-medium leading-[0.9] tracking-[-0.058em]" v-html="heroRichTextHtml(currentSlide.title)"></h1>
              <p v-if="currentSlide.description" class="hero-richtext mt-5 max-w-[560px] text-[13px] leading-6 sm:text-[15px] sm:leading-7" :class="[isDarkText ? 'text-[#3a3f39]' : 'text-white/78', (currentSlide.text_position === 'center' || currentSlide.text_position === 'bottom-center') ? 'mx-auto' : '']" v-html="heroRichTextHtml(currentSlide.description)"></p>

              <div v-if="currentSlide.primary_cta_label || currentSlide.secondary_cta_label" class="mt-7 flex flex-wrap items-center gap-2.5" :class="(currentSlide.text_position === 'center' || currentSlide.text_position === 'bottom-center') ? 'justify-center' : ''">
                <NuxtLink v-if="currentSlide.primary_cta_label && currentSlide.primary_cta_url" :to="currentSlide.primary_cta_url" class="hero-button" :class="isDarkText ? 'hero-button-dark' : 'hero-button-light'">
                  <span>{{ currentSlide.primary_cta_label }}</span>
                  <span class="hero-button-icon" aria-hidden="true"><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.25" class="h-4 w-4"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg></span>
                </NuxtLink>

                <NuxtLink v-if="currentSlide.secondary_cta_label && currentSlide.secondary_cta_url" :to="currentSlide.secondary_cta_url" class="hero-button hero-button-outline group" :class="isDarkText ? 'hero-button-outline-dark' : 'hero-button-outline-light'">
                  <span>{{ currentSlide.secondary_cta_label }}</span>
                  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.15" class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"><path d="M3.5 9h11M10.5 5l4 4-4 4" /></svg>
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>
      </template>

      <!-- One timeline language, rendered responsively without viewport-dependent
           SSR branches: desktop is slide-based; mobile is flattened frame-based. -->
      <div
        v-if="config.show_dots && canMobileSlide"
        class="hero-unified-timeline absolute inset-x-0 bottom-0 z-30 flex lg:hidden"
        aria-label="Campaign progress"
      >
        <button
          v-for="(_frame, index) in mobileFrames"
          :key="`mobile-progress-${index}`"
          type="button"
          class="hero-unified-segment"
          :aria-label="`Go to campaign image ${index + 1}`"
          :aria-current="index === activeMobileFrame ? 'true' : undefined"
          @click="goToMobileFrame(index)"
        >
          <span class="hero-unified-track"><span class="hero-unified-fill" :style="{ transform: `scaleX(${progressValue(index, activeMobileFrame)})` }" /></span>
        </button>
      </div>

      <div
        v-if="config.show_dots && canSlide"
        class="hero-unified-timeline absolute inset-x-0 bottom-0 z-30 hidden lg:flex"
        aria-label="Hero slide progress"
      >
        <button
          v-for="(_slide, index) in effectiveSlides"
          :key="`desktop-progress-${index}`"
          type="button"
          class="hero-unified-segment"
          :aria-label="`Go to slide ${index + 1}`"
          :aria-current="index === activeIndex ? 'true' : undefined"
          @click="goTo(index)"
        >
          <span class="hero-unified-track"><span class="hero-unified-fill" :style="{ transform: `scaleX(${progressValue(index, activeIndex)})` }" /></span>
        </button>
      </div>

      <div v-if="canSlide && config.show_arrows" class="absolute bottom-6 right-5 z-30 hidden items-center gap-2 sm:right-8 lg:flex lg:right-10">
        <button type="button" aria-label="Previous slide" class="hero-arrow" :class="isDarkText && !isPanelSlide ? 'hero-arrow-dark' : 'hero-arrow-light'" @click="previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-4 w-4"><path d="M19 12H5m5-5-5 5 5 5" /></svg></button>
        <button type="button" aria-label="Next slide" class="hero-arrow" :class="isDarkText && !isPanelSlide ? 'hero-arrow-dark' : 'hero-arrow-light'" @click="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="h-4 w-4"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button>
      </div>
    </section>

  </div>
</template>

<style scoped>
.hero-richtext :deep(strong) {
  font-weight: 700;
}

.hero-richtext :deep([data-text-weight="light"]) {
  font-weight: 300;
}
</style>
