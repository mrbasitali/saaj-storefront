<script setup lang="ts">
export type StorefrontSelectOption = {
  id: number
  name: string
  code?: string | null
  iso2?: string | null
}

const props = withDefaults(defineProps<{
  modelValue: number | null
  options: StorefrontSelectOption[]
  label?: string
  credentialsStyle?: boolean
  desktopBoundary?: HTMLElement | null
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: 'Select',
  credentialsStyle: false,
  searchPlaceholder: 'Search…',
  emptyText: 'No results found',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const optionsPanel = ref<HTMLElement | null>(null)
const mobileTitleId = useId()
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const search = ref('')
const activeIndex = ref(-1)
const isMobile = ref(false)
const mobileSheetHeight = ref<number | null>(null)
const mobileSheetBottom = ref(0)
const desktopPanelStyle = ref<{ left: string, width: string, top?: string, bottom?: string, maxHeight: string }>()
const {
  dragY: sheetDragY, dragging: sheetDragging, reset: resetSheetDrag,
  onTouchStart, onTouchMove, onTouchEnd,
} = useBottomSheetDrag(() => close(), optionsPanel)

let mobileMedia: MediaQueryList | null = null

const selected = computed(() => props.options.find(option => option.id === props.modelValue) ?? null)

const filteredOptions = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase()
  if (!needle) return props.options

  return props.options.filter((option) => {
    return [option.name, option.code, option.iso2]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(needle))
  })
})

const mobilePanelStyle = computed(() => ({
  height: mobileSheetHeight.value === null ? undefined : `${mobileSheetHeight.value}px`,
  bottom: `${mobileSheetBottom.value}px`,
  transform: `translate3d(0, ${sheetDragY.value}px, 0)`,
  transition: sheetDragging.value ? 'none' : undefined,
}))

function syncViewport() {
  if (!isMobile.value) {
    syncDesktopPanel()
    return
  }

  const viewport = window.visualViewport
  const visibleHeight = viewport?.height ?? window.innerHeight

  // Keep a consistent height until a keyboard or viewport change needs space.
  mobileSheetHeight.value = Math.min(window.innerHeight * 0.82, visibleHeight * 0.97, 680)
  mobileSheetBottom.value = viewport
    ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
    : 0
}

function syncDesktopPanel() {
  const boundary = props.desktopBoundary
  const anchor = root.value?.getBoundingClientRect()
  if (!open.value || isMobile.value || !boundary || !anchor) return

  const bounds = boundary.getBoundingClientRect()
  const padding = window.getComputedStyle(boundary)
  const left = Math.max(8, bounds.left + parseFloat(padding.paddingLeft))
  const right = Math.min(window.innerWidth - 8, bounds.left + boundary.clientWidth - parseFloat(padding.paddingRight))
  const top = Math.max(0, bounds.top)
  const bottom = Math.min(window.innerHeight, bounds.top + boundary.clientHeight)
  const gap = 8

  if (anchor.bottom <= top || anchor.top >= bottom) {
    close(false)
    return
  }

  const availableBelow = bottom - anchor.bottom - gap * 2
  const availableAbove = anchor.top - top - gap * 2
  const preferredHeight = 52 + Math.min(320, window.innerHeight * 0.42)
  const openAbove = availableBelow < preferredHeight && availableAbove > availableBelow
  const width = Math.min(Math.max(anchor.width, 280), right - left)

  desktopPanelStyle.value = {
    left: `${Math.max(left, Math.min(anchor.left, right - width)) - anchor.left}px`,
    width: `${width}px`,
    top: openAbove ? 'auto' : undefined,
    bottom: openAbove ? `calc(100% + ${gap}px)` : undefined,
    maxHeight: `${Math.max(0, Math.min(preferredHeight, openAbove ? availableAbove : availableBelow))}px`,
  }
}

function close(restoreFocus = isMobile.value) {
  if (!open.value) return
  open.value = false
  search.value = ''
  activeIndex.value = -1
  desktopPanelStyle.value = undefined
  resetSheetDrag()
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}

async function toggle() {
  if (props.disabled || props.loading) return

  if (open.value) {
    close()
    return
  }

  open.value = true
  search.value = ''
  activeIndex.value = selected.value
    ? Math.max(0, props.options.findIndex(option => option.id === selected.value?.id))
    : -1

  await nextTick()

  if (isMobile.value) {
    syncViewport()
    // Do not force the software keyboard open. The customer can immediately
    // scroll/select, or tap Search when they actually need filtering.
    panel.value?.focus({ preventScroll: true })
  } else {
    syncDesktopPanel()
    await nextTick()
    searchInput.value?.focus({ preventScroll: true })
  }
}

function select(option: StorefrontSelectOption) {
  emit('update:modelValue', option.id)
  close(true)
}

function moveActive(direction: 1 | -1) {
  const count = filteredOptions.value.length
  if (!count) return

  if (activeIndex.value < 0) {
    activeIndex.value = direction === 1 ? 0 : count - 1
  } else {
    activeIndex.value = (activeIndex.value + direction + count) % count
  }
  panel.value?.querySelectorAll('[role="option"]')[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close(true)
    return
  }

  if (event.key === 'Tab' && open.value && isMobile.value) {
    const buttons = panel.value?.querySelectorAll<HTMLElement>('button, input')
    if (!buttons?.length) return
    const first = buttons[0]!
    const last = buttons[buttons.length - 1]!
    const element = document.activeElement
    if (event.shiftKey ? element === first || element === panel.value : element === last) {
      event.preventDefault()
      const next = event.shiftKey ? last : first
      next.focus()
    }
    return
  }

  if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) void toggle()
    else moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) void toggle()
    else moveActive(-1)
    return
  }

  if (event.key === 'Enter' && open.value && activeIndex.value >= 0) {
    event.preventDefault()
    const option = filteredOptions.value[activeIndex.value]
    if (option) select(option)
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!open.value || isMobile.value) return
  const target = event.target as Node | null
  if (target && !root.value?.contains(target) && !panel.value?.contains(target)) close()
}

function updateMobileMedia(event?: MediaQueryListEvent) {
  const next = event ? event.matches : !!mobileMedia?.matches
  if (next !== isMobile.value) close(false)
  isMobile.value = next
}

watch(filteredOptions, (options) => {
  if (!options.length) activeIndex.value = -1
  else if (activeIndex.value >= options.length) activeIndex.value = options.length - 1
})

watch(search, () => {
  activeIndex.value = -1
  if (optionsPanel.value) optionsPanel.value.scrollTop = 0
  resetSheetDrag()
})

watch(() => props.disabled, (disabled) => {
  if (disabled) close()
})

watch([open, isMobile, () => props.desktopBoundary], ([value, mobile, boundary], _, onCleanup) => {
  if (!value || mobile || !boundary) return
  boundary.addEventListener('scroll', syncDesktopPanel, { passive: true })
  onCleanup(() => boundary.removeEventListener('scroll', syncDesktopPanel))
})

watch(open, (value) => {
  if (!import.meta.client) return

  if (value && isMobile.value) {
    document.body.classList.add('sf-select-mobile-open')
    syncViewport()
  } else {
    document.body.classList.remove('sf-select-mobile-open')
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  mobileMedia = window.matchMedia('(max-width: 767px)')
  updateMobileMedia()
  mobileMedia.addEventListener('change', updateMobileMedia)
  window.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    if (open.value && isMobile.value) document.body.classList.remove('sf-select-mobile-open')
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    mobileMedia?.removeEventListener('change', updateMobileMedia)
    window.removeEventListener('resize', syncViewport)
    window.visualViewport?.removeEventListener('resize', syncViewport)
    window.visualViewport?.removeEventListener('scroll', syncViewport)
  }
})
</script>

<template>
  <div ref="root" class="sf-select" :class="{ 'sf-select--open': open, 'sf-select--disabled': disabled }" @keydown="onKeydown">
    <div
      :class="{ 'credentials-field': credentialsStyle }"
      :data-complete="credentialsStyle ? Boolean(selected || open) : undefined"
    >
      <button
        ref="trigger"
        type="button"
        class="sf-select__trigger"
        :class="{ 'credentials-input': credentialsStyle }"
        :aria-label="label ? `${label}: ${loading ? 'Loading…' : selected?.name || placeholder}` : undefined"
        :disabled="disabled || loading"
        :aria-expanded="open"
        :aria-haspopup="isMobile ? 'dialog' : 'listbox'"
        @click="toggle"
      >
        <span v-if="loading" class="sf-select__loading">
          <span class="sf-select__spinner" aria-hidden="true" />
          Loading…
        </span>
        <span v-else-if="selected" class="sf-select__selected">
          <span>{{ selected.name }}</span>
          <small v-if="selected.code || selected.iso2">{{ selected.code || selected.iso2 }}</small>
        </span>
        <span v-else class="sf-select__placeholder">{{ placeholder }}</span>

        <svg class="sf-select__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 9 5 5 5-5" />
        </svg>
      </button>
    </div>

    <!-- Desktop / tablet anchored picker -->
    <Transition name="sf-select-pop">
      <div v-if="open && !isMobile" ref="panel" class="sf-select__panel" :style="desktopPanelStyle">
        <div class="sf-select__search-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref="searchInput"
            v-model="search"
            class="sf-select__search"
            type="search"
            autocomplete="off"
            :placeholder="searchPlaceholder"
            @keydown.stop="onKeydown"
          >
          <button v-if="search" type="button" class="sf-select__clear" aria-label="Clear search" @click="search = ''">×</button>
        </div>

        <div class="sf-select__options" role="listbox">
          <button
            v-for="(option, index) in filteredOptions"
            :key="option.id"
            type="button"
            class="sf-select__option"
            :class="{
              'sf-select__option--selected': option.id === modelValue,
              'sf-select__option--active': index === activeIndex,
            }"
            role="option"
            :aria-selected="option.id === modelValue"
            @mouseenter="activeIndex = index"
            @click="select(option)"
          >
            <span class="sf-select__option-copy">
              <strong>{{ option.name }}</strong>
              <small v-if="option.code || option.iso2">{{ option.code || option.iso2 }}</small>
            </span>
            <svg v-if="option.id === modelValue" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12 4.2 4.2L19 6.5" />
            </svg>
          </button>

          <div v-if="!filteredOptions.length" class="sf-select__empty">
            {{ emptyText }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile / PWA picker: viewport-aware bottom sheet, never trapped behind keyboard -->
    <Teleport to="body">
      <Transition name="sf-select-sheet">
        <div v-if="open && isMobile" class="sf-select-sheet-layer">
          <button type="button" class="sf-select-sheet-backdrop" tabindex="-1" aria-hidden="true" @click="close()" />

          <section
            ref="panel"
            class="sf-select-sheet"
            :class="{ 'is-dragging': sheetDragging }"
            :style="mobilePanelStyle"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="mobileTitleId"
            tabindex="-1"
            @keydown="onKeydown"
            @touchstart.passive="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="resetSheetDrag"
          >
            <div class="sf-select-sheet__grab" aria-hidden="true"><span /></div>

            <div class="sf-select-sheet__heading">
              <div>
                <p class="sf-select-sheet__eyebrow">Choose location</p>
                <h2 :id="mobileTitleId" class="sf-select-sheet__title">{{ placeholder }}</h2>
              </div>
              <button type="button" class="sf-select-sheet__close" aria-label="Close picker" @click="close()">
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3">
                  <path d="m4.5 4.5 9 9M13.5 4.5l-9 9" />
                </svg>
              </button>
            </div>

            <div class="sf-select-sheet__search-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                ref="searchInput"
                v-model="search"
                class="sf-select-sheet__search"
                type="search"
                inputmode="search"
                enterkeyhint="search"
                autocomplete="off"
                :placeholder="searchPlaceholder"
                :aria-label="searchPlaceholder"
                @keydown.stop="onKeydown"
              >
              <button v-if="search" type="button" class="sf-select-sheet__clear" aria-label="Clear search" @click="search = ''">×</button>
            </div>

            <div v-if="!filteredOptions.length" class="sf-select-sheet__empty" role="status">
              <span class="sf-select-sheet__empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <circle cx="10.5" cy="10.5" r="6" />
                  <path d="m15 15 4.5 4.5M8 10.5h5" />
                </svg>
              </span>
              <p class="sf-select-sheet__empty-title">{{ search.trim() ? emptyText : 'No locations available' }}</p>
              <p v-if="search.trim()">Try a different name or spelling.</p>
            </div>

            <div ref="optionsPanel" class="sf-select-sheet__options" v-else role="listbox" :aria-label="placeholder">
              <button
                v-for="(option, index) in filteredOptions"
                :key="`mobile-${option.id}`"
                type="button"
                class="sf-select-sheet__option"
                :class="{
                  'is-selected': option.id === modelValue,
                  'is-active': index === activeIndex,
                }"
                role="option"
                :aria-selected="option.id === modelValue"
                @click="select(option)"
              >
                <span class="sf-select__option-copy">
                  <strong>{{ option.name }}</strong>
                  <small v-if="option.code || option.iso2">{{ option.code || option.iso2 }}</small>
                </span>
                <span class="sf-select-sheet__check" :class="{ 'is-visible': option.id === modelValue }">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="m4 10 3.4 3.4L16 5.8" />
                  </svg>
                </span>
              </button>

            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
:global(body.sf-select-mobile-open) {
  overflow: hidden;
}

.sf-select {
  position: relative;
  min-width: 0;
}

.sf-select__trigger {
  display: flex;
  width: 100%;
  min-height: 50px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 14%, transparent);
  background: var(--color-paper-50);
  padding: 0 13px 0 14px;
  color: var(--color-charcoal-950);
  text-align: left;
  outline: none;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 180ms ease, opacity 160ms ease;
}

.sf-select__trigger:not(.credentials-input):hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 30%, transparent);
}

.sf-select--open .sf-select__trigger:not(.credentials-input),
.sf-select__trigger:not(.credentials-input):focus-visible {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
}

.sf-select__trigger.credentials-input {
  display: flex;
  border: 0;
  border-radius: 0;
  background: var(--field-surface);
  color: var(--field-ink);
}

.sf-select__trigger.credentials-input :is(.sf-select__selected, .sf-select__placeholder, .sf-select__loading) {
  font-size: inherit;
}

.credentials-input .sf-select__placeholder {
  color: var(--field-placeholder);
  font-style: italic;
  font-weight: 400;
}

.credentials-input :is(.sf-select__loading, .sf-select__selected small) {
  color: var(--field-muted);
}

.sf-select__trigger:disabled {
  cursor: not-allowed;
  opacity: .44;
}

.sf-select__selected,
.sf-select__loading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  line-height: 1.3;
}

.sf-select__selected > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sf-select__selected small {
  flex: none;
  color: var(--color-charcoal-400);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .08em;
}

.sf-select__placeholder,
.sf-select__loading {
  color: var(--color-charcoal-350);
  font-size: 16px;
}

.sf-select__chevron {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  transition: transform 180ms cubic-bezier(.2,.8,.2,1);
}

.sf-select--open .sf-select__chevron {
  transform: rotate(180deg);
}

.sf-select__spinner {
  width: 13px;
  height: 13px;
  border: 1.5px solid color-mix(in srgb, var(--color-charcoal-950) 18%, transparent);
  border-top-color: var(--color-charcoal-950);
  border-radius: 999px;
  animation: sf-select-spin .65s linear infinite;
}

.sf-select__panel {
  position: absolute;
  z-index: 80;
  top: calc(100% + 8px);
  left: 0;
  display: flex;
  width: max(100%, 280px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 10%, transparent);
  background: var(--color-paper-50);
  box-shadow: 0 18px 55px color-mix(in srgb, var(--color-charcoal-950) 14%, transparent);
}

.sf-select__search-wrap,
.sf-select-sheet__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.sf-select__search-wrap {
  flex: none;
  border-bottom: 1px solid color-mix(in srgb, var(--color-charcoal-950) 9%, transparent);
}

.sf-select__search-wrap > svg,
.sf-select-sheet__search-wrap > svg {
  position: absolute;
  z-index: 1;
  left: 13px;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--color-charcoal-400);
  stroke-width: 1.5;
  pointer-events: none;
}

.sf-select__search,
.sf-select-sheet__search {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--color-charcoal-950);
  outline: none;
}

.sf-select__search {
  min-height: 48px;
  padding: 0 38px 0 40px;
  font-size: 14px;
}

.sf-select__search::placeholder,
.sf-select-sheet__search::placeholder {
  color: var(--color-charcoal-350);
}

.sf-select__search::-webkit-search-cancel-button,
.sf-select-sheet__search::-webkit-search-cancel-button {
  display: none;
}

.sf-select__clear,
.sf-select-sheet__clear {
  position: absolute;
  right: 9px;
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 999px;
  color: var(--color-charcoal-500);
  font-size: 20px;
  line-height: 1;
}

.sf-select__options {
  min-height: 0;
  max-height: min(320px, 42vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  scrollbar-width: thin;
}

.sf-select__option,
.sf-select-sheet__option {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: var(--color-charcoal-800);
  text-align: left;
  transition: background-color 140ms ease, color 140ms ease;
}

.sf-select__option {
  min-height: 44px;
  padding: 8px 10px;
}

.sf-select__option:hover,
.sf-select__option--active {
  background: color-mix(in srgb, var(--color-charcoal-950) 4%, transparent);
  color: var(--color-charcoal-950);
}

.sf-select__option--selected {
  background: color-mix(in srgb, var(--color-charcoal-950) 6%, transparent);
  color: var(--color-charcoal-950);
}

.sf-select__option-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.sf-select__option-copy strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 520;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sf-select__option-copy small {
  color: var(--color-charcoal-350);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .08em;
}

.sf-select__option > svg {
  width: 16px;
  height: 16px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

.sf-select__empty {
  padding: 22px 14px;
  color: var(--color-charcoal-350);
  font-size: 12px;
  text-align: center;
}

/* Mobile sheet --------------------------------------------------------- */
.sf-select-sheet-layer {
  position: fixed;
  z-index: 140;
  inset: 0;
}

.sf-select-sheet-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: rgb(15 17 15 / .32);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.sf-select-sheet {
  position: fixed;
  right: 0;
  left: 0;
  display: flex;
  height: min(82dvh, 680px);
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  background: var(--color-paper-50);
  box-shadow: 0 -22px 70px rgb(0 0 0 / .2);
  color: var(--color-charcoal-950);
  outline: none;
  will-change: transform;
  transition: transform 330ms cubic-bezier(.22, 1, .36, 1);
}

.sf-select-sheet.is-dragging {
  user-select: none;
}

.sf-select-sheet__grab {
  display: flex;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.sf-select-sheet__grab > span {
  width: 42px;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-charcoal-950) 18%, transparent);
}

.sf-select-sheet__heading {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem 12px;
}

.sf-select-sheet__eyebrow {
  font-size: 8px;
  font-weight: 650;
  letter-spacing: .15em;
  text-transform: uppercase;
  color: var(--color-charcoal-350);
}

.sf-select-sheet__title {
  margin-top: 3px;
  font-size: 17px;
  font-weight: 540;
}

.sf-select-sheet__close {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-charcoal-950) 4%, transparent);
  color: var(--color-charcoal-650);
}

.sf-select-sheet__close svg {
  width: 17px;
  height: 17px;
}

.sf-select-sheet__search-wrap {
  flex: 0 0 auto;
  margin: 0 1rem 10px;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 11%, transparent);
  background: color-mix(in srgb, var(--color-charcoal-950) 2.5%, transparent);
}

.sf-select-sheet__search {
  min-height: 50px;
  padding: 0 40px;
  font-size: 16px; /* prevents iOS Safari auto-zoom */
}

.sf-select-sheet__options {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 1rem max(1rem, env(safe-area-inset-bottom));
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.sf-select-sheet__empty {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
  gap: 6px;
  overflow-y: auto;
  padding: 16px 20px max(16px, env(safe-area-inset-bottom));
  color: var(--color-charcoal-600);
  font-size: 13px;
  line-height: 1.45;
  text-align: center;
}

.sf-select-sheet__empty-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  margin-bottom: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
  color: var(--color-charcoal-700);
}

.sf-select-sheet__empty-icon svg {
  width: 22px;
  height: 22px;
}

.sf-select-sheet__empty-title {
  color: var(--color-charcoal-950);
  font-size: 15px;
  font-weight: 600;
}

.sf-select-sheet__option {
  min-height: 58px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-charcoal-950) 7%, transparent);
  padding: 8px 2px;
}

.sf-select-sheet__option.is-selected {
  color: var(--color-charcoal-950);
}

.sf-select-sheet__option .sf-select__option-copy strong {
  font-size: 15px;
}

.sf-select-sheet__check {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 10%, transparent);
  border-radius: 999px;
  color: transparent;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.sf-select-sheet__check.is-visible {
  border-color: var(--color-charcoal-950);
  background: var(--color-charcoal-950);
  color: var(--color-paper-50);
}

.sf-select-sheet__check svg {
  width: 15px;
  height: 15px;
}

.sf-select-pop-enter-active,
.sf-select-pop-leave-active {
  transition: opacity 150ms ease, transform 180ms cubic-bezier(.2,.8,.2,1);
  transform-origin: top;
}

.sf-select-pop-enter-from,
.sf-select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(.99);
}

.sf-select-sheet-enter-active,
.sf-select-sheet-leave-active {
  transition: opacity 240ms ease;
}

.sf-select-sheet-enter-active .sf-select-sheet,
.sf-select-sheet-leave-active .sf-select-sheet {
  transition: transform 390ms cubic-bezier(.16, 1, .3, 1);
}

.sf-select-sheet-enter-from,
.sf-select-sheet-leave-to {
  opacity: 0;
}

.sf-select-sheet-enter-from .sf-select-sheet,
.sf-select-sheet-leave-to .sf-select-sheet {
  transform: translate3d(0, 100%, 0) !important;
}

@keyframes sf-select-spin {
  to { transform: rotate(360deg); }
}

@media (min-width: 768px) {
  .sf-select__selected,
  .sf-select__placeholder,
  .sf-select__loading {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-select-pop-enter-active,
  .sf-select-pop-leave-active,
  .sf-select-sheet-enter-active,
  .sf-select-sheet-leave-active,
  .sf-select-sheet-enter-active .sf-select-sheet,
  .sf-select-sheet-leave-active .sf-select-sheet,
  .sf-select-sheet,
  .sf-select__chevron {
    transition-duration: .01ms !important;
  }
}
</style>
