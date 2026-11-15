<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

useSeoMeta({
  title: 'Profile | My Account | SAAJ',
  robots: 'noindex,nofollow',
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  secondary_phone: '',
})

const submitting = ref(false)
const error = ref('')
const success = ref('')
const loggingOutAll = ref(false)
const logoutAllError = ref('')
const logoutAllDialog = useTemplateRef('logoutAllDialog')

function syncForm() {
  const customer = authStore.customer
  if (!customer) return

  form.name = customer.name ?? ''
  form.email = customer.email ?? ''
  form.phone = customer.phone ?? ''
  form.secondary_phone = customer.secondary_phone ?? ''
}

watch(() => authStore.customer, syncForm, { immediate: true, deep: true })

const emailChanged = computed(() => form.email !== (authStore.customer?.email ?? ''))
const phoneChanged = computed(() => form.phone !== (authStore.customer?.phone ?? ''))

async function submit() {
  submitting.value = true
  error.value = ''
  success.value = ''

  try {
    await authStore.updateProfile(form)
    success.value = 'Your account details have been updated.'
    syncForm()
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not update your profile.')
  } finally {
    submitting.value = false
  }
}

function requestSignOutEverywhere() {
  logoutAllError.value = ''
  logoutAllDialog.value?.show()
}

async function logoutEverywhere() {
  if (loggingOutAll.value) return
  loggingOutAll.value = true
  logoutAllError.value = ''
  try {
    await authStore.logoutAll()
    logoutAllDialog.value?.close()
    await router.push('/login')
  } catch (err: unknown) {
    logoutAllError.value = extractApiErrorMessage(err, 'Could not sign out all devices. Please try again.')
  } finally {
    loggingOutAll.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 border-b border-charcoal-950/10 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div>
        <h2 class="font-display text-[38px] font-medium leading-none tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Profile</h2>
        <p class="mt-2 text-sm leading-6 text-charcoal-700">Update your contact details.</p>
      </div>
      <NuxtLink to="/verify-account" class="inline-flex min-h-11 items-center justify-center self-start border border-charcoal-950/20 px-4 text-sm font-semibold hover:bg-charcoal-950/[0.045] sm:self-auto">Manage verification</NuxtLink>
    </div>

    <div class="mt-5 grid gap-8 sm:mt-8 xl:grid-cols-[1.15fr_.85fr] xl:gap-16">
      <form class="storefront-field-theme min-w-0 space-y-5" @submit.prevent="submit">
        <div>
          <label for="profile-name" class="credentials-label">Full name</label>
          <div class="credentials-field">
            <input id="profile-name" v-model.trim="form.name" class="credentials-input" type="text" autocomplete="name" placeholder="Your name" required>
          </div>
        </div>

        <div>
          <div class="flex items-baseline justify-between gap-2">
            <label for="profile-email" class="credentials-label">Email</label>
            <StorefrontVerificationStatus v-if="authStore.customer?.email && !emailChanged" :status="authStore.customer.email_verified ? 'verified' : 'pending'" />
          </div>
          <div class="credentials-field">
            <input id="profile-email" v-model.trim="form.email" class="credentials-input" type="email" autocomplete="email" placeholder="you@example.com">
          </div>
          <p v-if="emailChanged" class="mt-2 text-sm leading-5 text-charcoal-700">Changing your email resets email verification and sends a new verification link.</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <div class="flex items-baseline justify-between gap-2">
              <label for="profile-mobile" class="credentials-label">Mobile</label>
              <StorefrontVerificationStatus v-if="authStore.customer?.phone && !phoneChanged" :status="authStore.customer.phone_verified ? 'verified' : 'pending'" />
            </div>
            <div class="credentials-field">
              <input id="profile-mobile" v-model.trim="form.phone" class="credentials-input" :data-complete="isCompletePhoneNumber(form.phone)" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX">
            </div>
            <p v-if="phoneChanged" class="mt-2 text-sm leading-5 text-charcoal-700">Changing your mobile resets phone verification. No SMS is sent until you request verification.</p>
          </div>
          <div>
            <label for="profile-secondary-phone" class="credentials-label">Secondary phone <em>optional</em></label>
            <div class="credentials-field">
              <input id="profile-secondary-phone" v-model.trim="form.secondary_phone" class="credentials-input" :data-complete="isCompletePhoneNumber(form.secondary_phone)" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX">
            </div>
          </div>
        </div>

        <div v-if="error" role="alert" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-sm leading-5 text-[#8c4949] dark:text-rose-200">{{ error }}</div>
        <div v-if="success" role="status" class="border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-sm leading-5 text-[#355845] dark:text-[#b7d7c5]">{{ success }}</div>

        <button type="submit" :disabled="submitting" class="min-h-11 bg-charcoal-950 px-7 py-3 text-sm font-semibold text-paper-50 transition hover:opacity-90 disabled:opacity-45">
          {{ submitting ? 'Saving…' : 'Save changes' }}
        </button>
      </form>

      <aside class="xl:border-l xl:border-charcoal-950/10 xl:pl-10">
        <section class="border-y border-charcoal-950/10 py-5 xl:border-t-0 xl:pt-0">
          <h3 class="text-sm font-semibold">Password</h3>
          <p class="mt-2 text-sm leading-6 text-charcoal-700">Use your verified email or mobile to change your password.</p>
          <NuxtLink to="/forgot-password" class="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Change password</NuxtLink>
        </section>

        <section class="pt-5">
          <h3 class="text-sm font-semibold">Signed-in devices</h3>
          <p class="mt-2 text-sm leading-6 text-charcoal-700">If you think someone else may have access to your account, sign out on every device.</p>
          <button
            type="button"
            :disabled="loggingOutAll"
            class="mt-1 min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-45"
            @click="requestSignOutEverywhere"
          >
            Sign out all devices
          </button>
        </section>
      </aside>
    </div>

    <StorefrontConfirmDialog
      ref="logoutAllDialog"
      title="Sign out on all devices?"
      confirm-label="Sign out"
      busy-label="Signing out…"
      :busy="loggingOutAll"
      @confirm="logoutEverywhere"
    >
      <p>This ends all active SAAJ sessions, including this one.</p>
      <p v-if="logoutAllError" role="alert" class="mt-2 text-[#8c4949] dark:text-rose-200">{{ logoutAllError }}</p>
    </StorefrontConfirmDialog>
  </div>
</template>
