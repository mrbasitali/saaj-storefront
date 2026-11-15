<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  busyLabel?: string
}>(), {
  cancelLabel: 'Cancel',
  busy: false,
  busyLabel: 'Please wait…',
})

const emit = defineEmits<{ confirm: [], dismiss: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const descriptionId = useId()

function show() {
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
}

function close() {
  dialog.value?.close()
}

function onCancel(event: Event) {
  if (props.busy) event.preventDefault()
}

defineExpose({ show, close })
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="descriptionId"
    class="storefront-confirm-dialog"
    @cancel="onCancel"
    @close="emit('dismiss')"
  >
    <h2 :id="titleId" tabindex="-1" autofocus class="font-display text-[32px] leading-none tracking-[-0.025em] outline-none">
      {{ title }}
    </h2>
    <div :id="descriptionId" class="mt-3 break-words text-sm leading-6 text-charcoal-700">
      <slot />
    </div>
    <div class="mt-6 grid grid-cols-2 gap-2.5 text-sm font-semibold">
      <button type="button" :disabled="busy" class="min-h-11 border border-charcoal-950/25 px-3 py-2 disabled:opacity-50" @click="close">
        {{ cancelLabel }}
      </button>
      <button type="button" :disabled="busy" class="min-h-11 bg-charcoal-950 px-3 py-2 text-paper-50 disabled:opacity-55" @click="emit('confirm')">
        {{ busy ? busyLabel : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.storefront-confirm-dialog {
  width: min(100% - 2rem, 420px);
  max-height: calc(100dvh - 2rem);
  margin: auto;
  padding: 1.5rem;
  overflow: auto;
  overscroll-behavior: contain;
  background: var(--color-paper-50);
  color: var(--color-charcoal-950);
  box-shadow: 0 20px 50px rgb(0 0 0 / .15);
}

.storefront-confirm-dialog::backdrop {
  background: rgb(15 17 15 / .4);
}
</style>
