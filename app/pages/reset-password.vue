<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const isAccountSetup = computed(() => route.query.setup === '1')

useSeoMeta({
  title: isAccountSetup.value ? 'Finish account setup | SAAJ' : 'Set new password | SAAJ',
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

const signInLink = computed(() => ({
  path: '/login',
  query: isAccountSetup.value ? { setup: 'success', email: form.email } : { reset: 'success' },
}))
let redirectTimer: ReturnType<typeof setTimeout> | undefined

onUnmounted(() => clearTimeout(redirectTimer))

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/reset-password', { method: 'POST', body: form })
    success.value = true
    redirectTimer = setTimeout(() => router.push(signInLink.value), 1800)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'This reset link is invalid or has expired.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontCredentialsFrame
    :title="success ? (isAccountSetup ? 'Account ready' : 'Password updated') : (isAccountSetup ? 'Finish your account' : 'Set a new password')"
    :description="success ? 'We’ll take you back to sign in.' : (isAccountSetup ? 'Choose a password for the SAAJ account created with your order.' : 'Choose a new password for your SAAJ account.')"
  >
    <p v-if="success" class="credentials-message credentials-success" role="status">
      {{ isAccountSetup ? 'Account setup complete.' : 'Your new password is ready.' }}
      <NuxtLink :to="signInLink" class="credentials-link">Continue to sign in</NuxtLink>
    </p>

    <form v-else class="credentials-form" @submit.prevent="submit">
      <div>
        <label for="new-password" class="credentials-label">New password</label>
        <div class="credentials-field">
          <input id="new-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder=" " :data-complete="validPassword" aria-describedby="new-password-help" required class="credentials-input credentials-password">
          <button type="button" class="credentials-toggle" aria-controls="new-password new-password-confirm" :aria-label="showPassword ? 'Hide passwords' : 'Show passwords'" @click="showPassword = !showPassword">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <p id="new-password-help" class="credentials-help mt-2" :class="{ 'credentials-success': validPassword }">Use at least 8 characters, including a letter and a number.</p>
      </div>
      <div>
        <label for="new-password-confirm" class="credentials-label">Confirm password</label>
        <div class="credentials-field">
          <input id="new-password-confirm" v-model="form.password_confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder=" " :data-complete="passwordsMatch" required class="credentials-input">
        </div>
      </div>
      <p v-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="submitting || !passwordsMatch" class="credentials-submit">
        {{ submitting ? 'Saving…' : isAccountSetup ? 'Finish account' : 'Set new password' }}
      </button>
    </form>
  </StorefrontCredentialsFrame>
</template>
