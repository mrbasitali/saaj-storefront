<script setup lang="ts">
import { isCompletePhoneNumber } from '~/utils/isCompletePhoneNumber'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

useSeoMeta({
  title: 'Create account | SAAJ',
  robots: 'noindex,nofollow',
})

const form = reactive({
  name: '',
  email: typeof route.query.email === 'string' ? route.query.email : '',
  phone: typeof route.query.phone === 'string' ? route.query.phone : '',
  password: '',
  password_confirmation: '',
})
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const accountExists = ref(false)

const passwordChecks = computed(() => ({
  length: form.password.length >= 8,
  letter: /[A-Za-z]/.test(form.password),
  number: /\d/.test(form.password),
  match: !!form.password_confirmation && form.password === form.password_confirmation,
}))

const passwordComplete = computed(() => passwordChecks.value.length && passwordChecks.value.letter && passwordChecks.value.number)

const redirectTo = computed(() => {
  const value = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account'
})

async function submit() {
  submitting.value = true
  error.value = ''
  accountExists.value = false

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    await router.push(`/verify-account?new=1&redirect=${encodeURIComponent(redirectTo.value)}`)
  } catch (err: any) {
    accountExists.value = err?.data?.account_exists === true
    error.value = extractApiErrorMessage(err, 'Could not create your account. Please check your details.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontCredentialsFrame
    title="Create an account"
    description="Enter your details to get started."
  >
    <form class="credentials-form" @submit.prevent="submit">
      <div>
        <label for="sign-up-name" class="credentials-label">Full name</label>
        <div class="credentials-field">
          <input id="sign-up-name" v-model.trim="form.name" type="text" autocomplete="name" placeholder=" " required :data-complete="form.name.length <= 150" class="credentials-input">
        </div>
      </div>

      <div>
        <label for="sign-up-email" class="credentials-label">Email address</label>
        <div class="credentials-field">
          <input id="sign-up-email" v-model.trim="form.email" type="email" autocomplete="email" placeholder=" " :data-complete="form.email.length <= 190" autocapitalize="none" required class="credentials-input">
        </div>
      </div>

      <div>
        <label for="sign-up-phone" class="credentials-label">
          Mobile number <span class="credentials-help font-normal">(optional)</span>
        </label>
        <div class="credentials-field">
          <input id="sign-up-phone" v-model.trim="form.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX" :data-complete="isCompletePhoneNumber(form.phone)" class="credentials-input">
        </div>
      </div>

      <div>
        <label for="sign-up-password" class="credentials-label">Password</label>
        <div class="credentials-field">
          <input
            id="sign-up-password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder=" "
            :data-complete="passwordComplete"
            aria-describedby="sign-up-password-rules"
            required
            class="credentials-input credentials-password"
          >
          <button
            type="button"
            class="credentials-toggle"
            aria-controls="sign-up-password sign-up-confirm"
            :aria-label="showPassword ? 'Hide passwords' : 'Show passwords'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <ul id="sign-up-password-rules" class="credentials-help mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
          <li :class="{ 'credentials-success': passwordChecks.length }">
            <span aria-hidden="true">{{ passwordChecks.length ? '✓' : '○' }}</span>
            8+ characters<span class="sr-only">{{ passwordChecks.length ? ', met' : ', required' }}</span>
          </li>
          <li :class="{ 'credentials-success': passwordChecks.letter }">
            <span aria-hidden="true">{{ passwordChecks.letter ? '✓' : '○' }}</span>
            A letter<span class="sr-only">{{ passwordChecks.letter ? ', met' : ', required' }}</span>
          </li>
          <li :class="{ 'credentials-success': passwordChecks.number }">
            <span aria-hidden="true">{{ passwordChecks.number ? '✓' : '○' }}</span>
            A number<span class="sr-only">{{ passwordChecks.number ? ', met' : ', required' }}</span>
          </li>
        </ul>
      </div>

      <div>
        <label for="sign-up-confirm" class="credentials-label">Confirm password</label>
        <div class="credentials-field">
          <input
            id="sign-up-confirm"
            v-model="form.password_confirmation"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder=" "
            :data-complete="passwordComplete && passwordChecks.match"
            aria-describedby="sign-up-password-match"
            :aria-invalid="!!form.password_confirmation && !passwordChecks.match"
            required
            class="credentials-input"
          >
        </div>
        <p id="sign-up-password-match" class="credentials-help" role="status">
          <span v-if="form.password_confirmation" class="mt-2 block" :class="passwordChecks.match ? 'credentials-success' : 'credentials-error'">
            {{ passwordChecks.match ? 'Passwords match' : 'Passwords don’t match' }}
          </span>
        </p>
      </div>

      <div v-if="accountExists" class="credentials-message credentials-message-error">
        <p class="font-semibold" role="alert">You may already have a SAAJ account.</p>
        <p class="mt-1">{{ error }}</p>
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <NuxtLink :to="`/login?email=${encodeURIComponent(form.email)}${route.query.redirect ? `&redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`" class="credentials-link">Sign in</NuxtLink>
          <NuxtLink :to="`/forgot-password?email=${encodeURIComponent(form.email)}`" class="credentials-link">Reset password</NuxtLink>
        </div>
      </div>
      <p v-else-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="submitting || !passwordChecks.match" class="credentials-submit">
        {{ submitting ? 'Creating account…' : 'Create account' }}
      </button>
      <p class="credentials-help">We’ll send you a link to verify your email after signup.</p>
    </form>

    <div class="credentials-footer">
      <span>Already have an account?</span>
      <NuxtLink
        :to="`/login${route.query.redirect ? `?redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`"
        class="credentials-link"
      >
        Sign in
      </NuxtLink>
    </div>
  </StorefrontCredentialsFrame>
</template>
