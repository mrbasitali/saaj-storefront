<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()

useSeoMeta({
  title: 'Email verification | SAAJ',
  robots: 'noindex,nofollow',
})

const status = computed(() => typeof route.query.status === 'string' ? route.query.status : 'invalid')
const state = computed(() => {
  if (status.value === 'success') return {
    eyebrow: 'Email verified',
    title: 'Your email is confirmed.',
    copy: 'This address is now verified on your SAAJ account.',
    tone: 'success',
  }
  if (status.value === 'already') return {
    eyebrow: 'Already verified',
    title: 'Nothing else to do.',
    copy: 'This email address was already confirmed on your SAAJ account.',
    tone: 'success',
  }
  return {
    eyebrow: 'Verification link',
    title: 'This link can’t be used.',
    copy: 'The verification link may be invalid or expired. Sign in and request a fresh email from your account.',
    tone: 'error',
  }
})

onMounted(async () => {
  const token = useCookie<string | null>('saaj_customer_token')
  if (token.value) await authStore.fetchMe()
})
</script>

<template>
  <StorefrontAuthFrame
    :eyebrow="state.eyebrow"
    :title="state.title"
    :description="state.copy"
    aside-title="Account details, confirmed."
    aside-copy="Verification helps keep recovery links and account changes tied to the right person."
  >
    <div class="p-5" :class="state.tone === 'success' ? 'border border-[#657d6c]/30 bg-[#657d6c]/[0.08]' : 'border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07]'">
      <p class="text-[12px] leading-5" :class="state.tone === 'success' ? 'text-[#52685a]' : 'text-[#9a4f4f]'">
        {{ state.tone === 'success' ? '✓ Verification complete.' : 'The link did not verify your email.' }}
      </p>
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <NuxtLink v-if="authStore.isLoggedIn" to="/verify-account" class="flex-1 bg-charcoal-950 px-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50">Account verification →</NuxtLink>
      <NuxtLink v-else to="/login" class="flex-1 bg-charcoal-950 px-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50">Sign in →</NuxtLink>
      <NuxtLink to="/shop" class="flex flex-1 items-center justify-center border border-charcoal-950/18 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Continue shopping</NuxtLink>
    </div>
  </StorefrontAuthFrame>
</template>
