<script setup lang="ts">
const props = defineProps<{
  open: boolean
  productName: string
  optionSummary?: string | null
  imageUrl?: string | null
  quantity: number
  price: string
}>()

const emit = defineEmits<{
  close: []
  'view-cart': []
}>()

const sheet = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
const pointerId = ref<number | null>(null)
const dragStartY = ref(0)
const dragStartTime = ref(0)

const sheetStyle = computed(() => ({
  '--bag-drawer-y': `${Math.max(0, dragY.value)}px`,
  '--bag-drawer-opacity': String(Math.max(0.45, 1 - Math.max(0, dragY.value) / 420)),
}))

function resetDrag() {
  dragY.value = 0
  dragging.value = false
  pointerId.value = null
  dragStartY.value = 0
  dragStartTime.value = 0
}

function close() {
  resetDrag()
  emit('close')
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse') return
  pointerId.value = event.pointerId
  dragStartY.value = event.clientY
  dragStartTime.value = performance.now()
  dragging.value = true
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || pointerId.value !== event.pointerId) return
  dragY.value = Math.max(0, event.clientY - dragStartY.value)
}

function onPointerEnd(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return

  const elapsed = Math.max(1, performance.now() - dragStartTime.value)
  const velocity = dragY.value / elapsed
  const shouldDismiss = dragY.value > 110 || velocity > 0.72

  ;(event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId)

  if (shouldDismiss) close()
  else resetDrag()
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && event.key === 'Escape') close()
}

watch(() => props.open, async (open) => {
  if (!import.meta.client) return

  if (open) {
    document.body.classList.add('bag-drawer-open')
    await nextTick()
    sheet.value?.focus({ preventScroll: true })
  } else {
    document.body.classList.remove('bag-drawer-open')
    resetDrag()
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.classList.remove('bag-drawer-open')
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="bag-drawer">
      <div
        v-if="open"
        class="bag-drawer-layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-drawer-title"
      >
        <button
          type="button"
          class="bag-drawer-backdrop"
          aria-label="Close added-to-bag dialog"
          @click="close"
        />

        <section
          ref="sheet"
          class="bag-drawer-sheet"
          :class="{ 'is-dragging': dragging }"
          :style="sheetStyle"
          tabindex="-1"
        >
          <div
            class="bag-drawer-handle-zone"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
          >
            <span class="bag-drawer-handle" aria-hidden="true" />
          </div>

          <div class="bag-drawer-head">
            <div class="flex min-w-0 items-center gap-3">
              <span class="bag-drawer-check" aria-hidden="true">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7">
                  <path d="m4.2 9.2 3 3 6.7-6.7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <div class="min-w-0">
                <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Added to bag</p>
                <h2 id="bag-drawer-title" class="mt-1 text-[15px] font-medium text-charcoal-950">Your selection is ready</h2>
              </div>
            </div>

            <button
              type="button"
              class="bag-drawer-close"
              aria-label="Close"
              @click="close"
            >
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3">
                <path d="m4.5 4.5 9 9M13.5 4.5l-9 9" />
              </svg>
            </button>
          </div>

          <div class="bag-drawer-product">
            <div class="bag-drawer-image">
              <NuxtImg
                v-if="imageUrl"
                :src="imageUrl"
                :alt="productName"
                class="h-full w-full object-cover"
              />
            </div>

            <div class="min-w-0 flex-1 py-0.5">
              <p class="line-clamp-2 text-[14px] font-medium leading-5 text-charcoal-950">{{ productName }}</p>
              <p v-if="optionSummary" class="mt-1.5 text-[11px] leading-5 text-charcoal-450">{{ optionSummary }}</p>
              <div class="mt-3 flex items-center justify-between gap-4 text-[11px]">
                <span class="text-charcoal-450">Qty {{ quantity }}</span>
                <span class="font-medium text-charcoal-950">{{ price }}</span>
              </div>
            </div>
          </div>

          <div class="bag-drawer-actions">
            <button type="button" class="bag-drawer-secondary" @click="close">
              Continue shopping
            </button>
            <button type="button" class="bag-drawer-primary" @click="emit('view-cart')">
              Continue to cart
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <path d="M3.5 9h11M11 5.5 14.5 9 11 12.5" />
              </svg>
            </button>
          </div>

          <p class="bag-drawer-mobile-hint">Drag down to close</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
:global(body.bag-drawer-open) {
  overflow: hidden;
}

.bag-drawer-layer {
  position: fixed;
  z-index: 120;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}

.bag-drawer-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: rgb(15 17 15 / 0.34);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.bag-drawer-sheet {
  --bag-drawer-y: 0px;
  --bag-drawer-opacity: 1;
  position: relative;
  width: 100%;
  max-height: min(78dvh, 660px);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--color-paper-50);
  color: var(--color-charcoal-950);
  box-shadow: 0 -20px 60px rgb(0 0 0 / 0.16);
  opacity: var(--bag-drawer-opacity);
  transform: translate3d(0, var(--bag-drawer-y), 0);
  outline: none;
  transition: transform 320ms cubic-bezier(.22, 1, .36, 1), opacity 220ms ease;
  will-change: transform, opacity;
  -webkit-overflow-scrolling: touch;
}

.bag-drawer-sheet.is-dragging {
  transition: none;
  user-select: none;
}

.bag-drawer-handle-zone {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.bag-drawer-handle {
  width: 42px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-charcoal-950) 18%, transparent);
}

.bag-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.25rem 1.25rem;
}

.bag-drawer-check {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #657d6c;
  color: #fff;
}

.bag-drawer-check svg {
  width: 17px;
  height: 17px;
}

.bag-drawer-close {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  color: var(--color-charcoal-600);
  transition: background-color 160ms ease, color 160ms ease;
}

.bag-drawer-close:hover {
  background: color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
  color: var(--color-charcoal-950);
}

.bag-drawer-close svg {
  width: 17px;
  height: 17px;
}

.bag-drawer-product {
  display: flex;
  gap: 1rem;
  border-block: 1px solid color-mix(in srgb, var(--color-charcoal-950) 8%, transparent);
  padding: 1.15rem 1.25rem;
}

.bag-drawer-image {
  width: 82px;
  height: 104px;
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--color-mist-100);
}

.bag-drawer-actions {
  display: grid;
  gap: .65rem;
  padding: 1.25rem;
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
}

.bag-drawer-primary,
.bag-drawer-secondary {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: .55rem;
  padding-inline: 1rem;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: .14em;
  text-transform: uppercase;
  transition: transform 140ms ease, background-color 180ms ease, color 180ms ease, border-color 180ms ease;
}

.bag-drawer-primary:active,
.bag-drawer-secondary:active {
  transform: scale(.985);
}

.bag-drawer-primary {
  background: var(--color-charcoal-950);
  color: var(--color-paper-50);
}

.bag-drawer-primary:hover {
  background: var(--color-charcoal-800);
}

.bag-drawer-primary svg {
  width: 16px;
  height: 16px;
}

.bag-drawer-secondary {
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 18%, transparent);
  color: var(--color-charcoal-950);
}

.bag-drawer-secondary:hover {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 48%, transparent);
}

.bag-drawer-mobile-hint {
  padding: 0 1.25rem 1rem;
  text-align: center;
  font-size: 9px;
  letter-spacing: .08em;
  color: var(--color-charcoal-350);
}

.bag-drawer-enter-active,
.bag-drawer-leave-active {
  transition: opacity 260ms ease;
}

.bag-drawer-enter-active .bag-drawer-sheet,
.bag-drawer-leave-active .bag-drawer-sheet {
  transition: transform 430ms cubic-bezier(.16, 1, .3, 1), opacity 240ms ease;
}

.bag-drawer-enter-from,
.bag-drawer-leave-to {
  opacity: 0;
}

.bag-drawer-enter-from .bag-drawer-sheet,
.bag-drawer-leave-to .bag-drawer-sheet {
  transform: translate3d(0, 100%, 0);
}

@media (min-width: 768px) {
  .bag-drawer-layer {
    align-items: stretch;
  }

  .bag-drawer-sheet {
    width: min(440px, 92vw);
    max-height: none;
    box-shadow: -24px 0 70px rgb(0 0 0 / 0.16);
    transform: translate3d(0, 0, 0);
  }

  .bag-drawer-handle-zone,
  .bag-drawer-mobile-hint {
    display: none;
  }

  .bag-drawer-head {
    padding: 2rem 1.75rem 1.5rem;
  }

  .bag-drawer-product {
    padding: 1.5rem 1.75rem;
  }

  .bag-drawer-image {
    width: 104px;
    height: 132px;
  }

  .bag-drawer-actions {
    padding: 1.5rem 1.75rem;
  }

  .bag-drawer-enter-from .bag-drawer-sheet,
  .bag-drawer-leave-to .bag-drawer-sheet {
    transform: translate3d(100%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bag-drawer-enter-active,
  .bag-drawer-leave-active,
  .bag-drawer-enter-active .bag-drawer-sheet,
  .bag-drawer-leave-active .bag-drawer-sheet,
  .bag-drawer-sheet {
    transition-duration: .01ms !important;
  }
}
</style>
