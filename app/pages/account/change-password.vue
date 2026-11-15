<script setup lang="ts">
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const route = useRoute()

useSeoMeta({
  title: 'Change password | My Account | SAAJ',
  robots: 'noindex,nofollow',
})

const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const showCurrent = ref(false)
const showNew = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const isNewPassword = computed(() => form.password !== form.current_password)
const validPassword = computed(() => form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password))
const passwordsMatch = computed(() => validPassword.value && form.password === form.password_confirmation)

async function submit() {
  if (saving.value || !form.current_password || !isNewPassword.value || !passwordsMatch.value) return
  saving.value = true
  error.value = ''

  try {
    const response = await $api<{ message: string }>('/customer/password', { method: 'PUT', body: { ...form } })
    form.current_password = ''
    form.password = ''
    form.password_confirmation = ''
    success.value = response.message
  } catch (err: unknown) {
    if (!authStore.isLoggedIn) {
      await navigateTo({ path: '/login', query: { redirect: route.fullPath } }, { replace: true })
      return
    }
    error.value = extractApiErrorMessage(err, 'Could not change your password. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="max-w-xl">
    <NuxtLink to="/account/profile" class="mb-3 hidden min-h-11 items-center gap-1 text-sm font-semibold text-charcoal-700 lg:inline-flex">
      <StorefrontIcon name="chevron" :size="16" class="rotate-90" />
      Profile
    </NuxtLink>
    <h2 class="font-display text-[38px] font-medium leading-none tracking-[-0.04em] sm:text-[44px]">Change password</h2>

    <div v-if="success" class="mt-5 space-y-5">
      <p role="status" class="bg-charcoal-950/[0.045] px-4 py-3 text-sm leading-6">{{ success }}</p>
      <NuxtLink to="/account/profile" class="inline-flex min-h-11 items-center bg-charcoal-950 px-5 text-sm font-semibold text-paper-50">Back to profile</NuxtLink>
    </div>

    <form v-else class="storefront-field-theme mt-6 space-y-5" @submit.prevent="submit">
      <div>
        <label for="account-current-password" class="credentials-label">Current password</label>
        <div class="credentials-field">
          <input id="account-current-password" v-model="form.current_password" :type="showCurrent ? 'text' : 'password'" autocomplete="current-password" placeholder=" " required class="credentials-input credentials-password">
          <button type="button" class="credentials-toggle" aria-controls="account-current-password" :aria-label="showCurrent ? 'Hide current password' : 'Show current password'" @click="showCurrent = !showCurrent">
            {{ showCurrent ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>

      <div>
        <label for="account-new-password" class="credentials-label">New password</label>
        <div class="credentials-field">
          <input id="account-new-password" v-model="form.password" :type="showNew ? 'text' : 'password'" autocomplete="new-password" placeholder=" " :data-complete="validPassword && isNewPassword" aria-describedby="account-password-help" required class="credentials-input credentials-password">
          <button type="button" class="credentials-toggle" aria-controls="account-new-password account-confirm-password" :aria-label="showNew ? 'Hide new passwords' : 'Show new passwords'" @click="showNew = !showNew">
            {{ showNew ? 'Hide' : 'Show' }}
          </button>
        </div>
        <p id="account-password-help" class="mt-2 text-sm leading-5 text-charcoal-700">
          {{ form.password && !isNewPassword ? 'Choose a password different from your current one.' : 'Use at least 8 characters, including a letter and a number.' }}
        </p>
      </div>

      <div>
        <label for="account-confirm-password" class="credentials-label">Confirm new password</label>
        <div class="credentials-field">
          <input id="account-confirm-password" v-model="form.password_confirmation" :type="showNew ? 'text' : 'password'" autocomplete="new-password" placeholder=" " :data-complete="passwordsMatch" required class="credentials-input">
        </div>
      </div>

      <p v-if="error" role="alert" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.08] px-4 py-3 text-sm leading-5 text-[#8c4949] dark:text-rose-200">{{ error }}</p>

      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="submit" :disabled="saving || !form.current_password || !isNewPassword || !passwordsMatch" class="min-h-11 bg-charcoal-950 px-5 py-2 text-sm font-semibold text-paper-50 disabled:opacity-45">
          {{ saving ? 'Saving…' : 'Save new password' }}
        </button>
        <NuxtLink to="/forgot-password" class="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Forgot your current password?</NuxtLink>
      </div>
    </form>
  </section>
</template>
