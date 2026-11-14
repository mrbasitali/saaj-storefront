<script setup lang="ts">
const inputId = useId()
const code = defineModel<string>({ required: true })
defineProps<{ applied?: string, busy?: boolean, disabled?: boolean, message?: string }>()
const emit = defineEmits<{ apply: [], remove: [] }>()
</script>

<template>
  <div class="storefront-field-theme space-y-2">
    <label :for="inputId" class="credentials-label mb-2 block">Discount code</label>
      <span class="flex items-stretch gap-2">
        <span class="credentials-field block min-w-0 flex-1">
          <input
            :id="inputId"
            v-model="code"
            class="credentials-input"
            :data-complete="!!applied"
            type="text"
            maxlength="32"
            placeholder="Enter your code"
            autocapitalize="characters"
            autocomplete="off"
            spellcheck="false"
            :disabled="busy || disabled || !!applied"
            @keydown.enter.prevent="emit('apply')"
          >
        </span>
        <button
          v-if="applied"
          type="button"
          class="min-h-11 border border-charcoal-950/25 px-4 text-sm font-semibold disabled:opacity-50"
          :disabled="busy || disabled"
          @click="emit('remove')"
        >Remove</button>
        <button
          v-else
          type="button"
          class="min-h-11 border border-charcoal-950/25 px-4 text-sm font-semibold disabled:opacity-50"
          :disabled="busy || disabled || !code.trim()"
          @click="emit('apply')"
        >{{ busy ? 'Checking…' : 'Apply' }}</button>
      </span>
    <p v-if="message" role="alert" class="text-sm text-rose-900 dark:text-rose-300">{{ message }}</p>
    <p v-else-if="applied" role="status" class="text-sm text-charcoal-700">Code {{ applied }} applied.</p>
  </div>
</template>
