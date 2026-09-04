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
const logoutAllArmed = ref(false)
const loggingOutAll = ref(false)

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

async function logoutEverywhere() {
  if (!logoutAllArmed.value) {
    logoutAllArmed.value = true
    window.setTimeout(() => { logoutAllArmed.value = false }, 6000)
    return
  }

  loggingOutAll.value = true
  await authStore.logoutAll()
  await router.push('/login')
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Account details</p>
        <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Profile</h2>
        <p class="mt-2 text-[11px] text-charcoal-500">Manage how we identify and contact you.</p>
      </div>
      <NuxtLink to="/verify-account" class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline decoration-charcoal-950/20 underline-offset-4">Manage verification</NuxtLink>
    </div>

    <div class="mt-7 grid gap-px bg-charcoal-950/10 sm:grid-cols-2">
      <div class="bg-paper-50 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-400">Email</p>
          <span class="border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em]" :class="authStore.customer?.email_verified ? 'border-[#657d6c]/25 bg-[#657d6c]/[0.08] text-[#52685a]' : 'border-[#b78b57]/25 bg-[#b78b57]/[0.08] text-[#89683f]'">
            {{ authStore.customer?.email_verified ? 'Verified' : 'Pending' }}
          </span>
        </div>
        <p class="mt-3 break-all text-[12px] text-charcoal-950">{{ authStore.customer?.email || 'Not added' }}</p>
      </div>
      <div class="bg-paper-50 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-400">Mobile</p>
          <span v-if="authStore.customer?.phone" class="border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em]" :class="authStore.customer?.phone_verified ? 'border-[#657d6c]/25 bg-[#657d6c]/[0.08] text-[#52685a]' : 'border-[#b78b57]/25 bg-[#b78b57]/[0.08] text-[#89683f]'">
            {{ authStore.customer?.phone_verified ? 'Verified' : 'Pending' }}
          </span>
        </div>
        <p class="mt-3 text-[12px] text-charcoal-950">{{ authStore.customer?.phone || 'Not added' }}</p>
      </div>
    </div>

    <div class="mt-10 grid gap-12 xl:grid-cols-[1.15fr_.85fr] xl:gap-16">
      <form class="space-y-5" @submit.prevent="submit">
        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Full name</label>
          <input v-model.trim="form.name" type="text" autocomplete="name" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>

        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Email</label>
          <input v-model.trim="form.email" type="email" autocomplete="email" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
          <p v-if="emailChanged" class="mt-2 text-[10px] leading-5 text-[#89683f]">Changing your email resets email verification and sends a new verification link.</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Mobile</label>
            <input v-model.trim="form.phone" type="tel" inputmode="tel" autocomplete="tel" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
            <p v-if="phoneChanged" class="mt-2 text-[10px] leading-5 text-[#89683f]">Changing your mobile resets phone verification. No SMS is sent until you request verification.</p>
          </div>
          <div>
            <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Secondary phone <span class="font-normal normal-case tracking-normal text-charcoal-300">optional</span></label>
            <input v-model.trim="form.secondary_phone" type="tel" inputmode="tel" autocomplete="tel" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
          </div>
        </div>

        <div v-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[11px] leading-5 text-[#9a4f4f]">{{ error }}</div>
        <div v-if="success" class="border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[11px] leading-5 text-[#52685a]">{{ success }}</div>

        <button type="submit" :disabled="submitting" class="bg-charcoal-950 px-7 py-3.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-paper-50 transition hover:opacity-90 disabled:opacity-45">
          {{ submitting ? 'Saving…' : 'Save changes' }}
        </button>
      </form>

      <aside class="xl:border-l xl:border-charcoal-950/10 xl:pl-10">
        <section class="border-b border-charcoal-950/10 pb-7">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Verification</p>
          <h3 class="mt-2 font-display text-[27px] tracking-[-0.03em] text-charcoal-950">Protect your account.</h3>
          <p class="mt-3 text-[11px] leading-5 text-charcoal-500">Verified contact methods unlock secure password recovery and phone-code sign in.</p>
          <NuxtLink to="/verify-account" class="mt-5 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Manage verification →</NuxtLink>
        </section>

        <section class="border-b border-charcoal-950/10 py-7">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Password</p>
          <p class="mt-3 text-[11px] leading-5 text-charcoal-500">Need to change your password? Use the secure recovery flow connected to your email or verified mobile.</p>
          <NuxtLink to="/forgot-password" class="mt-5 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Change password →</NuxtLink>
        </section>

        <section class="py-7">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Signed-in devices</p>
          <p class="mt-3 text-[11px] leading-5 text-charcoal-500">If you think someone else may have access to your account, sign out every active customer session at once.</p>
          <button
            type="button"
            :disabled="loggingOutAll"
            class="mt-5 text-[9px] font-semibold uppercase tracking-[0.13em] underline underline-offset-4 disabled:opacity-45"
            :class="logoutAllArmed ? 'text-[#9a4f4f] decoration-[#bd6f6f]/35' : 'text-charcoal-950 decoration-charcoal-950/20'"
            @click="logoutEverywhere"
          >
            {{ loggingOutAll ? 'Signing out…' : logoutAllArmed ? 'Click again to confirm' : 'Sign out all devices' }}
          </button>
        </section>
      </aside>
    </div>
  </div>
</template>
