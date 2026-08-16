<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  length?: number
  disabled?: boolean
}>(), {
  length: 6,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'complete': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)
const focused = ref(false)

const digits = computed(() => Array.from({ length: props.length }, (_, index) => props.modelValue[index] ?? ''))

function normalize(value: string) {
  return value.replace(/\D/g, '').slice(0, props.length)
}

function update(event: Event) {
  const value = normalize((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)

  if (value.length === props.length) emit('complete', value)
}

function paste(event: ClipboardEvent) {
  event.preventDefault()
  const value = normalize(event.clipboardData?.getData('text') ?? '')
  emit('update:modelValue', value)
  if (value.length === props.length) emit('complete', value)
}
</script>

<template>
  <div
    class="relative grid cursor-text grid-cols-6 gap-2"
    role="group"
    aria-label="Verification code"
    @click="input?.focus()"
  >
    <div
      v-for="(digit, index) in digits"
      :key="index"
      class="flex aspect-square min-h-12 items-center justify-center border text-[18px] font-medium text-charcoal-950 transition duration-200"
      :class="focused && index === Math.min(modelValue.length, length - 1)
        ? 'border-charcoal-950 bg-paper-100'
        : 'border-charcoal-950/15 bg-paper-50'"
    >
      {{ digit }}
    </div>

    <input
      ref="input"
      :value="modelValue"
      :disabled="disabled"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="length"
      class="absolute inset-0 h-full w-full opacity-0"
      aria-label="Enter verification code"
      @focus="focused = true"
      @blur="focused = false"
      @input="update"
      @paste="paste"
    >
  </div>
</template>
