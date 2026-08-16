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
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: 'Select',
  searchPlaceholder: 'Search…',
  emptyText: 'No results found',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const search = ref('')
const activeIndex = ref(-1)

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

function close() {
  open.value = false
  search.value = ''
  activeIndex.value = -1
}

async function toggle() {
  if (props.disabled || props.loading) return

  open.value = !open.value
  search.value = ''
  activeIndex.value = selected.value
    ? Math.max(0, filteredOptions.value.findIndex(option => option.id === selected.value?.id))
    : -1

  if (open.value) {
    await nextTick()
    searchInput.value?.focus({ preventScroll: true })
  }
}

function select(option: StorefrontSelectOption) {
  emit('update:modelValue', option.id)
  close()
}

function moveActive(direction: 1 | -1) {
  const count = filteredOptions.value.length
  if (!count) return

  if (activeIndex.value < 0) {
    activeIndex.value = direction === 1 ? 0 : count - 1
    return
  }

  activeIndex.value = (activeIndex.value + direction + count) % count
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

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
  if (!open.value) return
  const target = event.target as Node | null
  if (target && !root.value?.contains(target)) close()
}

watch(filteredOptions, (options) => {
  if (!options.length) activeIndex.value = -1
  else if (activeIndex.value >= options.length) activeIndex.value = options.length - 1
})

watch(() => props.disabled, (disabled) => {
  if (disabled) close()
})

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="sf-select" :class="{ 'sf-select--open': open, 'sf-select--disabled': disabled }" @keydown="onKeydown">
    <button
      type="button"
      class="sf-select__trigger"
      :disabled="disabled || loading"
      :aria-expanded="open"
      aria-haspopup="listbox"
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

    <Transition name="sf-select-pop">
      <div v-if="open" class="sf-select__panel">
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
  </div>
</template>

<style scoped>
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

.sf-select__trigger:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 30%, transparent);
}

.sf-select--open .sf-select__trigger,
.sf-select__trigger:focus-visible {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
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
  width: max(100%, 260px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 10%, transparent);
  background: var(--color-paper-50);
  box-shadow: 0 18px 55px color-mix(in srgb, var(--color-charcoal-950) 14%, transparent);
}

.sf-select__search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--color-charcoal-950) 9%, transparent);
}

.sf-select__search-wrap > svg {
  position: absolute;
  left: 13px;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--color-charcoal-450);
  stroke-width: 1.5;
}

.sf-select__search {
  width: 100%;
  min-height: 48px;
  border: 0;
  background: transparent;
  padding: 0 38px 0 40px;
  color: var(--color-charcoal-950);
  font-size: 16px;
  outline: none;
}

.sf-select__search::placeholder {
  color: var(--color-charcoal-350);
}

.sf-select__search::-webkit-search-cancel-button {
  display: none;
}

.sf-select__clear {
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
  max-height: min(310px, 44vh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  scrollbar-width: thin;
}

.sf-select__option {
  display: flex;
  width: 100%;
  min-height: 45px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  color: var(--color-charcoal-750);
  text-align: left;
  transition: background-color 130ms ease, color 130ms ease, transform 130ms ease;
}

.sf-select__option:hover,
.sf-select__option--active {
  background: color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
}

.sf-select__option--selected {
  background: var(--color-charcoal-950);
  color: var(--color-paper-50);
}

.sf-select__option--selected:hover,
.sf-select__option--selected.sf-select__option--active {
  background: var(--color-charcoal-950);
  color: var(--color-paper-50);
}

.sf-select__option-copy {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}

.sf-select__option-copy strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 520;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sf-select__option-copy small {
  flex: none;
  color: currentColor;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .08em;
  opacity: .55;
}

.sf-select__option > svg {
  width: 15px;
  height: 15px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
}

.sf-select__empty {
  padding: 26px 16px;
  color: var(--color-charcoal-400);
  font-size: 12px;
  text-align: center;
}

.sf-select-pop-enter-active,
.sf-select-pop-leave-active {
  transition: opacity 150ms ease, transform 190ms cubic-bezier(.2,.8,.2,1);
  transform-origin: top center;
}

.sf-select-pop-enter-from,
.sf-select-pop-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(.985);
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

  .sf-select__search {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-select__trigger,
  .sf-select__chevron,
  .sf-select__option,
  .sf-select-pop-enter-active,
  .sf-select-pop-leave-active {
    transition: none !important;
  }

  .sf-select__spinner {
    animation-duration: 1.4s;
  }
}
</style>
