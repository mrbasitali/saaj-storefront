<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

useSeoMeta({
  title: 'Set new password | SAAJ',
  robots: 'noindex,nofollow',
})

const form = reactive({
  token: typeof route.query.token === 'string' ? route.query.token : '',
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
  password_confirmation: '',
})
const submitting = ref(false)
const error = ref('')
const success = ref(false)
const showPassword = ref(false)
const validPassword = computed(() => form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password))
const passwordsMatch = computed(() => validPassword.value && form.password === form.password_confirmation)

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/reset-password', { method: 'POST', body: form })
    success.value = true
    setTimeout(() => router.push('/login?reset=success'), 1800)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'This reset link is invalid or has expired.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontAuthFrame
    eyebrow="Account recovery"
    :title="success ? 'Password updated.' : 'Set a new password.'"
    :description="success ? 'Your new password is ready. We’ll return you to sign in.' : 'Choose a new password for your SAAJ account.'"
  >
    <div v-if="success" class="border border-[#657d6c]/30 bg-[#657d6c]/[0.08] p-5 text-[12px] leading-5 text-[#52685a]">
      ✓ Password updated successfully. Redirecting to sign in…
    </div>

    <form v-else class="space-y-5" @submit.prevent="submit">
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">New password</label>
        <div class="relative">
          <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 pr-16 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
          <button type="button" class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-charcoal-500" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </div>
        <p class="mt-2 text-[10px]" :class="validPassword ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ validPassword ? '✓' : '○' }} At least 8 characters with a letter and number</p>
      </div>
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Confirm password</label>
        <input v-model="form.password_confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
      </div>
      <div v-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">{{ error }}</div>
      <button type="submit" :disabled="submitting || !passwordsMatch" class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 disabled:opacity-45">
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Saving…' : 'Set new password' }}
      </button>
    </form>
  </StorefrontAuthFrame>
</template>
