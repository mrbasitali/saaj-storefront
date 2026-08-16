type Customer = {
  id: number
  name: string
  email: string | null
  phone: string | null
  secondary_phone: string | null
  gender: string | null
  date_of_birth: string | null
  address: string | null
  city: string | null
  country: string | null
  email_verified: boolean
  phone_verified: boolean
  is_active?: boolean
}

type AuthResponse = {
  message: string
  token: string
  customer: Customer
}

export const useAuthStore = defineStore('auth', () => {
  const customer = ref<Customer | null>(null)
  const hydrated = ref(false)

  const isLoggedIn = computed(() => customer.value !== null)

  function tokenCookie() {
    return useCookie<string | null>('saaj_customer_token')
  }

  function acceptAuthResponse(response: AuthResponse) {
    tokenCookie().value = response.token
    customer.value = response.customer
    hydrated.value = true

    return response.customer
  }

  async function fetchMe() {
    const { $api } = useNuxtApp()

    try {
      const response = await $api<{ customer: Customer }>('/customer/me')
      customer.value = response.customer
      hydrated.value = true
      return true
    } catch {
      tokenCookie().value = null
      customer.value = null
      hydrated.value = true
      return false
    }
  }

  async function login(payload: { email: string, password: string }) {
    const { $api } = useNuxtApp()
    const response = await $api<AuthResponse>('/customer/login', {
      method: 'POST',
      body: payload,
    })

    return acceptAuthResponse(response)
  }

  async function requestLoginOtp(phone: string) {
    const { $api } = useNuxtApp()

    return await $api<{ message: string }>('/customer/otp/request', {
      method: 'POST',
      body: { phone },
    })
  }

  async function loginWithOtp(payload: { phone: string, code: string }) {
    const { $api } = useNuxtApp()
    const response = await $api<AuthResponse>('/customer/otp/login', {
      method: 'POST',
      body: payload,
    })

    return acceptAuthResponse(response)
  }

  async function register(payload: {
    name: string
    email: string
    phone?: string
    password: string
    password_confirmation: string
  }) {
    const { $api } = useNuxtApp()
    const response = await $api<AuthResponse>('/customer/register', {
      method: 'POST',
      body: payload,
    })

    return acceptAuthResponse(response)
  }

  async function resendEmailVerification() {
    const { $api } = useNuxtApp()
    return await $api<{ message: string }>('/customer/email/resend', { method: 'POST' })
  }

  async function sendPhoneVerification() {
    const { $api } = useNuxtApp()
    return await $api<{ message: string }>('/customer/phone/verify/send', { method: 'POST' })
  }

  async function confirmPhoneVerification(code: string) {
    const { $api } = useNuxtApp()
    const response = await $api<{ message: string }>('/customer/phone/verify/confirm', {
      method: 'POST',
      body: { code },
    })

    await fetchMe()
    return response
  }

  async function logout() {
    const { $api } = useNuxtApp()

    try {
      await $api('/customer/logout', { method: 'POST' })
    } catch {
      // Local state still needs to clear even if the access token was
      // already expired or the network request failed.
    }

    tokenCookie().value = null
    customer.value = null
    hydrated.value = true
  }

  async function logoutAll() {
    const { $api } = useNuxtApp()

    try {
      await $api('/customer/logout-all', { method: 'POST' })
    } finally {
      tokenCookie().value = null
      customer.value = null
      hydrated.value = true
    }
  }

  async function updateProfile(payload: Record<string, unknown>) {
    const { $api } = useNuxtApp()
    const response = await $api<{ message: string, customer: Customer }>('/customer/profile', {
      method: 'PUT',
      body: payload,
    })

    customer.value = response.customer
    return response.customer
  }

  return {
    customer,
    hydrated,
    isLoggedIn,
    fetchMe,
    login,
    requestLoginOtp,
    loginWithOtp,
    register,
    resendEmailVerification,
    sendPhoneVerification,
    confirmPhoneVerification,
    logout,
    logoutAll,
    updateProfile,
  }
})
